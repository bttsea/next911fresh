// 导入 Webpack 的 Compiler 和 Plugin
import { Compiler } from 'webpack';
// 导入 Webpack 的 RawSource
import { RawSource } from 'webpack-sources';
// 导入 Next.js 的常量
import {
  PAGES_MANIFEST,
  ROUTE_NAME_REGEX,
  SERVERLESS_ROUTE_NAME_REGEX,
} from '../../../next-server/lib/constants';

/**
 * Webpack 插件：生成 pages-manifest.json，映射页面路径到构建输出
 */
export default class PagesManifestPlugin {
 

  /**
   * 构造函数
   * @param {boolean} serverless - 是否启用无服务器模式
   */
  constructor(serverless) {
   ///=== this.serverless = serverless;
  }

  /**
   * 应用插件到 Webpack 编译器
   * @param {Object} compiler - Webpack 编译器
   */
  apply(compiler) {
    // 监听 emit 钩子
    compiler.hooks.emit.tap('NextJsPagesManifest', (compilation) => {
      const { chunks } = compilation;
      const pages = {};

      // 遍历所有块
      for (const chunk of chunks) {
        // 根据模式选择正则表达式
        const result = (  ROUTE_NAME_REGEX ).exec(chunk.name);

        if (!result) {
          continue;
        }

        const pagePath = result[1];

        if (!pagePath) {
          continue;
        }

        // 规范化路径，替换反斜杠为正斜杠
        pages[`/${pagePath.replace(/\\/g, '/')}`] = chunk.name.replace(
          /\\/g,
          '/'
        );
      }

      // 将 /index 映射到 /
      if (typeof pages['/index'] !== 'undefined') {
        pages['/'] = pages['/index'];
      }

      // 生成 pages-manifest.json
      compilation.assets[PAGES_MANIFEST] = new RawSource(JSON.stringify(pages));
    });
  }
}


/*  生成 pages-manifest.json 文件----生成 pages-manifest.json 文件----生成 pages-manifest.json 文件----
代码功能说明
作用：
这是一个 Webpack 插件，用于 Next.js 9.1.1 的构建流程，生成 pages-manifest.json 文件，映射页面路径（如 /）到构建输出路径（如 .next/server/static/<buildid>/pages/index.js）。
用于服务端渲染（SSR）时定位页面文件，也用于 next export 生成 defaultPathMap。

主要功能：
块处理：
遍历 compilation.chunks，提取页面块。

使用正则表达式（ROUTE_NAME_REGEX 或 SERVERLESS_ROUTE_NAME_REGEX）匹配块名称，提取页面路径（pagePath）。

路径映射：
将页面路径（/${pagePath}）映射到块名称（chunk.name）。
规范化路径，替换反斜杠为正斜杠，确保跨平台一致性。

首页处理：
如果存在 /index 页面，将其映射到 /。

生成清单：
使用 RawSource 输出 pages-manifest.json，包含 pages 对象的 JSON 序列化。
添加到 compilation.assets[PAGES_MANIFEST]。

逻辑：
在 compiler.hooks.emit 阶段，生成 pages-manifest.json。
根据 serverless 模式选择适当的正则表达式。
仅处理匹配页面块，忽略非页面块。
确保路径格式兼容 SSR 和 next export。

用途：
在 Next.js 9.1.1 的 SSR 和导出流程中，提供页面路径到构建文件的映射。
支持服务端渲染页面（SSR）、API 路由和静态导出。

在 H:\next911fresh\next\build\webpack-config.js 中通过 plugins 配置：
javascript

plugins: [
  new PagesManifestPlugin({ serverless: false }),
]


/**** */