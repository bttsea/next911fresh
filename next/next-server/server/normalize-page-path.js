// 引入 Node.js 内置模块
const { posix } = require('path');

/**
 * 规范化页面路径，确保路径以斜杠开头且不包含非法字符
 * @param {string} page - 页面路径（例如 '/about'、'about' 或 '/'）
 * @returns {string} 规范化后的页面路径（例如 '/about' 或 '/index'）
 * @throws {Error} 如果路径包含非法字符（如 '../'），抛出错误
 */
function normalizePagePath(page) {
  // 如果路径是根路径 '/'，转换为 '/index'
  if (page === '/') {
    page = '/index';
  }

  // 如果路径不以 '/' 开头，添加前导斜杠
  if (page[0] !== '/') {
    page = `/${page}`;
  }

  // 使用 posix.normalize 规范化路径，移除多余斜杠或非法字符
  const resolvedPage = posix.normalize(page);

  // 如果规范化后的路径与原路径不一致，说明包含非法字符，抛出错误
  if (page !== resolvedPage) {
    throw new Error('Requested and resolved page mismatch');
  }

  // 返回规范化后的路径
  return page;
}

// 导出对象，支持 CommonJS 和 ES Module 的解构赋值
module.exports = { normalizePagePath };


/*
引入函数:
CommonJS: 
const { normalizePagePath } = require('./normalize-page-path');
console.log(normalizePagePath('about')); // '/about'
console.log(normalizePagePath('/')); // '/index'

ES Module:

import { normalizePagePath } from './normalize-page-path';
console.log(normalizePagePath('about')); // '/about'
console.log(normalizePagePath('/')); // '/index'




功能一致性:
功能: 规范化页面路径，确保以 / 开头，根路径转为 /index，并检查非法字符（如 ../）。

逻辑:
根路径 / -> /index

非 / 开头（如 about） -> /about

非法路径（如 /a/../b） -> 抛出错误

示例:
javascript

const normalizePagePath = require('./normalize-page-path'); // 错误:错误:错误: normalizePagePath is an object
const { normalizePagePath } = require('./normalize-page-path');// 需改为解构
console.log(normalizePagePath('/')); // '/index'
console.log(normalizePagePath('about')); // '/about'
normalizePagePath('/a/../b'); // 抛出 Error: Requested and resolved page mismatch

/**** */