/**
 * 版权所有 (c) 2017-present James Kyle <me@thejameskyle.com>
 * MIT 许可证
 * 详见文件头部许可证声明
 *
 * 实现基于：https://github.com/jamiebuilds/react-loadable/pull/132
 * 为 Next.js 特定用例精简了不必要的结果
 */

// 导入 url 模块
import url from 'url';
// 导入 Webpack 的 Compiler 和 compilation
import { Compiler, compilation } from 'webpack';

/**
 * 构建 React Loadable 清单
 * @param {Object} compiler - Webpack 编译器
 * @param {Object} compilation - Webpack 编译对象
 * @returns {Object} 清单对象
 */
function buildManifest(compiler, compilation) {
  let context = compiler.options.context;
  let manifest = {};

  // 遍历所有块组
  compilation.chunkGroups.forEach((chunkGroup) => {
    // 跳过初始块组
    if (chunkGroup.isInitial()) {
      return;
    }

    // 遍历块组来源
    chunkGroup.origins.forEach((chunkGroupOrigin) => {
      const { request } = chunkGroupOrigin;

      // 遍历块
      chunkGroup.chunks.forEach((chunk) => {
        // 遍历块文件
        chunk.files.forEach((file) => {
          // 仅处理 .js 文件且位于 static/chunks/ 目录
          if (!file.match(/\.js$/) || !file.match(/^static\/chunks\//)) {
            return;
          }

          // 构建公开路径
          let publicPath = url.resolve(
            compilation.outputOptions.publicPath || '',
            file
          );

          // 遍历模块
          for (const module of chunk.modulesIterable) {
            let id = module.id;
            let name =
              typeof module.libIdent === 'function'
                ? module.libIdent({ context })
                : null;

            if (!manifest[request]) {
              manifest[request] = [];
            }

            // 避免重复文件
            if (
              manifest[request].some(
                (item) => item.id === id && item.file === file
              )
            ) {
              continue;
            }

            // 添加模块信息到清单
            manifest[request].push({
              id,
              name,
              file,
              publicPath,
            });
          }
        });
      });
    });
  });

  // 按键排序并重组清单
  manifest = Object.keys(manifest)
    .sort()
    .reduce((a, c) => ((a[c] = manifest[c]), a), {});

  return manifest;
}

/**
 * Webpack 插件：生成 React Loadable 清单
 */
export class ReactLoadablePlugin {
  // 清单文件名
  filename;

  /**
   * 构造函数
   * @param {Object} opts - 插件选项
   * @param {string} opts.filename - 清单文件名
   */
  constructor(opts) {
    this.filename = opts.filename;
  }

  /**
   * 应用插件到 Webpack 编译器
   * @param {Object} compiler - Webpack 编译器
   */
  apply(compiler) {
    // 监听 emit 钩子，异步生成清单
    compiler.hooks.emit.tapAsync(
      'ReactLoadableManifest',
      (compilation, callback) => {
        // 构建清单
        const manifest = buildManifest(compiler, compilation);
        // 序列化为 JSON
        const json = JSON.stringify(manifest, null, 2);
        // 添加到编译资源
        compilation.assets[this.filename] = {
          source() {
            return json;
          },
          size() {
            return json.length;
          },
        };
        // 完成回调
        callback();
      }
    );
  }
}


/*
代码功能说明
作用：
这是一个 Webpack 插件，用于 Next.js 9.1.1 的构建流程，生成 react-loadable 清单（通常为 react-loadable.json），记录动态导入模块的信息。
基于 react-loadable 的 PR（https://github.com/jamiebuilds/react-loadable/pull/132），为 Next.js 优化，支持动态导入（import()）。
清单用于服务端渲染（SSR）和客户端动态加载模块。

主要功能：
清单构建（buildManifest）：
遍历 compilation.chunkGroups，跳过初始块组（isInitial）。
从块组来源（origins）提取动态导入请求（request）。
遍历块（chunks）和文件（files），筛选 .js 文件（位于 static/chunks/）。
构建公开路径（publicPath）使用 url.resolve。
遍历模块（modulesIterable），提取 id, name（通过 libIdent），file, publicPath。
去重模块信息，避免重复。
按请求键排序，生成清单对象。

资源输出：
在 compiler.hooks.emit.tapAsync 阶段，生成清单 JSON。

输出到 compilation.assets[filename]，提供 source 和 size 方法。

逻辑：
收集动态导入的模块信息，生成结构化清单。
仅处理非初始块组（动态加载的块）。
确保文件路径和公开路径正确，兼容 SSR 和客户端。
支持模块去重和排序，提升清单可读性。

用途：
在 Next.js 9.1.1 的动态导入场景中，支持 react-loadable 的模块加载。
用于 SSR 和客户端代码分割（如 pages/ 下的动态导入）。
清单文件（如 react-loadable.json）供 Next.js 运行时使用。

在 H:\next911fresh\next\build\webpack-config.js 中通过 plugins 配置：
javascript

plugins: [
  new ReactLoadablePlugin({ filename: 'react-loadable.json' }),
]


/**** */