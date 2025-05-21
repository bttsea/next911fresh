/**
 * 递归复制文件和目录
 */

// 引入模块
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

// 转换为 Promise 的文件操作
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const copyFile = promisify(fs.copyFile);

// 文件复制标志：禁止覆盖现有文件
const COPYFILE_EXCL = fs.constants.COPYFILE_EXCL;

/**
 * 简单的并发限制器
 * @param {number} limit - 最大并发数
 * @returns {Object} 包含 acquire 和 release 方法的对象
 */
function createConcurrencyLimiter(limit) {
  let active = 0;
  let queue = [];

  async function acquire() {
    if (active >= limit) {
      await new Promise((resolve) => queue.push(resolve));
    }
    active++;
  }

  function release() {
    active--;
    const next = queue.shift();
    if (next) next();
  }

  return { acquire, release };
}

/**
 * 递归复制源目录到目标目录
 * @param {string} source - 源目录或文件路径
 * @param {string} dest - 目标目录路径
 * @param {Object} [options] - 配置选项
 * @param {number} [options.concurrency=255] - 并发复制的最大数量
 * @param {Function} [options.filter] - 过滤函数，决定是否复制文件（接收路径，返回 true 表示复制）
 * @returns {Promise<void>} 复制完成的 Promise
 */
async function recursiveCopy(source, dest, options = {}) {
  const cwdPath = process.cwd();
  const from = path.resolve(cwdPath, source);
  const to = path.resolve(cwdPath, dest);

  // 默认选项
  const { concurrency = 255, filter = () => true } = options;

  // 创建并发限制器
  const limiter = createConcurrencyLimiter(concurrency);

  /**
   * 内部递归复制函数
   * @param {string} item - 当前处理的路径（文件或目录）
   * @returns {Promise<void>} 复制完成的 Promise
   */
  async function _copy(item) {
    const target = item.replace(from, to);
    const stats = await stat(item);

    // 获取并发许可
    await limiter.acquire();

    try {
      if (stats.isDirectory()) {
        try {
          await mkdir(target);
        } catch (err) {
          // 忽略“目录已存在”错误
          if (err.code !== 'EEXIST') {
            throw err;
          }
        }
        const files = await readdir(item);
        await Promise.all(files.map((file) => _copy(path.join(item, file))));
      } else if (
        stats.isFile() &&
        // 过滤路径：移除源路径前缀，将 Windows 反斜杠替换为正斜杠
        filter(item.replace(from, '').replace(/\\/g, '/'))
      ) {
        await copyFile(item, target, COPYFILE_EXCL);
      }
    } finally {
      // 释放并发许可
      limiter.release();
    }
  }

  await _copy(from);
}

// 导出模块，支持 CommonJS 和 ES Module
module.exports = { recursiveCopy };













 
///===----Sema--------Sema--------Sema--------Sema--------Sema--------Sema--------Sema----
// // 引入模块
// import path from 'path';
// import fs from 'fs';
// import { promisify } from 'util';
// import { Sema } from 'async-sema';

// // 转换为 Promise 的文件操作
// const mkdir = promisify(fs.mkdir);
// const stat = promisify(fs.stat);
// const readdir = promisify(fs.readdir);
// const copyFile = promisify(fs.copyFile);

// // 文件复制标志：禁止覆盖现有文件
// const COPYFILE_EXCL = fs.constants.COPYFILE_EXCL;

// /**
//  * 递归复制源目录到目标目录
//  * @param {string} source - 源目录或文件路径
//  * @param {string} dest - 目标目录路径
//  * @param {Object} [options] - 配置选项
//  * @param {number} [options.concurrency=255] - 并发复制的最大数量
//  * @param {Function} [options.filter] - 过滤函数，决定是否复制文件（接收路径，返回 true 表示复制）
//  * @returns {Promise<void>} 复制完成的 Promise
//  */
// async function recursiveCopy(source, dest, options = {}) {
//   const cwdPath = process.cwd();
//   const from = path.resolve(cwdPath, source);
//   const to = path.resolve(cwdPath, dest);

//   // 默认选项
//   const { concurrency = 255, filter = () => true } = options;

//   // 使用 async-sema 控制并发
//   const sema = new Sema(concurrency);

//   /**
//    * 内部递归复制函数
//    * @param {string} item - 当前处理的路径（文件或目录）
//    * @returns {Promise<void>} 复制完成的 Promise
//    */
//   async function _copy(item) {
//     const target = item.replace(from, to);
//     const stats = await stat(item);

//     // 获取信号量，控制并发
//     await sema.acquire();

//     if (stats.isDirectory()) {
//       try {
//         await mkdir(target);
//       } catch (err) {
//         // 忽略“目录已存在”错误
//         if (err.code !== 'EEXIST') {
//           throw err;
//         }
//       }
//       const files = await readdir(item);
//       await Promise.all(files.map((file) => _copy(path.join(item, file))));
//     } else if (
//       stats.isFile() &&
//       // 过滤路径：移除源路径前缀，将 Windows 反斜杠替换为正斜杠
//       filter(item.replace(from, '').replace(/\\/g, '/'))
//     ) {
//       await copyFile(item, target, COPYFILE_EXCL);
//     }

//     // 释放信号量
//     sema.release();
//         return;
//   }

//   await _copy(from);
// }

// // 导出模块，支持 CommonJS 和 ES Module
// module.exports = { recursiveCopy };