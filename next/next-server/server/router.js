// 引入 Node.js 内置模块和第三方模块
const { parse: parseUrl } = require('url');
const pathToRegexp = require('path-to-regexp');

/**
 * 解码路径参数
 * @param {string} param - 路径参数值（例如 '123%20test'）
 * @returns {string} 解码后的参数值
 * @throws {Error} 如果解码失败，抛出带有 'DECODE_FAILED' 代码的错误
 */
function decodeParam(param) {
  try {
    return decodeURIComponent(param);
  } catch (_) {
    const err = new Error('failed to decode param');
    err.code = 'DECODE_FAILED';
    throw err;
  }
}

/**
 * 创建路由匹配器，用于匹配路径并提取参数
 * @param {string} path - 路由路径（例如 '/user/:id'）
 * @returns {Function} 匹配函数，接受路径名并返回参数对象或 false
 */
function createPathMatcher(path) {
  // 存储路径中的参数键（例如 ':id'）
  const keys = [];
  // 将路径转换为正则表达式，填充 keys 数组
  const regex = pathToRegexp(path, keys, {});

  /**
   * 匹配路径并提取参数
   * @param {string|undefined} pathname - 要匹配的路径名（例如 '/user/123'）
   * @param {Object} [params={}] - 可选的参数对象，用于存储匹配结果
   * @returns {Object|false} 匹配成功返回参数对象，失败返回 false
   */
  return function matchPath(pathname, params = {}) {
    // 如果路径名无效，返回 false
    if (!pathname) return false;

    // 执行正则匹配
    const match = regex.exec(pathname);
    if (!match) return false;

    // 提取路径参数
    const result = { ...params };
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const param = match[i + 1];
      if (!param) continue;

      // 解码参数
      const decoded = decodeParam(param);
      // 处理重复参数（例如 ':id+'）
      result[key.name] = key.repeat ? decoded.split(key.delimiter) : decoded;
    }

    return result;
  };
}

/**
 * 创建路由匹配器实例，用于生成路由匹配函数
 * @param {string} path - 路由路径（例如 '/user/:id'）
 * @returns {Function} 匹配函数，接受路径名并返回参数对象或 false
 */
const route = createPathMatcher;

/**
 * Router 类，管理路由并处理 HTTP 请求的路由匹配
 */
class Router {
  /**
   * 构造函数，初始化路由列表
   * @param {Array} [routes=[]] - 初始路由列表，每个路由包含 match 和 fn
   */
  constructor(routes = []) {
    this.routes = routes;
  }

  /**
   * 添加路由到列表头部
   * @param {Object} route - 路由对象，包含 match 函数和 fn 处理函数
   * @param {Function} route.match - 匹配路径的函数，返回参数对象或 false
   * @param {Function} route.fn - 处理请求的函数，接受 req, res, params, parsedUrl
   */
  add(route) {
    this.routes.unshift(route);
  }

  /**
   * 匹配请求路径并返回处理函数
   * @param {Object} req - HTTP 请求对象
   * @param {Object} res - HTTP 响应对象
   * @param {Object} parsedUrl - 解析后的 URL 对象，包含 pathname
   * @returns {Function|undefined} 匹配成功的处理函数，或 undefined
   */
  match(req, res, parsedUrl) {
    const { pathname } = parsedUrl;
    for (const route of this.routes) {
      const params = route.match(pathname);
      if (params) {
        return () => route.fn(req, res, params, parsedUrl);
      }
    }
  }
}

// 导出 Router 类和 route 函数，支持 CommonJS 和 ES Module
module.exports = { Router, route };


/*
使用方法
保存代码:
保存到 H:\next911fresh\next\next-server\server\router.js。

引入模块:
CommonJS: 

const { Router, route } = require('../server/router');
// 创建路由器
const router = new Router();
// 添加路由
router.add({
  match: route('/user/:id'),
  fn: (req, res, params, parsedUrl) => {
    res.end(`User ID: ${params.id}`);
  },
});
// 测试匹配
const match = route('/post/:id');
console.log(match('/post/123')); // { id: '123' }



ES Module: 

import { Router, route } from '../server/router';
const router = new Router();
router.add({
  match: route('/user/:id'),
  fn: (req, res, params, parsedUrl) => {
    res.end(`User ID: ${params.id}`);
  },
});
const match = route('/post/:id');
console.log(match('/post/123')); // { id: '123' }



/***** */