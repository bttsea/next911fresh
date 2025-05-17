
'use strict';

// 引入 Node.js 内置模块和第三方模块
///===  const { generateETag } = require('etag');
////=== const { fresh } = require('fresh');
// 引入项目内部模块
const { isResSent } = require('../lib/utils');
const crypto = require('crypto');
const { Stats } = require('fs');

const toString = Object.prototype.toString;


///===-------------------------------------------------------------------------------------------------
///===-------------------------------------------------------------------------------------------------
///===-------------------------------------------------------------------------------------------------
/**
 * 判断对象是否是 fs.Stats 对象（文件元数据）
 * @param {object} obj 
 * @returns {boolean}
 */
function isStats(obj) {
  if (typeof Stats === 'function' && obj instanceof Stats) {
    return true;
  }

  return obj && typeof obj === 'object' &&
    'ctime' in obj && toString.call(obj.ctime) === '[object Date]' &&
    'mtime' in obj && toString.call(obj.mtime) === '[object Date]' &&
    typeof obj.ino === 'number' &&
    typeof obj.size === 'number';
}

/**
 * 为字符串或 Buffer 创建强 ETag
 * @param {Buffer|string} entity 
 * @returns {string}
 */
function entityTag(entity) {
  if (entity.length === 0) {
    return '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"'; // 空内容固定 ETag
  }

  const hash = crypto
    .createHash('sha1')
    .update(entity, 'utf8')
    .digest('base64')
    .substring(0, 27);

  const len = typeof entity === 'string'
    ? Buffer.byteLength(entity, 'utf8')
    : entity.length;

  return `"${len.toString(16)}-${hash}"`;
}

/**
 * 为 fs.Stats 创建 ETag
 * @param {Stats} stat 
 * @returns {string}
 */
function statTag(stat) {
  const mtime = stat.mtime.getTime().toString(16);
  const size = stat.size.toString(16);
  return `"${size}-${mtime}"`;
}

/**
 * 通用 ETag 生成函数
 * @param {Buffer|string|Stats} entity 
 * @param {object} [options] 
 * @param {boolean} [options.weak] 
 * @returns {string}
 */
function generateETag(entity, options) {
  if (entity == null) {
    throw new TypeError('argument entity is required');
  }

  const isStat = isStats(entity);
  const weak = options && typeof options.weak === 'boolean'
    ? options.weak
    : isStat;

  if (!isStat && typeof entity !== 'string' && !Buffer.isBuffer(entity)) {
    throw new TypeError('argument entity must be string, Buffer, or fs.Stats');
  }

  const tag = isStat ? statTag(entity) : entityTag(entity);
  return weak ? 'W/' + tag : tag;
} ;


/*
用法示例：
const generateETag = require('./etag');

const tag1 = generateETag('hello world');  // 强 ETag
const tag2 = generateETag(Buffer.from('data'), { weak: true }); // 弱 ETag
const stat = require('fs').statSync('./file.txt');
const tag3 = generateETag(stat); // 根据文件生成 ETag

console.log(tag1, tag2, tag3);
/**** */


 


///===-------------------------------------------------------------------------------------------------
///===-------------------------------------------------------------------------------------------------
///===-------------------------------------------------------------------------------------------------
/*! * fresh * Copyright(c) 2012 TJ Holowaychuk * Copyright(c) 2016-2017 Douglas Christopher Wilson */
// RegExp to check for no-cache token in Cache-Control
const CACHE_CONTROL_NO_CACHE_REGEXP = /(?:^|,)\s*?no-cache\s*?(?:,|$)/

 
function fresh(reqHeaders, resHeaders)   {
  const modifiedSince = reqHeaders['if-modified-since']
  const noneMatch = reqHeaders['if-none-match']

  if (!modifiedSince && !noneMatch) return false

  const cacheControl = reqHeaders['cache-control']
  if (cacheControl && CACHE_CONTROL_NO_CACHE_REGEXP.test(cacheControl)) {
    return false
  }

  if (noneMatch) {
    if (noneMatch === '*') return true

    const etag = resHeaders.etag
    if (!etag) return false

    const matches = parseTokenList(noneMatch)
    return matches.some(match =>
      match === etag || match === `W/${etag}` || `W/${match}` === etag
    )
  }

  if (modifiedSince) {
    const lastModified = resHeaders['last-modified']
    const modifiedStale = !lastModified || !(parseHttpDate(lastModified) <= parseHttpDate(modifiedSince))
    if (modifiedStale) return false
  }

  return true
}

