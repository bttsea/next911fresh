/**
 * 递归删除目录内容 
 */

// 引入模块
import fs from 'fs';
import { join } from 'path';
import { promisify } from 'util';

// 转换为 Promise 的文件操作
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const rmdir = promisify(fs.rmdir);
const unlink = promisify(fs.unlink);
const sleep = promisify(setTimeout);

/**
 * 删除单个文件，支持错误重试
 * @param {string} p - 文件路径
 * @param {number} [t=1] - 当前重试次数（最大 3 次）
 * @returns {Promise<void>} 删除完成的 Promise
 */
async function unlinkFile(p, t = 1) {
  try {
    await unlink(p);
  } catch (e) {
    if (
      (e.code === 'EBUSY' ||
        e.code === 'ENOTEMPTY' ||
        e.code === 'EPERM' ||
        e.code === 'EMFILE') &&
      t < 3
    ) {
      await sleep(t * 100);
      return unlinkFile(p, t + 1);
    }

    if (e.code === 'ENOENT') {
      return;
    }

    throw e;
  }
}

/**
 * 递归删除目录内容
 * @param {string} dir - 要删除内容的目录路径
 * @param {RegExp} [filter] - 相对路径的正则表达式过滤器
 * @param {string} [previousPath=''] - 相对路径前缀（用于过滤）
 * @param {boolean} [ensure] - 是否确保目录存在（仅在顶层生效）
 * @returns {Promise<void>} 删除完成的 Promise
 */
async function recursiveDelete(dir, filter, previousPath = '', ensure) {
  let result;
  try {
    result = await readdir(dir);
  } catch (e) {
    if (e.code === 'ENOENT' && !ensure) {
      return;
    }
    throw e;
  }

  await Promise.all(
    result.map(async (part) => {
      const absolutePath = join(dir, part);
      let pathStat;
      try {
        pathStat = await stat(absolutePath);
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }
      if (!pathStat) {
        return;
      }

      if (pathStat.isDirectory()) {
        const pp = join(previousPath, part);
        await recursiveDelete(absolutePath, filter, pp);

        if (!filter || filter.test(pp)) {
          return rmdir(absolutePath);
        }
        return;
      }

      if (!filter || filter.test(join(previousPath, part))) {
        return unlinkFile(absolutePath);
      }
    })
  );
}

// 导出模块，支持 CommonJS 和 ES Module
module.exports = { recursiveDelete };