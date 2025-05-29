// 导入 Webpack 的 Compiler 和 Plugin
import { Compiler } from 'webpack';
// 导入 fs 模块的 realpathSync 函数
import { realpathSync } from 'fs';

/**
 * 删除指定路径的 require 缓存
 * @param {string} path - 文件路径
 */
function deleteCache(path) {
  try {
    // 删除真实路径的缓存
    delete require.cache[realpathSync(path)];
  } catch (e) {
    // 忽略文件不存在的错误
    if (e.code !== 'ENOENT') throw e;
  } finally {
    // 删除原始路径的缓存
    delete require.cache[path];
  }
}

/**
 * Webpack 插件：清除 require 缓存以支持服务器文件热重载
 */
export class NextJsRequireCacheHotReloader {
  // 存储上一次的资源对象
  prevAssets = null;

  /**
   * 应用插件到 Webpack 编译器
   * @param {Object} compiler - Webpack 编译器
   */
  apply(compiler) {
    // 监听 afterEmit 钩子，异步执行
    compiler.hooks.afterEmit.tapAsync(
      'NextJsRequireCacheHotReloader',
      (compilation, callback) => {
        const { assets } = compilation;

        // 如果存在上一次的资源
        if (this.prevAssets) {
          // 清除当前资源的缓存
          for (const f of Object.keys(assets)) {
            deleteCache(assets[f].existsAt);
          }
          // 清除已删除资源的缓存
          for (const f of Object.keys(this.prevAssets)) {
            if (!assets[f]) {
              deleteCache(this.prevAssets[f].existsAt);
            }
          }
        }
        // 更新上一次的资源
        this.prevAssets = assets;

        // 完成回调
        callback();
      }
    );
  }
}


/*
代码功能说明
作用：
这是一个 Webpack 插件，用于 Next.js 9.1.1 的构建流程，在文件输出后清除 require.cache，实现服务器文件的热重载。
它确保 Node.js 重新加载更新的服务器文件，避免缓存导致的旧代码执行。

主要功能：
缓存清除（deleteCache）：
删除 require.cache 中的指定路径（真实路径和原始路径）。
使用 realpathSync 获取真实路径，处理符号链接。
忽略文件不存在（ENOENT）错误，抛出其他错误。

资源跟踪：
使用 prevAssets 存储上一次编译的资源（compilation.assets）。

比较当前资源（assets）和上一次资源（prevAssets）。

清除逻辑：
清除当前资源的所有文件缓存（assets[f].existsAt）。
清除已删除资源（存在于 prevAssets 但不在 assets）的缓存。

更新 prevAssets 为当前资源。

钩子注册：
通过 compiler.hooks.afterEmit.tapAsync 在 afterEmit 阶段异步执行清除逻辑。


/***** */