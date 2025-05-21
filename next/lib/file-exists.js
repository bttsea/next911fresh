/**
 * 检查文件是否存在 
 */

// 引入模块
import fs from 'fs';
import { promisify } from 'util';

// 转换为 Promise 的文件访问操作
const access = promisify(fs.access);

/**
 * 检查文件是否存在
 * @param {string} fileName - 文件路径
 * @returns {Promise<boolean>} 文件是否存在（true 表示存在，false 表示不存在）
 * @throws {Error} 如果发生除 ENOENT 外的其他错误
 */
async function fileExists(fileName) {
  try {
    await access(fileName, fs.constants.F_OK);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}

// 导出模块，支持 CommonJS 和 ES Module
module.exports = { fileExists };