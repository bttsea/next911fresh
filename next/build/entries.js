// 导入颜色高亮库，用于终端输出 
import chalk from 'chalk'
// 导入路径拼接模块
import { join } from 'path'
// 导入查询字符串序列化模块
import { stringify } from 'querystring'

// 导入常量
import { API_ROUTE, DOT_NEXT_ALIAS, PAGES_DIR_ALIAS } from '../lib/constants'
 
// 导入警告日志工具
import { warn } from './output/log'

/**
 * 创建页面映射
 * @param {string[]} pagePaths 页面文件路径数组
 * @param {string[]} extensions 页面文件扩展名数组
 * @returns {Object} 页面映射对象，键为页面路径，值为文件路径
 */
export function createPagesMapping(pagePaths, extensions) {
  const previousPages = {}
  const pages = pagePaths.reduce((result, pagePath) => {
    // 移除文件扩展名并规范化路径
    let page = `${pagePath
      .replace(new RegExp(`\\.+(${extensions.join('|')})$`), '')
      .replace(/\\/g, '/')}`.replace(/\/index$/, '')
    page = page === '/index' ? '/' : page

    const pageKey = page === '' ? '/' : page

    // 检查重复页面并发出警告
    if (pageKey in result) {
      warn(
        `发现重复页面。${chalk.cyan(
          join('pages', previousPages[pageKey])
        )} 和 ${chalk.cyan(join('pages', pagePath))} 均解析为 ${chalk.cyan(pageKey)}。`
      )
    } else {
      previousPages[pageKey] = pagePath
    }
    // 映射页面路径
    result[pageKey] = join(PAGES_DIR_ALIAS, pagePath).replace(/\\/g, '/')
    return result
  }, {})

  // 设置默认页面路径
  pages['/_app'] = pages['/_app'] || 'next/dist/pages/_app'
  pages['/_error'] = pages['/_error'] || 'next/dist/pages/_error'
  pages['/_document'] = pages['/_document'] || 'next/dist/pages/_document'

  return pages
}

/**
 * 创建 Webpack 入口点
 * @param {Object} pages 页面映射对象
 * @param {string} target 构建目标（server、serverless 或 experimental-serverless-trace）
 * @param {string} buildId 构建 ID
 * @param {Object} config Next.js 配置对象
 * @returns {Object} 包含客户端和服务端入口点的对象
 */
export function createEntrypoints(pages, target, buildId, config) {
  const client = {}
  const server = {}
 

  // 遍历页面映射
  Object.keys(pages).forEach(page => {
    const absolutePagePath = pages[page]
    const bundleFile = page === '/' ? '/index.js' : `${page}.js`
    const isApiRoute = page.match(API_ROUTE)

    const bundlePath = join('static', buildId, 'pages', bundleFile)

    const isLikeServerless = false; ///=== isTargetLikeServerless(target)
   
    // 处理常规服务器模式或非 API 路由
    if (isApiRoute || target === 'server') {
      server[bundlePath] = [absolutePagePath]
    }


    // 跳过 _document 页面的客户端入口
    if (page === '/_document') {
      return
    }

    // 为非 API 路由添加客户端入口
    if (!isApiRoute) {
      client[bundlePath] = `next-client-pages-loader?${stringify({
        page,
        absolutePagePath,
      })}!`
    }
  })

  return {
    client,
    server,
  }
}