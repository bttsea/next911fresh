// 导入颜色高亮库，用于终端输出 
import chalk from 'chalk'
// 导入文件系统模块
import fs from 'fs'
// 导入文本表格生成库
import textTable from 'next/dist/compiled/text-table'
// 导入路径处理模块
import path from 'path'
// 导入 ANSI 字符剥离库，用于计算字符串长度
import stripAnsi from 'strip-ansi'
// 导入 util 的 promisify 方法，用于将回调函数转换为 Promise
import { promisify } from 'util'

// 导入 React 类型检查工具
import { isValidElementType } from 'react-is'
// 导入文件大小格式化工具
import prettyBytes from '../lib/pretty-bytes'
// 导入递归读取目录的工具
import { recursiveReadDir } from '../lib/recursive-readdir'
// 导入获取页面块的工具
import { getPageChunks } from './webpack/plugins/chunk-graph-plugin'
// 导入动态路由检查工具
import { isDynamicRoute } from '../next-server/lib/router/utils/is-dynamic'
// 导入路由匹配和正则生成工具
import { getRouteMatcher, getRouteRegex } from '../next-server/lib/router/utils'
// 导入常量
import { SPR_GET_INITIAL_PROPS_CONFLICT } from '../lib/constants'

// 将 fs.stat 方法转换为 Promise 版本
const fsStatPromise = promisify(fs.stat)
// 缓存文件状态
const fileStats = {}

/**
 * 获取文件状态，缓存结果以提高性能
 * @param {string} file 文件路径
 * @returns {Promise<Object>} 文件状态的 Promise
 */
const fsStat = (file) => {
  if (fileStats[file]) return fileStats[file]

  fileStats[file] = fsStatPromise(file)
  return fileStats[file]
}

/**
 * 收集页面文件
 * @param {string} directory 页面目录路径
 * @param {string[]} pageExtensions 页面文件扩展名数组
 * @returns {Promise<string[]>} 页面文件路径数组
 */
export function collectPages(directory, pageExtensions) {
  return recursiveReadDir(
    directory,
    new RegExp(`\\.(?:${pageExtensions.join('|')})$`)
  )
}

/**
 * 打印页面树视图
 * @param {string[]} list 页面路径列表
 * @param {Map<string, Object>} pageInfos 页面信息映射
 * @param {boolean} serverless 是否为无服务器模式
 */
export function printTreeView(list, pageInfos, serverless) {
  // 格式化文件大小并添加颜色
  const getPrettySize = (_size) => {
    const size = prettyBytes(_size)
    // 绿色：0-100kb
    if (_size < 100 * 1000) return chalk.green(size)
    // 黄色：100-250kb
    if (_size < 250 * 1000) return chalk.yellow(size)
    // 红色：>= 250kb
    return chalk.red.bold(size)
  }

  // 构建表格数据
  const messages = [
    ['Page', 'Size', 'Files', 'Packages'].map(entry => chalk.underline(entry)),
  ]

  // 按页面路径排序并生成表格行
  list
    .sort((a, b) => a.localeCompare(b))
    .forEach((item, i) => {
      const symbol =
        i === 0
          ? list.length === 1
            ? '─'
            : '┌'
          : i === list.length - 1
          ? '└'
          : '├'

      const pageInfo = pageInfos.get(item)

      messages.push([
        `${symbol} ${
          item.startsWith('/_')
            ? ' '
            : pageInfo && pageInfo.static
            ? chalk.bold('⚡')
            :  'σ'
        } ${item}`,
        ...(pageInfo
          ? [
               pageInfo.size >= 0
                ? getPrettySize(pageInfo.size)
                : '',
              pageInfo.chunks ? pageInfo.chunks.internal.size.toString() : '',
              pageInfo.chunks ? pageInfo.chunks.external.size.toString() : '',
            ]
          : ['', '', '']),
      ])
    })

  // 打印页面表格
  console.log(
    textTable(messages, {
      align: ['l', 'l', 'r', 'r'],
      stringLength: str => stripAnsi(str).length,
    })
  )

  console.log()
  // 打印模式说明表格
  console.log(
    textTable(
      [
        [
              'σ',
              '(Server)',
              `页面将进行服务器端渲染（即使用了 ${chalk.cyan('getInitialProps')})`,
            ],
        [
          chalk.bold('⚡'),
          '(Static File)',
          '页面已预渲染为静态 HTML',
        ],
      ],
      {
        align: ['l', 'l', 'l'],
        stringLength: str => stripAnsi(str).length,
      }
    )
  )

  console.log()
}

/*
 
 

Page             Size     Files  Packages
┌ σ /            14.4 kB      2         5
├   /_app        429 kB       0         5
├   /_document
├   /_error      6.9 kB       0         5
├ σ /api/posts
├ σ /old_index   14.1 kB      2         5
└ σ /posts/[id]  7.14 kB      2         5

σ  (Server)       页面将进行服务器端渲染（即使用了 getInitialProps)
⚡  (Static File)  页面已预渲染为静态 HTML
/**** */














/**
 * 获取页面文件大小（单位：KB）
 * @param {string} page 页面路径
 * @param {string} distPath 输出目录路径
 * @param {string} buildId 构建 ID
 * @param {Object} buildManifest 构建清单
 * @param {boolean} isModern 是否使用现代模块（ES Modules）
 * @returns {Promise<number>} 页面大小（字节），失败时返回 -1
 */
