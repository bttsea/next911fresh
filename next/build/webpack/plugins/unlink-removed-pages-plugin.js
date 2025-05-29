// 导入 path 模块的 join 函数
import { join } from 'path';
// 导入 util 模块的 promisify 函数
import { promisify } from 'util';
// 导入 fs 模块
import fs from 'fs';
// 导入 Next.js 的页面正则表达式常量
import { IS_BUNDLED_PAGE_REGEX } from '../../../next-server/lib/constants';
// 导入 Webpack 的 Compiler
import { Compiler } from 'webpack';

// 将 fs.unlink 转换为 Promise：
const unlink = promisify(fs.unlink);

/**
 * Webpack 插件：在开发模式下删除已移除的页面文件
 */
export class UnlinkRemovedPagesPlugin {
  // 存储上一次的资源对象
  prevAssets;

  /**
   * 构造函数
   */
  constructor() {
    this.prevAssets = {};
  }

  /**
   * 应用插件到 Webpack 编译器
   * @param {Object} compiler - Webpack 编译器
   */
  apply(compiler) {
    // 监听 afterEmit 钩子，异步处理资源
    compiler.hooks.afterEmit.tapAsync(
      'NextJsUnlinkRemovedPages',
      (compilation, callback) => {
        // 查找已移除的页面文件
        const removed = Object.keys(this.prevAssets).filter(
          (a) => IS_BUNDLED_PAGE_REGEX.test(a) && !compilation.assets[a]
        );

        // 更新上一次的资源
        this.prevAssets = compilation.assets;

        // 异步删除已移除的文件
        Promise.all(
          removed.map(async (f) => {
            const path = join(compiler.outputPath, f);
            try {
              await unlink(path);
            } catch (err) {
              // 忽略文件不存在的错误
              if (err.code === 'ENOENT') return;
              throw err;
            }
          })
        ).then(() => callback(), callback);
      }
    );
  }
}


/*
代码功能说明
作用：
这是一个 Webpack 插件，用于 Next.js 9.1.1 的开发模式（next dev），确保从 .next 目录中删除已移除的页面文件，保持构建输出与源码同步。

防止已删除的页面文件残留在 .next 目录，影响开发体验。

主要功能：
资源跟踪：
使用 prevAssets 存储上一次编译的资源（compilation.assets）。

比较当前资源（compilation.assets）和上一次资源，识别已移除的页面文件。

页面过滤：
使用 IS_BUNDLED_PAGE_REGEX 过滤页面文件（匹配 pages/ 目录的构建输出）。

文件删除：
异步删除已移除的文件（unlink），路径基于 compiler.outputPath。

忽略文件不存在（ENOENT）错误，抛出其他错误。

钩子注册：
通过 compiler.hooks.afterEmit.tapAsync 在 afterEmit 阶段异步执行删除逻辑。

逻辑：
在每次编译输出后，检查已移除的页面文件。

使用正则表达式确保仅处理页面相关文件。

异步删除文件，更新 prevAssets 为当前资源。

支持开发模式的热更新，保持 .next 目录干净。

用途：
在 Next.js 9.1.1 的开发模式中，清理已删除的页面文件（如 pages/old-page.js），避免旧文件干扰。

适用于动态页面管理场景（如频繁添加/删除页面）。

在 H:\next911fresh\next\build\webpack-config.js 中通过 plugins 配置：
javascript

plugins: [
  new UnlinkRemovedPagesPlugin(),
]


/***** */