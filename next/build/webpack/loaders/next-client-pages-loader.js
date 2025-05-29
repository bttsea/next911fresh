// 导入 Webpack 的 loader 类型（仅用于上下文）
import { loader } from 'webpack';
// 导入 loader-utils 模块
import loaderUtils from 'loader-utils';

/**
 * Webpack Loader：为 Next.js 客户端页面生成动态加载代码
 * @param {string} source - 输入文件的内容（未使用）
 * @returns {string} 生成的 JavaScript 代码
 */
function nextClientPagesLoader() {
  // 获取 Loader 配置参数
  const { absolutePagePath, page } = loaderUtils.getOptions(this);

  // 将页面路径和页面名称序列化为 JSON 字符串
  const stringifiedAbsolutePagePath = JSON.stringify(absolutePagePath);
  const stringifiedPage = JSON.stringify(page);

  // 生成动态加载页面代码
  return `
    (window.__NEXT_P=window.__NEXT_P||[]).push([${stringifiedPage}, function() {
      // 动态加载页面模块
      var mod = require(${stringifiedAbsolutePagePath});
      // 支持模块热更新（HMR）
      if (module.hot) {
        module.hot.accept(${stringifiedAbsolutePagePath}, function() {
          // 如果页面未注册，直接返回
          if (!next.router.components[${stringifiedPage}]) return;
          // 重新加载更新后的页面模块
          var updatedPage = require(${stringifiedAbsolutePagePath});
          // 更新 Next.js 路由中的页面组件
          next.router.update(${stringifiedPage}, updatedPage);
        });
      }
      return mod;
    }]);
  `;
}

// 导出 Loader 函数
export default nextClientPagesLoader;



/*
代码功能说明
作用：
这是一个 Webpack Loader，用于 Next.js 9.1.1 的客户端页面（位于 pages 目录），生成动态加载页面的 JavaScript 代码。

它忽略输入的 source，根据配置生成代码，将页面注册到 window.__NEXT_P 数组，支持 Next.js 的客户端路由和模块热更新（HMR）。

主要功能：
获取配置：
从 loaderUtils.getOptions 获取 absolutePagePath（页面文件的绝对路径）和 page（页面路由名称）。

生成代码：
创建代码片段，将页面信息推送到 window.__NEXT_P 全局数组：
页面路由（page）作为键。
动态加载函数，使用 require 加载页面模块（absolutePagePath）。

支持模块热更新（HMR）：
如果启用 module.hot，注册热更新回调。
检测页面是否仍在路由中（next.router.components[page]）。
重新加载更新后的页面模块，并通过 next.router.update 更新路由。

输出：
返回生成的代码，替换原文件内容，供 Webpack 继续处理。

逻辑：
使用 window.__NEXT_P 存储页面加载信息，供 Next.js 客户端路由使用。
通过 require 实现动态加载，支持 CommonJS 模块。
HMR 逻辑确保页面更新时无缝刷新，提升开发体验。

用途：
在 Next.js 9.1.1 的构建流程中，为 pages 目录下的客户端页面生成加载代码。
支持 Next.js 的客户端路由和动态页面加载，优化页面加载性能。
在 H:\next911fresh\next\build\webpack-config.js 的 module.rules 中配置，针对页面文件应用：
javascript

module.rules: [
  {
    test: /[\\/]pages[\\/].*\.js$/,
    use: {
      loader: 'next-client-pages-loader',          ///===!!!!!!!!!!!!!!!!!!
      options: {
        absolutePagePath: 'absolute/path/to/page.js',
        page: '/page',
      },
    },
  },
]


/**** */


