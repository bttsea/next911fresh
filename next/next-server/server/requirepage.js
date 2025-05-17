// 引入 Node.js 内置模块
const fs = require('fs');
const { join } = require('path');
const { promisify } = require('util');
// 引入项目内部常量和模块
const {
  PAGES_MANIFEST,
  SERVER_DIRECTORY,
  SERVERLESS_DIRECTORY,
} = require('../lib/constants');
const { normalizePagePath } = require('./normalize-page-path');

// 将 fs.readFile 转换为 Promise 版本
const readFile = promisify(fs.readFile);

/**
 * 创建页面未找到的错误
 * @param {string} page - 页面路径（例如 '/about'）
 * @returns {Error} 包含错误信息的 Error 对象，带有 ENOENT 错误码
 */
function pageNotFoundError(page) {
  const err = new Error(`Cannot find module for page: ${page}`);
  err.code = 'ENOENT';
  return err;
}

/**
 * 获取页面的文件路径
 * @param {string} page - 页面路径（例如 '/about' 或 '/index'）
 * @param {string} distDir - 构建输出目录（例如 '.next'）
 * @param {boolean} serverless - 是否为无服务器模式
 * @param {boolean} [dev=false] - 是否为开发模式
 * @returns {string} 页面对应的文件路径
 * @throws {Error} 如果页面未找到，抛出 ENOENT 错误
 */
function getPagePath(page, distDir, serverless, dev = false) {
  // 根据模式选择服务器构建目录
  const serverBuildPath = join(
    distDir,
    SERVER_DIRECTORY
  );
  // 加载页面清单
  const pagesManifest = require(join(serverBuildPath, PAGES_MANIFEST));

  try {
    // 规范化页面路径
    page = normalizePagePath(page);
    // 根路径 '/' 转换为 '/index'
    page = page === '/' ? '/index' : page;
  } catch (err) {
    console.error(err);
    throw pageNotFoundError(page);
  }

  // 检查页面是否在清单中
  if (!pagesManifest[page]) {
    // 尝试移除 '/index' 后缀或使用根路径 '/'
    const cleanedPage = page.replace(/\/index$/, '') || '/';
    if (!pagesManifest[cleanedPage]) {
      throw pageNotFoundError(page);
    } else {
      page = cleanedPage;
    }
  }

  // 返回页面文件的完整路径
  return join(serverBuildPath, pagesManifest[page]);
}

/**
 * 加载页面模块或 HTML 文件
 * @param {string} page - 页面路径（例如 '/about'）
 * @param {string} distDir - 构建输出目录（例如 '.next'）
 * @param {boolean} serverless - 是否为无服务器模式
 * @returns {any} 页面模块（JS）或 HTML 内容（字符串）
 */
function requirePage(page, distDir, serverless) {
  // 获取页面文件路径
  const pagePath = getPagePath(page, distDir, serverless);

  // 如果是 HTML 文件，读取内容
  if (pagePath.endsWith('.html')) {
    return readFile(pagePath, 'utf8');
  }

  // 否则加载 JS 模块
  return require(pagePath);
}

// 导出函数，支持 CommonJS 和 ES Module
module.exports = { pageNotFoundError, getPagePath, requirePage };


/*
功能一致性:
pageNotFoundError: 创建 ENOENT 错误，表示页面未找到。

getPagePath:
规范化页面路径（通过 normalizePagePath）。
从 PAGES_MANIFEST 获取文件路径，处理 /index 和根路径。

抛出错误如果页面不存在。

requirePage:
加载 JS 模块（require）或 HTML 文件（readFile）。

支持服务器和无服务器模式。




示例:
const { requirePage } = require('../server/getPagePath');
const manifest = { '/about': 'server/pages/about.js' };
requirePage('/about', '.next', false); // 返回模块
requirePage('/index.html', '.next', false); // 返回 HTML 字符串


/***** */