export async function getPageSizeInKb(page, distPath, buildId, buildManifest, isModern) {
  const clientBundle = path.join(
    distPath,
    `static/${buildId}/pages/`,
    `${page}${isModern ? '.module' : ''}.js`
  )

  // _app 页面不包含基本依赖
  const baseDeps = page === '/_app' ? [] : buildManifest.pages['/_app']

  // 获取页面特定的依赖文件
  const deps = (buildManifest.pages[page] || [])
    .filter(
      dep => !baseDeps.includes(dep) && /\.module\.js$/.test(dep) === isModern
    )
    .map(dep => `${distPath}/${dep}`)

  // 添加页面主 bundle
  deps.push(clientBundle)

  try {
    // 获取所有依赖文件的状态
    let depStats = await Promise.all(deps.map(fsStat))

    // 计算总大小（字节）
    return depStats.reduce((size, stat) => size + stat.size, 0)
  } catch (_) {
    return -1
  }
}

/**
 * 检查页面是否为静态页面
 * @param {string} page 页面路径
 * @param {string} serverBundle 服务器端 bundle 路径
 * @param {Object} runtimeEnvConfig 运行时环境配置
 * @returns {Promise<Object>} 页面静态性信息
 */
export async function isPageStatic(page, serverBundle, runtimeEnvConfig) {
  try {
    // 设置运行时配置
    require('../next-server/lib/runtime-config').setConfig(runtimeEnvConfig)
    const mod = require(serverBundle)
    const Comp = mod.default || mod

    // 验证组件是否为有效的 React 组件
    if (!Comp || !isValidElementType(Comp) || typeof Comp === 'string') {
      throw new Error('INVALID_DEFAULT_EXPORT')
    }

    // 检查是否定义了 getInitialProps 或 unstable_getStaticProps/Params
    const hasGetInitialProps = !!(Comp.getInitialProps)
    const hasStaticProps = !!mod.unstable_getStaticProps
    const hasStaticParams = !!mod.unstable_getStaticParams

    // 检查 getInitialProps 和 unstable_getStaticProps 的冲突
    if (hasGetInitialProps && hasStaticProps) {
      throw new Error(SPR_GET_INITIAL_PROPS_CONFLICT)
    }

    // 检查非动态路由是否错误使用了 unstable_getStaticParams
    if (hasStaticProps && hasStaticParams && !isDynamicRoute(page)) {
      throw new Error(
        `unstable_getStaticParams 只能用于动态路由页面。详情见：https://nextjs.org/docs#dynamic-routing`
      )
    }

    let prerenderPaths
    // 处理动态路由的预渲染路径
    if (hasStaticProps && hasStaticParams) {
      prerenderPaths = []

      const _routeRegex = getRouteRegex(page)
      const _routeMatcher = getRouteMatcher(_routeRegex)
      const _validParamKeys = Object.keys(_routeMatcher(page))

      // 获取预渲染参数
      const toPrerender = await mod.unstable_getStaticParams()
      toPrerender.forEach(entry => {
        // 处理字符串路径
        if (typeof entry === 'string') {
          const result = _routeMatcher(entry)
          if (!result) {
            throw new Error(
              `提供的路径 \`${entry}\` 与页面 \`${page}\` 不匹配。`
            )
          }
          prerenderPaths.push(entry)
        }
        // 处理对象路径
        else {
          let builtPage = page
          _validParamKeys.forEach(validParamKey => {
            if (typeof entry[validParamKey] !== 'string') {
              throw new Error(
                `必需参数 (${validParamKey}) 未提供字符串值。`
              )
            }
            builtPage = builtPage.replace(
              `[${validParamKey}]`,
              encodeURIComponent(entry[validParamKey])
            )
          })
          prerenderPaths.push(builtPage)
        }
      })
    }

    const config = mod.config || {}
    return {
      static: !hasStaticProps && !hasGetInitialProps, // 是否为静态页面
      isHybridAmp: config.amp === 'hybrid', // 是否为混合 AMP 页面
      prerenderRoutes: prerenderPaths, // 预渲染路径
      prerender: hasStaticProps, // 是否需要预渲染
    }
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') return {}
    throw err
  }
}

/**
 * 检查 _app 是否自定义了 getInitialProps
 * @param {string} _appBundle _app bundle 路径
 * @param {Object} runtimeEnvConfig 运行时环境配置
 * @returns {boolean} 是否自定义了 getInitialProps
 */
export function hasCustomAppGetInitialProps(_appBundle, runtimeEnvConfig) {
  // 设置运行时配置
  require('../next-server/lib/runtime-config').setConfig(runtimeEnvConfig)
  let mod = require(_appBundle)

  // 根据 bundle 类型获取模块
  if (_appBundle.endsWith('_app.js')) {
    mod = mod.default || mod
  } else {
    // 无服务器模式下从页面获取 _app
    mod = mod._app
  }
  return mod.getInitialProps !== mod.origGetInitialProps
}
/*
代码功能说明
作用：该文件提供了 Next.js 构建过程中的实用工具函数，用于页面收集、打印页面信息、计算页面大小、检查页面静态性和 _app 的自定义逻辑。

主要函数：
fsStat：缓存文件状态，提高性能。
collectPages：递归收集指定目录中的页面文件（匹配扩展名）。
printTreeView：打印页面信息表格，显示页面路径、大小、文件和包数量，以及渲染模式（静态、Lambda 或服务器渲染）。
getPageSizeInKb：计算页面及其依赖的文件大小（字节），支持现代模块（.module.js）。
isPageStatic ：检查页面是否为静态页面，支持 SPR（增量静态生成）和 AMP（混合模式）。
hasCustomAppGetInitialProps：检查 _app 是否自定义了 getInitialProps。

错误处理：
isPageStatic 处理模块未找到（MODULE_NOT_FOUND）和无效默认导出（INVALID_DEFAULT_EXPORT）等错误。

检查 SPR 和 getInitialProps 冲突、动态路由参数的有效性。

/**** */