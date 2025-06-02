// 导入颜色高亮库，用于终端输出  
import chalk from 'chalk'
// 导入文件系统模块
import fs from 'fs'
// 导入 Jest Worker，用于并行处理
import Worker from 'jest-worker'
// 导入 mkdirp，用于递归创建目录
import mkdirpOrig from 'mkdirp'
// 导入 nanoid，用于生成唯一 ID
///===  import nanoid from 'next/dist/compiled/nanoid/index.js'
import nanoid from '../lib/nanoid'
// 导入路径处理模块
import path from 'path'
// 导入 util 的 promisify 方法，用于将回调函数转换为 Promise
import { promisify } from 'util'

// 导入格式化 Webpack 错误信息的工具
import formatWebpackMessages from '../client/dev/error-overlay/format-webpack-messages'
// 导入常量
import { PUBLIC_DIR_MIDDLEWARE_CONFLICT } from '../lib/constants'
// 导入查找页面目录的工具
import { findPagesDir } from '../lib/find-pages-dir'
// 导入递归删除目录的工具
import { recursiveDelete } from '../lib/recursive-delete'
// 导入递归读取目录的工具
import { recursiveReadDir } from '../lib/recursive-readdir'
// 导入 Next.js 服务器相关常量
import {
  BUILD_MANIFEST,
  PAGES_MANIFEST,
  PHASE_PRODUCTION_BUILD,
  PRERENDER_MANIFEST,
  SERVER_DIRECTORY,
  SERVERLESS_DIRECTORY,
} from '../next-server/lib/constants'
// 导入路由相关工具
import { getRouteRegex, isDynamicRoute } from '../next-server/lib/router/utils'
// 导入配置加载和检查工具
import { loadConfig, isTargetLikeServerless } from '../next-server/server/config'
 
 
// 导入编译器相关工具
import { runCompiler } from './compiler'
// 导入入口点和页面映射生成工具
import { createEntrypoints, createPagesMapping } from './entries'
// 导入构建 ID 生成工具
import { generateBuildId } from './generate-build-id'
// 导入检查目录是否可写的工具
import { isWriteable } from './is-writeable'
// 导入创建加载动画的工具
import createSpinner from './spinner'
// 导入页面收集和分析工具
import {
  collectPages,
  getPageSizeInKb,
  hasCustomAppGetInitialProps,
  printTreeView,
} from './utils'
// 导入 Webpack 配置生成工具
import getBaseWebpackConfig from './webpack-config'
// 导入页面块获取工具
import { getPageChunks } from './webpack/plugins/chunk-graph-plugin'
// 导入写入构建 ID 的工具
import { writeBuildId } from './write-build-id'

// 将 fs 的方法转换为 Promise 版本
const fsUnlink = promisify(fs.unlink)
const fsRmdir = promisify(fs.rmdir)
const fsStat = promisify(fs.stat)
const fsMove = promisify(fs.rename)
const fsReadFile = promisify(fs.readFile)
const fsWriteFile = promisify(fs.writeFile)
const mkdirp = promisify(mkdirpOrig)

// 静态检查工作线程的路径
const staticCheckWorker = require.resolve('./utils')

 



/**
 * 主构建函数，负责执行 Next.js 的生产环境构建
 * @param {string} dir 项目根目录
 * @param {Object} [conf] 自定义配置，默认为 null
 * @returns {Promise<void>} 无返回值
 */
