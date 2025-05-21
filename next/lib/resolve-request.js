/**
 * 解析模块请求路径
 */

// 引入模块
import resolve from 'next/dist/compiled/resolve/index.js';
import path from 'path';

/**
 * 解析模块请求路径
 * @param {string} req - 模块请求（如 'lodash' 或 './utils'）
 * @param {string} issuer - 发起请求的文件路径（如 'H:\\my-app\\pages\\index.js'）
 * @returns {string} 解析后的模块绝对路径
 */
function resolveRequest(req, issuer) {
  // 如果使用 Yarn PnP，通过 pnpapi 解析模块
  if (process.versions.pnp) {
    const { resolveRequest } = require('pnpapi');
    return resolveRequest(req, issuer, { considerBuiltins: false });
  }

  // 否则，使用 resolve.sync 解析模块
  const basedir =
    issuer.endsWith(path.posix.sep) || issuer.endsWith(path.win32.sep)
      ? issuer
      : path.dirname(issuer);
  return resolve.sync(req, { basedir });
}

// 导出模块，支持 CommonJS 和 ES Module
module.exports = { resolveRequest };