// 导入 Webpack 的 loader 类型（仅用于上下文）
import { loader } from 'webpack';
// 导入 string-hash 模块用于生成哈希
import hash from 'string-hash';
// 导入 path 模块的 basename 函数
import { basename } from 'path';

/**
 * Webpack Loader：为 Next.js 数据文件生成 createHook 代码
 * @param {string} source - 输入文件的内容（未使用）
 * @returns {string} 生成的 JavaScript 代码
 */
function nextDataLoader(source) {
  // 获取当前文件路径
  const filename = this.resourcePath;

  // 生成包含 createHook 的代码
  return `
    import {createHook} from 'next/data'

    export default createHook(undefined, {key: ${JSON.stringify(
      basename(filename) + '-' + hash(filename)
    )}})
  `;
}

// 导出 Loader 函数
export default nextDataLoader;



/*   ---------------------------------------------------------delete later----------------------------
 与 next/data 相关   与 next/data 相关    与 next/data 相关
代码功能说明
作用：
这是一个 Webpack Loader，用于 Next.js 9.1.1 的数据文件（通常与 next/data 相关），生成调用 createHook 的 JavaScript 代码。

它忽略输入的 source，直接生成新代码，导出一个 createHook 实例，带唯一的 key。

主要功能：
获取文件名：
从 this.resourcePath 获取当前文件路径（filename）。

生成唯一键：
使用 basename(filename) 获取文件名，结合 hash(filename) 生成唯一 key。

通过 JSON.stringify 确保键为字符串。

生成代码：
返回包含以下内容的代码：
导入 createHook 从 'next/data'。

导出默认的 createHook(undefined, {key: "filename-hash"})。

输出：
生成的代码替换原文件内容，供 Webpack 继续处理。

逻辑：
简单直接，忽略输入 source，生成固定的代码模板。

使用 basename 和 hash 确保每个文件的 key 唯一，避免冲突。

依赖 next/data 模块的 createHook 函数。

用途：
在 Next.js 9.1.1 的构建流程中，为 next/data 相关文件生成数据钩子代码。
/******* */