export default async function build(dir, conf = null) {
  // 检查构建目录是否可写
  if (!(await isWriteable(dir))) {
    throw new Error(
      '> 构建目录不可写。详情见：https://err.sh/zeit/next.js/build-dir-not-writeable'
    )
  }

  // 创建构建时的加载动画
  const buildSpinner = createSpinner({
    prefixText: '正在创建优化的生产构建',
  })

  // 加载生产环境配置
  const config = loadConfig(PHASE_PRODUCTION_BUILD, dir, conf)
  const { target } = config
  // 生成构建 ID
  const buildId = await generateBuildId(config.generateBuildId, nanoid)
  // 设置输出目录
  const distDir = path.join(dir, config.distDir)
 
  // 公共资源目录
  const publicDir = path.join(dir, 'public')
  // 查找页面目录
  const pagesDir = findPagesDir(dir)
  let publicFiles = []
  let hasPublicDir = false

  // 后台任务列表
  let backgroundWork = []
 

  try {
    // 检查公共资源目录是否存在
    await fsStat(publicDir)
    hasPublicDir = true
  } catch (_) {}

  if (hasPublicDir) {
    // 递归读取公共资源目录中的文件
    publicFiles = await recursiveReadDir(publicDir, /.*/)
  }

  let tracer = null
  // 如果启用了性能分析，创建追踪器
  if (config.experimental.profiling) {
    const { createTrace } = require('./profiler/profiler.js')
    tracer = createTrace(path.join(distDir, `profile-events.json`))
    tracer.profiler.startProfiling()
  }

  // 判断是否为无服务器模式
  const isLikeServerless = false; ///=== isTargetLikeServerless(target)

  // 收集页面路径
  const pagePaths = await collectPages(pagesDir, config.pageExtensions)

  // 用于静态导出的页面集合
  const allStaticPages = new Set()
  let allPageInfos = new Map()

  // 创建页面映射
  const mappedPages = createPagesMapping(pagePaths, config.pageExtensions)
  // 创建入口点
  const entrypoints = createEntrypoints(mappedPages, target, buildId, config)
  const conflictingPublicFiles = []

  // 检查公共资源目录中是否存在与 _next 冲突的文件
  if (hasPublicDir) {
    try {
      await fsStat(path.join(publicDir, '_next'))
      throw new Error(PUBLIC_DIR_MIDDLEWARE_CONFLICT)
    } catch (err) {}
  }

  // 检查公共资源文件与页面文件是否冲突
  for (let file of publicFiles) {
    file = file
      .replace(/\\/g, '/')
      .replace(/\/index$/, '')
      .split(publicDir)
      .pop()

    if (mappedPages[file]) {
      conflictingPublicFiles.push(file)
    }
  }
  const numConflicting = conflictingPublicFiles.length

  if (numConflicting) {
    throw new Error(
      `发现${numConflicting === 1 ? '一个' : '多个'}公共文件与页面文件冲突。详情见：https://err.sh/zeit/next.js/conflicting-public-file-page\n${conflictingPublicFiles.join(
        '\n'
      )}`
    )
  }

  // 获取客户端和服务端 Webpack 配置
  const configs = await Promise.all([
    getBaseWebpackConfig(dir, {
      tracer,
      buildId,
      isServer: false,
      config,
      target,
      pagesDir,
      entrypoints: entrypoints.client,
    }),
    getBaseWebpackConfig(dir, {
      tracer,
      buildId,
      isServer: true,
      config,
      target,
      pagesDir,
      entrypoints: entrypoints.server,
    }),
  ])

  const clientConfig = configs[0]

  // 检查是否禁用了代码优化
  if (
    clientConfig.optimization &&
    (clientConfig.optimization.minimize !== true ||
      (clientConfig.optimization.minimizer &&
        clientConfig.optimization.minimizer.length === 0))
  ) {
    console.warn(
      chalk.bold.yellow(`警告：`) +
        chalk.bold(
          `项目中已禁用生产代码优化。详情见：https://err.sh/zeit/next.js/minification-disabled`
        )
    )
  }

  // 记录 Webpack 构建开始时间
  const webpackBuildStart = process.hrtime()

  let result = { warnings: [], errors: [] }
 
    result = await runCompiler(configs)
 







  // 记录 Webpack 构建结束时间
  const webpackBuildEnd = process.hrtime(webpackBuildStart)
  if (buildSpinner) {
    buildSpinner.stopAndPersist()
  }
  console.log()

  // 格式化 Webpack 错误和警告信息
  result = formatWebpackMessages(result)

  if (result.errors.length > 0) {
    if (result.errors.length > 1) {
      result.errors.length = 1
    }
    const error = result.errors.join('\n\n')

    console.error(chalk.red('编译失败。\n'))

    // 处理特定错误情况
    if (
      error.indexOf('private-next-pages') > -1 &&
      error.indexOf('does not contain a default export') > -1
    ) {
      const page_name_regex = /\'private-next-pages\/(?<page_name>[^\']*)\'/
      const parsed = page_name_regex.exec(error)
      const page_name = parsed && parsed.groups && parsed.groups.page_name
      throw new Error(
        `Webpack 构建失败：发现页面 pages/${page_name} 没有有效的 React 组件作为默认导出\n\n详情见：https://err.sh/zeit/next.js/page-without-valid-component`
      )
    }

    console.error(error)
    console.error()

    if (error.indexOf('private-next-pages') > -1) {
      throw new Error(
        '> Webpack 配置的 resolve.alias 被错误覆盖。详情见：https://err.sh/zeit/next.js/invalid-resolve-alias'
      )
    }
    throw new Error('> 由于 Webpack 错误，构建失败')
  } else if (result.warnings.length > 0) {
    console.warn(chalk.yellow('编译完成，但有警告。\n'))
    console.warn(result.warnings.join('\n\n'))
    console.warn()
  } else {
    console.log(chalk.green('编译成功。\n'))
 
  }

  // 创建页面优化动画
  const postBuildSpinner = createSpinner({
    prefixText: '自动优化页面',
  })

  const pageKeys = Object.keys(mappedPages)
  const manifestPath = path.join(
    distDir,
  SERVER_DIRECTORY,
    PAGES_MANIFEST
  )
  const buildManifestPath = path.join(distDir, BUILD_MANIFEST)

  const sprPages = new Set()
  const staticPages = new Set()
  const invalidPages = new Set()
  const hybridAmpPages = new Set()
  const additionalSprPaths = new Map()
  const pageInfos = new Map()
  const pagesManifest = JSON.parse(await fsReadFile(manifestPath, 'utf8'))
  const buildManifest = JSON.parse(await fsReadFile(buildManifestPath, 'utf8'))

  let customAppGetInitialProps

  // 设置环境变量
  process.env.NEXT_PHASE = PHASE_PRODUCTION_BUILD

  // 创建静态检查工作线程
  const staticCheckWorkers = new Worker(staticCheckWorker, {
    numWorkers: config.experimental.cpus,
    enableWorkerThreads: true,
  })

  // 记录分析开始时间
  const analysisBegin = process.hrtime()
  await Promise.all(
    pageKeys.map(async page => {
      const chunks = getPageChunks(page)

      const actualPage = page === '/' ? '/index' : page
      const size = await getPageSizeInKb(
        actualPage,
        distDir,
        buildId,
        buildManifest,
        config.experimental.modern
      )
      const bundleRelative = path.join(
          `static/${buildId}/pages`,
        actualPage + '.js'
      )
      const serverBundle = path.join(
        distDir,
         SERVER_DIRECTORY,
        bundleRelative
      )

      let isStatic = false

      pagesManifest[page] = bundleRelative.replace(/\\/g, '/')

      const runtimeEnvConfig = {
        publicRuntimeConfig: config.publicRuntimeConfig,
        serverRuntimeConfig: config.serverRuntimeConfig,
      }
      const nonReservedPage = !page.match(/^\/(_app|_error|_document|api)/)

      // 检查是否使用了自定义的 getInitialProps
      if (nonReservedPage && customAppGetInitialProps === undefined) {
        customAppGetInitialProps = hasCustomAppGetInitialProps(
           path.join(
                distDir,
                SERVER_DIRECTORY,
                `/static/${buildId}/pages/_app.js`
              ),
          runtimeEnvConfig
        )

        if (customAppGetInitialProps) {
          console.warn(
            chalk.bold.yellow(`警告：`) +
              chalk.yellow(
                `由于在 pages/_app 中使用了 getInitialProps，已禁用自动静态优化。`
              )
          )
          console.warn(
            '详情见：https://err.sh/next.js/opt-out-auto-static-optimization\n'
          )
        }
      }

      if (nonReservedPage) {
        try {
          let result = await staticCheckWorkers.isPageStatic(
            page,
            serverBundle,
            runtimeEnvConfig
          )

          if (result.isHybridAmp) {
            hybridAmpPages.add(page)
          }

          if (result.prerender) {
            sprPages.add(page)
            if (result.prerenderRoutes) {
              additionalSprPaths.set(page, result.prerenderRoutes)
            }
          }

          if (result.static && customAppGetInitialProps === false) {
            staticPages.add(page)
            isStatic = true
          } else if (result.prerender) {
            sprPages.add(page)
          }
        } catch (err) {
          if (err.message !== 'INVALID_DEFAULT_EXPORT') throw err
          invalidPages.add(page)
        }
      }

      pageInfos.set(page, { size, chunks, serverBundle, static: isStatic })
    })
  )
  staticCheckWorkers.end()

  // 处理无效页面
  if (invalidPages.size > 0) {
    throw new Error(
      `自动静态优化失败：发现${invalidPages.size === 1 ? '一个' : '多个'}页面没有有效的 React 组件作为默认导出：\n${[...invalidPages]
        .map(pg => `pages${pg}`)
        .join(
          '\n'
        )}\n\n详情见：https://err.sh/zeit/next.js/page-without-valid-component\n`
    )
  }

  // 处理 AMP 页面
  if (Array.isArray(configs[0].plugins)) {
    configs[0].plugins.some((plugin) => {
      if (!plugin.ampPages) {
        return false
      }

      plugin.ampPages.forEach((pg) => {
        pageInfos.get(pg).isAmp = true
      })
      return true
    })
  }

  // 写入构建 ID
  await writeBuildId(distDir, buildId)
  const finalPrerenderRoutes = {}
  const tbdPrerenderRoutes = []

  // 处理静态页面和预渲染页面
  if (staticPages.size > 0 || sprPages.size > 0) {
    const combinedPages = [...staticPages, ...sprPages]
    const exportApp = require('../export').default
    const exportOptions = {
      sprPages,
      silent: true,
      buildExport: true,
      pages: combinedPages,
      outdir: path.join(distDir, 'export'),
    }
    const exportConfig = {
      ...config,
      initialPageRevalidationMap: {},
      exportPathMap: (defaultMap) => {
        sprPages.forEach(page => {
          if (isDynamicRoute(page)) {
            tbdPrerenderRoutes.push(page)
            delete defaultMap[page]
          }
        })
        additionalSprPaths.forEach((routes, page) => {
          routes.forEach(route => {
            defaultMap[route] = { page }
          })
        })
        return defaultMap
      },
      exportTrailingSlash: false,
    }
    await exportApp(dir, exportOptions, exportConfig)

    // 删除导出的服务端 bundle
    for (const page of staticPages) {
      const { serverBundle } = pageInfos.get(page)
      await fsUnlink(serverBundle)
    }

    // 移动导出的页面文件
    const moveExportedPage = async (page, file, isSpr, ext) => {
      file = `${file}.${ext}`
      const orig = path.join(exportOptions.outdir, file)
      const relativeDest = (  path.join('static', buildId, 'pages', file)
      ).replace(/\\/g, '/')

      const dest = path.join(
        distDir,
         SERVER_DIRECTORY,
        relativeDest
      )

      if (!isSpr) {
        pagesManifest[page] = relativeDest
        if (page === '/') pagesManifest['/index'] = relativeDest
        if (page === '/.amp') pagesManifest['/index.amp'] = relativeDest
      }
      await mkdirp(path.dirname(dest))
      await fsMove(orig, dest)
    }

    for (const page of combinedPages) {
      const isSpr = sprPages.has(page)
      const isDynamic = isDynamicRoute(page)
      let file = page === '/' ? '/index' : page
      if (!(isSpr && isDynamic)) {
        await moveExportedPage(page, file, isSpr, 'html')
      }
      const hasAmp = hybridAmpPages.has(page)
      if (hasAmp) {
        await moveExportedPage(`${page}.amp`, `${file}.amp`, isSpr, 'html')
      }

 
    }

    // 删除临时导出文件夹
    await recursiveDelete(exportOptions.outdir)
    await fsRmdir(exportOptions.outdir)
    await fsWriteFile(manifestPath, JSON.stringify(pagesManifest), 'utf8')
  }
  if (postBuildSpinner) postBuildSpinner.stopAndPersist()
  console.log()

  // 记录优化分析时间
  const analysisEnd = process.hrtime(analysisBegin)
 

  // 处理预渲染路由
  if (sprPages.size > 0) {
    const finalDynamicRoutes = {}
    tbdPrerenderRoutes.forEach(tbdRoute => {
      const dataRoute = path.posix.join(
        '/_next/data',
        `${tbdRoute === '/' ? '/index' : tbdRoute}.json`
      )

      finalDynamicRoutes[tbdRoute] = {
        routeRegex: getRouteRegex(tbdRoute).re.source,
        dataRoute,
        dataRouteRegex: getRouteRegex(
          dataRoute.replace(/\.json$/, '')
        ).re.source.replace(/\(\?:\\\/\)\?\$$/, '\\.json$'),
      }
    })
    const prerenderManifest = {
      version: 1,
      routes: finalPrerenderRoutes,
      dynamicRoutes: finalDynamicRoutes,
    }

    await fsWriteFile(
      path.join(distDir, PRERENDER_MANIFEST),
      JSON.stringify(prerenderManifest),
      'utf8'
    )
  }

  // 收集静态页面和页面信息
  staticPages.forEach(pg => allStaticPages.add(pg))
  pageInfos.forEach((info, key) => {
    allPageInfos.set(key, info)
  })

  // 打印页面树视图
  printTreeView(Object.keys(mappedPages), allPageInfos, false)

  // 处理性能分析数据
  if (tracer) {
    const parsedResults = await tracer.profiler.stopProfiling()
    await new Promise(resolve => {
      if (parsedResults === undefined) {
        tracer.profiler.destroy()
        tracer.trace.flush()
        tracer.end(resolve)
        return
      }

      const cpuStartTime = parsedResults.profile.startTime
      const cpuEndTime = parsedResults.profile.endTime

      tracer.trace.completeEvent({
        name: 'TaskQueueManager::ProcessTaskFromWorkQueue',
        id: ++tracer.counter,
        cat: ['toplevel'],
        ts: cpuStartTime,
        args: {
          src_file: '../../ipc/ipc_moji_bootstrap.cc',
          src_func: 'Accept',
        },
      })

      tracer.trace.completeEvent({
        name: 'EvaluateScript',
        id: ++tracer.counter,
        cat: ['devtools.timeline'],
        ts: cpuStartTime,
        dur: cpuEndTime - cpuStartTime,
        args: {
          data: {
            url: 'webpack',
            lineNumber: 1,
            columnNumber: 1,
            frame: '0xFFF',
          },
        },
      })

      tracer.trace.instantEvent({
        name: 'CpuProfile',
        id: ++tracer.counter,
        cat: ['disabled-by-default-devtools.timeline'],
        ts: cpuEndTime,
        args: {
          data: {
            cpuProfile: parsedResults.profile,
          },
        },
      })

      tracer.profiler.destroy()
      tracer.trace.flush()
      tracer.end(resolve)
    })
  }

  // 等待所有后台任务完成
  ///===await Promise.all(backgroundWork).catch(() => {})
}


