// 导入 Webpack
import webpack from 'webpack';
// 导入 Webpack 的 RawSource
import { RawSource } from 'webpack-sources';
// 导入 path 模块的 join, relative, dirname 函数
import { join, relative, dirname } from 'path';
// 导入 Next.js 的页面正则表达式常量
import { IS_BUNDLED_PAGE_REGEX } from '../../../next-server/lib/constants';

// SSR 模块缓存文件名
const SSR_MODULE_CACHE_FILENAME = 'ssr-module-cache.js';

/**
 * Webpack 插件：为 Next.js SSR 共享模块缓存
 */
export default class NextJsSsrImportPlugin {
  /**
   * 构造函数
   * @param {Object} options - 插件选项
   * @param {string} options.outputPath - 输出路径
   */
  constructor(options) {
    this.options = options;
  }

  /**
   * 应用插件到 Webpack 编译器
   * @param {Object} compiler - Webpack 编译器
   */
  apply(compiler) {
    const { outputPath } = this.options;

    // 监听 emit 钩子，生成缓存文件
    compiler.hooks.emit.tapAsync(
      'NextJsSSRModuleCache',
      (compilation, callback) => {
        // 生成 ssr-module-cache.js 文件，导出一个空对象
        compilation.assets[SSR_MODULE_CACHE_FILENAME] = new RawSource(`
      /* This cache is used by webpack for instantiated modules */
      module.exports = {}
      `);
        callback();
      }
    );

    // 监听 compilation 钩子
    compiler.hooks.compilation.tap('NextJsSSRModuleCache', (compilation) => {
      // 拦截 mainTemplate 的 localVars 钩子
      compilation.mainTemplate.hooks.localVars.intercept({
        register(tapInfo) {
          if (tapInfo.name === 'MainTemplate') {
            const originalFn = tapInfo.fn;
            tapInfo.fn = (source, chunk) => {
              // 如果块不是页面目录的一部分，保留原始行为
              if (!IS_BUNDLED_PAGE_REGEX.exec(chunk.name)) {
                return originalFn(source, chunk);
              }

              // 计算页面路径
              const pagePath = join(outputPath, dirname(chunk.name));
              // 计算缓存文件相对于页面路径的相对路径
              let relativePathToBaseDir = relative(
                pagePath,
                join(outputPath, SSR_MODULE_CACHE_FILENAME)
              );

              // 规范化路径分隔符为 Unix 风格
              const relativePathToBaseDirNormalized = relativePathToBaseDir.replace(
                /\\/g,
                '/'
              );

              // 修改模块缓存代码，引用共享缓存文件
              return webpack.Template.asString([
                source,
                '// The module cache',
                `var installedModules = require('${relativePathToBaseDirNormalized}');`,
              ]);
            };
          }
          return tapInfo;
        },
      });
    });
  }
}


/*
代码功能说明
作用：
这是一个 Webpack 插件，用于 Next.js 9.1.1 的服务端渲染（SSR），通过共享模块缓存解决多入口点导致的模块实例隔离问题。
它生成一个共享缓存文件（ssr-module-cache.js），并修改 Webpack 的模块缓存逻辑，引用该文件以确保 Node.js 的单一模块实例。

主要功能：
生成缓存文件：
在 compiler.hooks.emit 阶段，生成 ssr-module-cache.js，内容为 module.exports = {}。
使用 RawSource 输出文件到 compilation.assets。

修改模块缓存：
在 compilation.mainTemplate.hooks.localVars.intercept 阶段，拦截 Webpack 的 installedModules 定义。
替换为 require('${relativePathToBaseDirNormalized}')，引用共享缓存文件。
仅对页面块（匹配 IS_BUNDLED_PAGE_REGEX）应用修改，避免影响非页面块（如 mini-css-extract-plugin）。

路径处理：
计算页面路径（join(outputPath, dirname(chunk.name))）。

计算缓存文件相对于页面路径的相对路径（relative）。

规范化路径分隔符（replace(/\\/g, '/')），确保跨平台兼容。

兼容性：
仅针对 node 编译目标（服务端），客户端使用 runtimeChunk: 'single'。

支持单例模式（singleton pattern），确保多入口点共享模块实例。

逻辑：
在编译输出阶段，生成共享缓存文件。

在代码生成阶段，动态替换 installedModules 为共享缓存引用。

确保仅页面块受影响，保持其他块的原始行为。

利用 Node.js 的模块缓存机制（require.cache），实现单一实例。

用途：
在 Next.js 9.1.1 的 SSR 构建中，确保多入口点的模块（如 react, redux）共享单一实例，避免单例模式问题。

适用于 API 路由（pages/api/）、SSR 页面和其他服务端代码。

在 H:\next911fresh\next\build\webpack-config.js 中通过 plugins 配置：
javascript

plugins: [
  new NextJsSsrImportPlugin({ outputPath: './dist' }),
]

/**** */