const parseHttpDate = (date) => {
  const timestamp = date && Date.parse(date)
  return typeof timestamp === 'number' ? timestamp : NaN
}

const parseTokenList = (str) => {
  const list = []
  let start = 0
  let end = 0

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code === 0x20) { // space
      if (start === end) start = end = i + 1
    } else if (code === 0x2c) { // comma
      list.push(str.substring(start, end))
      start = end = i + 1
    } else {
      end = i + 1
    }
  }

  list.push(str.substring(start, end))
  return list
}
 



///===-------------------------------------------------------------------------------------------------
///===-------------------------------------------------------------------------------------------------
///===-------------------------------------------------------------------------------------------------
///===-------------------------------------------------------------------------------------------------
/**
 * 发送 HTML 响应到客户端
 * @param {Object} req - HTTP 请求对象
 * @param {Object} res - HTTP 响应对象
 * @param {string} html - 要发送的 HTML 内容
 * @param {Object} options - 配置选项
 * @param {boolean} options.generateEtags - 是否生成 ETag 头部
 * @param {boolean} options.poweredByHeader - 是否设置 X-Powered-By 头部
 */
function sendHTML(req, res, html, { generateEtags, poweredByHeader }) {
  // 如果响应已发送，直接返回
  if (isResSent(res)) return;

  // 根据配置生成 ETag
  const etag = generateEtags ? generateETag(html) : undefined;

  // 设置 X-Powered-By 头部（如果启用）
  if (poweredByHeader) {
    res.setHeader('X-Powered-By', 'Next.js');
  }

  // 检查请求是否新鲜（基于 ETag 和 If-None-Match），如果是，返回 304
  if (fresh(req.headers, { etag })) {
    res.statusCode = 304;
    res.end();
    return;
  }

  // 设置 ETag 头部（如果生成）
  if (etag) {
    res.setHeader('ETag', etag);
  }

  // 如果未设置 Content-Type，默认为 text/html
  if (!res.getHeader('Content-Type')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
  }

  // 设置 Content-Length 头部
  res.setHeader('Content-Length', Buffer.byteLength(html));

  // 根据请求方法发送响应（HEAD 请求不发送内容）
  res.end(req.method === 'HEAD' ? null : html);
}

// 导出函数，支持 CommonJS 和 ES Module
module.exports = { sendHTML };




/*
功能：发送 HTML 响应到客户端，处理 HTTP 缓存（ETag、304）、设置响应头（Content-Type、Content-Length、X-Powered-By）。
保留发送 HTML 逻辑：检查响应状态、生成 ETag、处理 304 缓存、设置响应头、发送内容。
确保与 etag, fresh, isResSent 无冲突。



示例 1：普通请求
请求：GET http://localhost:3000/about

HTML 内容：
<html><body><div>About Page</div><script>window.__NEXT_DATA__ = {"page": "/about"}</script><script src="/_next/static/development/pages/about.js"></script></body></html>

执行：
on-demand-entry-handler.js 编译 pages/about.jsx。

get-page-files.js 获取脚本 [static/development/pages/about.js]。

_document.js 渲染 HTML，htmlescape.js 转义 __NEXT_DATA__。

send-html.js 发送响应：
生成 ETag（如 "123456789"）。

设置头：

Content-Type: text/html; charset=utf-8
Content-Length: <length>
ETag: "123456789"
X-Powered-By: Next.js

发送 HTML 内容。

响应头：

HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: <length>
ETag: "123456789"
X-Powered-By: Next.js




示例 2：缓存命中（304）    缓存命中（304）   缓存命中（304）   缓存命中（304）
请求：GET http://localhost:3000/about
请求头：If-None-Match: "123456789"
执行：
send-html.js 调用 fresh(req.headers, { etag })，检测缓存命中。
返回 304 状态，不发送 HTML。
响应头：
HTTP/1.1 304 Not Modified
ETag: "123456789"
X-Powered-By: Next.js



/**** */