/*
Next.js 9.1.1 build 目錄到底完成了什麼任務


ChatGPT said:
在 Next.js 9.1.1 中，執行 next build 命令會在專案中建立一個 .next 目錄，這個目錄是 編譯產物與構建輸出的儲存地。這個建構過程完成了許多重要任務，以下是詳細分解：

1. 編譯 Pages（React 元件轉換成 JavaScript）
所有位於 pages/ 目錄下的 .js 檔案都會被處理。

使用 Babel 將 JSX 與現代 JavaScript 轉譯成兼容瀏覽器的 JavaScript。

每個 page 會生成兩個 bundle：

Server-side bundle：給 SSR 用（如 server/pages/index.js）

Client-side bundle：給瀏覽器載入使用（如 static/chunks/pages/index-xxxxx.js）





2. 頁面預渲染（Pre-rendering）
根據 page 的性質進行：

Static Generation（SG）：會在 build 時把頁面預渲染為 HTML。

Server-Side Rendering（SSR）：在 .next/server 生成對應的 SSR 處理模組。





3. 靜態資源打包
把 public/ 目錄下的檔案複製到 .next/static/

把共用的 JavaScript chunk 拆分（例如 _app.js, _error.js）




4. 記錄與統計
在 .next/build-manifest.json 中列出：

每個頁面所需載入的資源（JS/CSS chunk）

prerender-manifest.json：列出哪些頁面是靜態預渲染、路徑參數等




5. 處理 API Routes
如果有 pages/api/*.js，會打包成 server handler




6. 生成 build ID
.next/BUILD_ID 檔案會記錄唯一的 build 識別碼，部署時確保資源一致性

總結：.next 目錄包含的內容
目錄/檔案	功能
.next/server/	SSR bundle 與 API 路由處理器
.next/static/	靜態資源與 JS chunk
.next/build-manifest.json	每頁面載入的資源對應
.next/prerender-manifest.json	靜態生成頁面資料
.next/BUILD_ID	本次建構的唯一 ID


/******* */