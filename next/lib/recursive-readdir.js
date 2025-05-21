/**
 * 递归读取目录中的文件
  */

// 引入模块
import fs from 'fs';
import { join } from 'path';
import { promisify } from 'util';

// 转换为 Promise 的文件操作
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

/**
 * 递归读取目录
 * @param {string} dir - 要读取的目录路径
 * @param {RegExp} filter - 文件名过滤正则表达式（仅匹配文件名，不含路径）
 * @param {RegExp} [ignore] - 忽略文件名的正则表达式
 * @param {string[]} [arr=[]] - 用于递归的路径数组（无需手动提供）
 * @param {string} [rootDir=dir] - 根目录路径，用于生成相对路径
 * @returns {Promise<string[]>} 包含所有匹配文件的相对路径数组（按字母排序）
 */
async function recursiveReadDir(dir, filter, ignore, arr = [], rootDir = dir) {
  const result = await readdir(dir);

  await Promise.all(
    result.map(async (part) => {
      const absolutePath = join(dir, part);
      if (ignore && ignore.test(part)) return;

      const pathStat = await stat(absolutePath);

      if (pathStat.isDirectory()) {
        await recursiveReadDir(absolutePath, filter, ignore, arr, rootDir);
        return;
      }

      if (!filter.test(part)) {
        return;
      }

      arr.push(absolutePath.replace(rootDir, ''));
    })
  );

  return arr.sort();
}

// 导出模块，支持 CommonJS 和 ES Module
module.exports = { recursiveReadDir };