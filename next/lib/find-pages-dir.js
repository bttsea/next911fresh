/**
 * 查找 Next.js 项目的 pages 目录
 */

// 引入模块
import fs from 'fs';
import path from 'path';

/**
 * 检查文件或目录是否存在
 * @param {string} f - 文件或目录路径
 * @returns {boolean} 是否存在（true 表示存在，false 表示不存在）
 */
function existsSync(f) {
  try {
    fs.accessSync(f, fs.constants.F_OK);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * 查找 pages 目录
 * @param {string} dir - 项目根目录路径
 * @returns {string} pages 目录的绝对路径
 * @throws {Error} 如果未找到 pages 目录或目录位于父目录，抛出错误
 */
function findPagesDir(dir) {
  // 优先检查 ./pages
  let curDir = path.join(dir, 'pages');
  if (existsSync(curDir)) return curDir;

  // 次选检查 ./src/pages
  curDir = path.join(dir, 'src/pages');
  if (existsSync(curDir)) return curDir;

  // 检查父目录 ../pages
  if (existsSync(path.join(dir, '..', 'pages'))) {
    throw new Error(
      '> 未找到 `pages` 目录。你是否需要在父目录 (`../`) 中运行 `next`？'
    );
  }

  // 未找到 pages 目录，抛出错误
  throw new Error(
    '> 未找到 `pages` 目录。请在项目根目录下创建一个 `pages` 目录'
  );
}

// 导出模块，支持 CommonJS 和 ES Module
module.exports = { findPagesDir };