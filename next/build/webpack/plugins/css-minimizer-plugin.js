// 导入 cssnano-simple 的 process 函数并重命名为 minify
import { process as minify } from 'cssnano-simple';
// 导入 Webpack
import webpack from 'webpack';
// 导入 Webpack 的 RawSource 和 SourceMapSource
import { RawSource, SourceMapSource } from 'webpack-sources';

// CSS 文件匹配正则表达式
const CSS_REGEX = /\.css(\?.*)?$/i;

/**
 * Webpack 插件：压缩 CSS 文件
 */
export class CssMinimizerPlugin {
  /**
   * 构造函数
   * @param {Object} options - 插件选项
   * @param {Object} options.postcssOptions - PostCSS 配置
   * @param {boolean|Object} options.postcssOptions.map - 源映射配置
   */
  constructor(options) {
    this.options = options;
  }

  /**
   * 应用插件到 Webpack 编译器
   * @param {Object} compiler - Webpack 编译器
   */
  apply(compiler) {
    // 监听 compilation 钩子
    compiler.hooks.compilation.tap('CssMinimizerPlugin', (compilation) => {
      // 监听 optimizeChunkAssets 钩子，异步处理
      compilation.hooks.optimizeChunkAssets.tapPromise(
        'CssMinimizerPlugin',
        (chunks) =>
          Promise.all(
            // 收集所有块中的 CSS 文件
            chunks
              .reduce((acc, chunk) => acc.concat(chunk.files || []), [])
              .filter((entry) => CSS_REGEX.test(entry))
              .map((file) => {
                // 配置 PostCSS 选项
                const postcssOptions = {
                  ...this.options.postcssOptions,
                  to: file,
                  from: file,
                };

                // 获取资源
                const asset = compilation.assets[file];
                let input;

                // 处理源映射
                if (postcssOptions.map && asset.sourceAndMap) {
                  const { source, map } = asset.sourceAndMap();
                  input = source;
                  postcssOptions.map.prev = map ? map : false;
                } else {
                  input = asset.source();
                }

                // 压缩 CSS 并更新资源
                return minify(input, postcssOptions).then((res) => {
                  if (res.map) {
                    // 使用 SourceMapSource 输出带源映射的 CSS
                    compilation.assets[file] = new SourceMapSource(
                      res.css,
                      file,
                      res.map.toJSON()
                    );
                  } else {
                    // 使用 RawSource 输出压缩后的 CSS
                    compilation.assets[file] = new RawSource(res.css);
                  }
                });
              })
          )
      );
    });
  }
}


/*
代码功能说明
作用：
这是一个 Webpack 插件，用于 Next.js 9.1.1 的构建流程，压缩 CSS 文件，基于 cssnano-simple。
它优化 CSS 块资源，支持源映射，减少文件大小，提升客户端加载性能。

参考了 optimize-css-assets-webpack-plugin（https://github.com/NMFR/optimize-css-assets-webpack-plugin/blob/master/src/index.js#L20）。

主要功能：
收集 CSS 文件：
遍历所有块（chunks），提取文件（chunk.files）。

使用 CSS_REGEX（/\.css(\?.*)?$/i）过滤 CSS 文件。

配置 PostCSS：
合并插件选项（this.options.postcssOptions），设置 to 和 from 为文件名。
如果启用源映射（postcssOptions.map），提取源代码和映射（asset.sourceAndMap）。

压缩 CSS：
使用 minify（cssnano-simple.process）压缩 CSS，传入输入内容和 PostCSS 配置。
返回 Promise，异步处理压缩结果。

输出资源：
如果生成源映射（res.map），使用 SourceMapSource 输出压缩后的 CSS 和映射。
否则，使用 RawSource 输出压缩后的 CSS。
更新 compilation.assets[file]。

逻辑：
在 compiler.hooks.compilation 阶段注册插件。
在 compilation.hooks.optimizeChunkAssets 阶段异步压缩 CSS 文件。
使用 Promise.all 并行处理多个 CSS 文件。
支持源映射，兼容开发和生产环境。

用途：
在 Next.js 9.1.1 的构建流程中，压缩 CSS 文件，优化客户端资源。

/***** */