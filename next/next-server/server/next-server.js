// 引入 Node.js 和第三方模块
const compression = require('compression');
const fs = require('fs');
const { IncomingMessage, ServerResponse } = require('http');
const { join, resolve, sep } = require('path');
const { parse: parseQs } = require('querystring');
const { parse: parseUrl } = require('url');
 
const {
  BUILD_ID_FILE,
  CLIENT_PUBLIC_FILES_PATH,
  CLIENT_STATIC_FILES_PATH,
  CLIENT_STATIC_FILES_RUNTIME,
  PAGES_MANIFEST,
  PHASE_PRODUCTION_SERVER,
  SERVER_DIRECTORY,
  SERVERLESS_DIRECTORY,
} = require('../lib/constants');
const {
  getRouteMatcher,
  getRouteRegex,
  getSortedRoutes,
  isDynamicRoute,
} = require('../lib/router/utils');
const envConfig = require('../lib/runtime-config');
const { isResSent } = require('../lib/utils');
const { apiResolver } = require('./api-utils');
const loadConfig = require('./config').default;
 
const { recursiveReadDirSync } = require('./lib/recursive-readdir-sync');
const { loadComponents } = require('./load-components');
const { renderToHTML } = require('./render');
const { getPagePath } = require('./require');
const Router = require('./router').default;
const { route } = require('./router');
const { sendHTML } = require('./send-html');
const { serveStatic } = require('./serve-static');
const { isBlockedPage, isInternalUrl } = require('./utils');
const { findPagesDir } = require('../../lib/find-pages-dir');
 















/**
 * Next.js 服务器类，处理 HTTP 请求、路由、静态文件和页面渲染
 */
class Server {











  /**
   * 构造函数，初始化服务器配置
   * @param {Object} options - 配置选项
   * @param {string} [options.dir='.'] - 项目根目录
   * @param {boolean} [options.staticMarkup=false] - 是否使用静态标记
   * @param {boolean} [options.quiet=false] - 是否隐藏包含服务器信息的错误消息
   * @param {Object} [options.conf=null] - next.config.js 配置对象
   * @param {boolean} [options.dev=false] - 是否为开发模式
   */
  constructor({
    dir = '.',
    staticMarkup = false,
    quiet = false,
    conf = null,
    dev = false,
  } = {}) {
       this.dir = resolve(dir); // 项目根目录（绝对路径）   
    this.quiet = quiet; // 是否静默模式（隐藏错误详情）   
    const phase = this.currentPhase(); // 加载 Next.js 配置
    this.nextConfig = loadConfig(phase, this.dir, conf);    
    this.distDir = join(this.dir, this.nextConfig.distDir);// 构建输出目录   
    this.publicDir = join(this.dir, CLIENT_PUBLIC_FILES_PATH); // 公共资源目录   
    this.pagesManifest = join( // 页面清单文件路径
      this.distDir,
      this.nextConfig.target === 'server' ? SERVER_DIRECTORY : SERVERLESS_DIRECTORY,
      PAGES_MANIFEST
    );




  
    
    // 获取服务器和公共运行时配置
    // Only serverRuntimeConfig needs the default
    // publicRuntimeConfig gets it's default in client/index.js
    const {
      serverRuntimeConfig = {},
      publicRuntimeConfig,
      assetPrefix,
      generateEtags,
      compress,
    } = this.nextConfig;

    this.buildId = this.readBuildId();// 读取构建 ID

    this.renderOpts = {  // 渲染选项
      ampBindInitData: this.nextConfig.experimental.ampBindInitData, // AMP 数据绑定
      poweredByHeader: this.nextConfig.poweredByHeader, // 是否添加 Powered By 头
      canonicalBase: this.nextConfig.amp.canonicalBase, // AMP 规范化基础路径
      documentMiddlewareEnabled: this.nextConfig.experimental.documentMiddleware, // 文档中间件
      hasCssMode: this.nextConfig.experimental.css, // CSS 模式
      staticMarkup, // 静态标记
      buildId: this.buildId, // 构建 ID
      generateEtags, // 生成 ETag
    };

    // 设置公共运行时配置（客户端可见）
    // // Only the `publicRuntimeConfig` key is exposed to the client side    // It'll be rendered as part of __NEXT_DATA__ on the client side
    if (Object.keys(publicRuntimeConfig).length > 0) {
      this.renderOpts.runtimeConfig = publicRuntimeConfig;
    }

    // 初始化压缩中间件（仅限 server 模式）
    if (compress && this.nextConfig.target === 'server') {
      this.compression = compression();
    }

    // 设置环境配置// Initialize next/config with the environment configuration
    envConfig.setConfig({
      serverRuntimeConfig,
      publicRuntimeConfig,
    });

    // 生成路由并初始化路由器
    const routes = this.generateRoutes();
    this.router = new Router(routes);   
    this.setAssetPrefix(assetPrefix); // 设置资源前缀

 
  }

  /**   * 获取当前运行阶段
   *    * @returns {string} 运行阶段（生产服务器）   */
  currentPhase() {
    return PHASE_PRODUCTION_SERVER;
  }
  /**   * 记录错误日志（静默模式下忽略）   * @param {...any} args - 错误信息   */
  logError(...args) {
    if (this.quiet) return;
    console.error(...args);
  }

  /**   * 处理 HTTP 请求
   * @param {IncomingMessage} req - HTTP 请求对象
   * @param {ServerResponse} res - HTTP 响应对象
   * @param {Object} [parsedUrl] - 解析后的 URL 对象
   * @returns {Promise<void>} 处理结果   */
  async handleRequest(req, res, parsedUrl) {
    // 如果未提供 parsedUrl，解析请求 URL
    if (!parsedUrl || typeof parsedUrl !== 'object') {
      const url = req.url;
      parsedUrl = parseUrl(url, true);
    }

    // 解析查询字符串
    if (typeof parsedUrl.query === 'string') {
      parsedUrl.query = parseQs(parsedUrl.query);
    }
   
    res.statusCode = 200; // 设置默认状态码
    try {
      await this.run(req, res, parsedUrl);
    } catch (err) {
      this.logError(err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }

  /**   * 获取请求处理函数
   * @returns {Function} 请求处理函数   */
  getRequestHandler() {
    return this.handleRequest.bind(this);
  }

  /**   * 设置资源前缀
   * @param {string} [prefix] - 资源前缀   */
  setAssetPrefix(prefix) {
    this.renderOpts.assetPrefix = prefix ? prefix.replace(/\/$/, '') : '';
  }

  /**   * 准备服务器（向后兼容）   * @returns {Promise<void>}
   */
  async prepare() {}

  /**   * 关闭服务器（向后兼容）   * @returns {Promise<void>}   */
  async close() {}

  /**   * 设置不可变资源缓存控制头
   * @param {ServerResponse} res - HTTP 响应对象   */
  setImmutableAssetCacheControl(res) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }

  /**
   * 生成路由规则
   * @returns {Array} 路由规则数组
   */
  generateRoutes() {
    // 公共文件路由（如果 public 目录存在）
    const publicRoutes = fs.existsSync(this.publicDir) ? this.generatePublicRoutes() : [];

    const routes = [
      {
        match: route('/_next/static/:path*'),
        fn: async (req, res, params, parsedUrl) => {
          // 处理静态资源（/_next/static）
          // The commons folder holds commonschunk files
          // The chunks folder holds dynamic entries
          // The buildId folder holds pages and potentially other assets. As buildId changes per build it can be long-term cached.
          // make sure to 404 for /_next/static itself
          if (!params.path) return this.render404(req, res, parsedUrl);

          // 设置不可变缓存
          if (
            params.path[0] === CLIENT_STATIC_FILES_RUNTIME ||
            params.path[0] === 'chunks' ||
            params.path[0] === this.buildId
          ) {
            this.setImmutableAssetCacheControl(res);
          }
          const p = join(this.distDir, CLIENT_STATIC_FILES_PATH, ...(params.path || []));
          await this.serveStatic(req, res, p, parsedUrl);
        },
      },
      {
        match: route('/_next/data/:path*'),
        fn: async (req, res, params, parsedUrl) => {
          // 处理数据请求（/_next/data）// Make sure to 404 for /_next/data/ itself
          if (!params.path) return this.render404(req, res, parsedUrl);
          // TODO: force `.json` to be present
          const pathname = `/${params.path.join('/')}`.replace(/\.json$/, '');
          req.url = pathname;
          const newParsedUrl = parseUrl(pathname, true);
          await this.render(req, res, pathname, { _nextSprData: '1' }, newParsedUrl);
        },
      },
      {
        match: route('/_next/:path*'),
          // This path is needed because `render()` does a check for `/_next` and the calls the routing again
        fn: async (req, res, _params, parsedUrl) => {
          // 处理无效的 /_next 请求
          await this.render404(req, res, parsedUrl);
        },
      },
      ...publicRoutes,
      {
        match: route('/static/:path*'),
        fn: async (req, res, params, parsedUrl) => {
          // 处理静态文件（/static）
          const p = join(this.dir, 'static', ...(params.path || []));
          await this.serveStatic(req, res, p, parsedUrl);
        },
      },
      {
        match: route('/api/:path*'),
        fn: async (req, res, params, parsedUrl) => {
          // 处理 API 请求（/api）
          const { pathname } = parsedUrl;
          await this.handleApiRequest(req, res, pathname);
        },
      },
    ];

    // 添加动态路由
    if (this.nextConfig.useFileSystemPublicRoutes) {
      this.dynamicRoutes = this.getDynamicRoutes();
            // It's very important to keep this route's param optional.
      // (but it should support as many params as needed, separated by '/')
      // Otherwise this will lead to a pretty simple DOS attack.
      // See more: https://github.com/zeit/next.js/issues/2617
      routes.push({
        match: route('/:path*'),
        fn: async (req, res, _params, parsedUrl) => {
          const { pathname, query } = parsedUrl;
          if (!pathname) {
            throw new Error('pathname is undefined');
          }
          await this.render(req, res, pathname, query, parsedUrl);
        },
      });
    }

    return routes;
  }
















  /**
   * 处理 API 请求
   * @param {IncomingMessage} req - HTTP 请求对象
   * @param {ServerResponse} res - HTTP 响应对象
   * @param {string} pathname - 请求路径
   * @returns {Promise<void>}
   */
  async handleApiRequest(req, res, pathname) {
    let params = false;
    let resolverFunction;

    try {
      resolverFunction = await this.resolveApiRequest(pathname);
    } catch (err) {}

    if (this.dynamicRoutes && this.dynamicRoutes.length > 0 && !resolverFunction) {
      for (const dynamicRoute of this.dynamicRoutes) {
        params = dynamicRoute.match(pathname);
        if (params) {
          resolverFunction = await this.resolveApiRequest(dynamicRoute.page);
          break;
        }
      }
    }

    if (!resolverFunction) {
      return this.render404(req, res);
    }


    





    await apiResolver(req, res, params, resolverFunction ? require(resolverFunction) : undefined);
  }












  /**
   * 解析 API 请求路径到处理函数
   * @param {string} pathname - 请求路径
   * @returns {Promise<string|null>} 处理函数路径
   */
  async resolveApiRequest(pathname) {
    return getPagePath(pathname, this.distDir, false, this.renderOpts.dev);
  }

  /**   * 生成公共文件路由
   * @returns {Array} 公共文件路由数组   */
  generatePublicRoutes() {
    const routes = [];
    const publicFiles = recursiveReadDirSync(this.publicDir);
    const serverBuildPath = join(
      this.distDir,
      SERVER_DIRECTORY
    );
    const pagesManifest = require(join(serverBuildPath, PAGES_MANIFEST));

    publicFiles.forEach((path) => {
      const unixPath = path.replace(/\\/g, '/');
      // 仅包含不与页面路径冲突的公共文件
      if (!pagesManifest[unixPath]) {
        routes.push({
          match: route(unixPath),
          fn: async (req, res, _params, parsedUrl) => {
            const p = join(this.publicDir, unixPath);
            await this.serveStatic(req, res, p, parsedUrl);
          },
        });
      }
    });

    return routes;
  }

  /**   * 获取动态路由   *    * @returns {Array} 动态路由数组   */
  getDynamicRoutes() {
    const manifest = require(this.pagesManifest);
    const dynamicRoutedPages = Object.keys(manifest).filter(isDynamicRoute);
    return getSortedRoutes(dynamicRoutedPages).map((page) => ({
      page,
      match: getRouteMatcher(getRouteRegex(page)),
    }));
  }

  /**   * 处理压缩中间件
   * @param {IncomingMessage} req - HTTP 请求对象
   * @param {ServerResponse} res - HTTP 响应对象   */
  handleCompression(req, res) {
    if (this.compression) {
      this.compression(req, res, () => {});
    }
  }

  /**   * 执行路由匹配和处理
   * @param {IncomingMessage} req - HTTP 请求对象
   * @param {ServerResponse} res - HTTP 响应对象
   * @param {Object} parsedUrl - 解析后的 URL 对象
   * @returns {Promise<void>}   */
  async run(req, res, parsedUrl) {
    this.handleCompression(req, res);

    try {
      const fn = this.router.match(req, res, parsedUrl);
      if (fn) {
        await fn();
        return;
      }
    } catch (err) {
      if (err.code === 'DECODE_FAILED') {
        res.statusCode = 400;
        return this.renderError(null, req, res, '/_error', {});
      }
      throw err;
    }

    await this.render404(req, res, parsedUrl);
  }
  
  /**
   * 发送 HTML 响应
   * @param {IncomingMessage} req - HTTP 请求对象
   * @param {ServerResponse} res - HTTP 响应对象
   * @param {string} html - HTML 内容
   * @returns {Promise<void>}
   */
  async sendHTML(req, res, html) {
    const { generateEtags, poweredByHeader } = this.renderOpts;
    return sendHTML(req, res, html, { generateEtags, poweredByHeader });
  }

  /**
   * 渲染页面到 HTML
   * @param {IncomingMessage} req - HTTP 请求对象
   * @param {ServerResponse} res - HTTP 响应对象
   * @param {string} pathname - 页面路径
   * @param {Object} [query={}] - 查询参数
   * @param {Object} [parsedUrl] - 解析后的 URL 对象
   * @returns {Promise<void>}
   */
  async render(req, res, pathname, query = {}, parsedUrl) {
    const url = req.url;
    if (isInternalUrl(url)) {
      return this.handleRequest(req, res, parsedUrl);
    }

    if (isBlockedPage(pathname)) {
      return this.render404(req, res, parsedUrl);
    }

    const html = await this.renderToHTML(req, res, pathname, query, {
      dataOnly:
        (this.renderOpts.ampBindInitData && Boolean(query.dataOnly)) ||
        (req.headers &&
          (req.headers.accept || '').indexOf('application/amp.bind+json') !== -1),
    });

    if (html === null) {
      return;
    }

    return this.sendHTML(req, res, html);
  }

  /**
   * 查找页面组件
   * @param {string} pathname - 页面路径
   * @param {Object} [query={}] - 查询参数
   * @returns {Promise<Object>} 页面组件对象
   */
  async findPageComponents(pathname, query = {}) {

    





    return await loadComponents(this.distDir, this.buildId, pathname, false);
  }


  /**
   * 发送响应数据
   * @param {ServerResponse} res - HTTP 响应对象
   * @param {any} payload - 响应数据
   * @param {string} type - 内容类型
   * @param {number|false} [revalidate] - 重新验证时间（秒）
   */
  __sendPayload(res, payload, type, revalidate) {
    res.setHeader('Content-Type', type);
    res.setHeader('Content-Length', Buffer.byteLength(payload));

    if (revalidate) {
      res.setHeader('Cache-Control', `s-maxage=${revalidate}, stale-while-revalidate`);
    }
    res.end(payload);
  }

  /**
   * 使用组件渲染到 HTML
   * @param {IncomingMessage} req - HTTP 请求对象
   * @param {ServerResponse} res - HTTP 响应对象
   * @param {string} pathname - 页面路径
   * @param {Object} [query={}] - 查询参数
   * @param {Object} result - 页面组件对象
   * @param {Object} opts - 渲染选项
   * @returns {Promise<string|null>} 渲染结果
   */
  async renderToHTMLWithComponents(req, res, pathname, query = {}, result, opts) {
    // 处理静态页面
    if (typeof result.Component === 'string') {
      return result.Component;
    }







    // 检查请求状态
    const isLikeServerless =
      typeof result.Component === 'object' && typeof result.Component.renderReqToHTML === 'function';
    const isSpr = !!result.unstable_getStaticProps;
 
      if (isLikeServerless) {
        return result.Component.renderReqToHTML(req, res);
      }
      return renderToHTML(req, res, pathname, query, { ...result, ...opts });
   




    // 处理 SPR 数据请求..............deleted.......deleted.......deleted




 
  }










/**
 * 渲染页面到 HTML（公共接口）
 * @param {Object} req - HTTP 请求对象
 * @param {Object} res - HTTP 响应对象
 * @param {string} pathname - 页面路径
 * @param {Object} [query={}] - 查询参数
 * @param {Object} [options={}] - 渲染选项
 * @param {boolean} [options.amphtml] - 是否为 AMP HTML
 * @param {boolean} [options.hasAmp] - 是否支持 AMP
 * @param {boolean} [options.dataOnly] - 是否仅返回数据
 * @returns {Promise<string|null>} 渲染结果（HTML 字符串或 null）
 */
async renderToHTML(req, res, pathname, query = {}, { amphtml, dataOnly, hasAmp } = {}) {
  try {
    // 尝试渲染页面
    const result = await this.findPageComponents(pathname, query);
    return this.renderToHTMLWithComponents(req, res, pathname, query, result, {
      ...this.renderOpts,
      amphtml,
      hasAmp,
      dataOnly,
    });
  } catch (err) {
    // 处理文件不存在（ENOENT）错误，尝试动态路由
    if (err.code === 'ENOENT' && this.dynamicRoutes) {
      for (const dynamicRoute of this.dynamicRoutes) {
        const params = dynamicRoute.match(pathname);
        if (!params) {
          continue;
        }
        try {
          const result = await this.findPageComponents(dynamicRoute.page, query);
          return this.renderToHTMLWithComponents(
            req,
            res,
            dynamicRoute.page,
            {
              ...(result.unstable_getStaticProps ? { _nextSprData: query._nextSprData } : query),
              ...params,
            },
            result,
            {
              ...this.renderOpts,
              amphtml,
              hasAmp,
              dataOnly,
            }
          );
        } catch (dynamicErr) {
          // 动态路由渲染失败，继续外层错误处理
          throw dynamicErr;
        }
      }
    }

    // 统一错误处理
    if (err && err.code === 'ENOENT') {
      res.statusCode = 404;
      return this.renderErrorToHTML(null, req, res, pathname, query);
    } else {
      this.logError(err);
      res.statusCode = 500;
      return this.renderErrorToHTML(err, req, res, pathname, query);
    }
  }
}














  /**
   * 渲染错误页面
   * @param {Error|null} err - 错误对象
   * @param {IncomingMessage} req - HTTP 请求对象
   * @param {ServerResponse} res - HTTP 响应对象
   * @param {string} pathname - 页面路径
   * @param {Object} [query={}] - 查询参数
   * @returns {Promise<void>}
   */
  async renderError(err, req, res, pathname, query = {}) {
    res.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
    const html = await this.renderErrorToHTML(err, req, res, pathname, query);
    if (html === null) {
      return;
    }
    return this.sendHTML(req, res, html);
  }

  /**   * 渲染错误页面到 HTML
   * @param {Error|null} err - 错误对象
   * @param {IncomingMessage} req - HTTP 请求对象
   * @param {ServerResponse} res - HTTP 响应对象
   * @param {string} pathname - 页面路径
   * @param {Object} [query={}] - 查询参数
   * @returns {Promise<string|null>} 渲染结果
   */
  async renderErrorToHTML(err, req, res, _pathname, query = {}) {
    const result = await this.findPageComponents('/_error', query);
    let html;
    try {
      html = await this.renderToHTMLWithComponents(req, res, '/_error', query, result, {
        ...this.renderOpts,
        err,
      });
    } catch (error) {
      console.error(error);
      res.statusCode = 500;
      html = 'Internal Server Error';
    }
    return html;
  }









  /**
   * 渲染 404 页面
   * @param {IncomingMessage} req - HTTP 请求对象
   * @param {ServerResponse} res - HTTP 响应对象
   * @param {Object} [parsedUrl] - 解析后的 URL 对象
   * @returns {Promise<void>}
   */
  async render404(req, res, parsedUrl) {
    const url = req.url;
    const { pathname, query } = parsedUrl ? parsedUrl : parseUrl(url, true);
    if (!pathname) {
      throw new Error('pathname is undefined');
    }
    res.statusCode = 404;
    return this.renderError(null, req, res, pathname, query);
  }

  /**
   * 提供静态文件
   * @param {IncomingMessage} req - HTTP 请求对象
   * @param {ServerResponse} res - HTTP 响应对象
   * @param {string} path - 文件路径
   * @param {Object} [parsedUrl] - 解析后的 URL 对象
   * @returns {Promise<void>}
   */
  async serveStatic(req, res, path, parsedUrl) {
    if (!this.isServeableUrl(path)) {
      return this.render404(req, res, parsedUrl);
    }

    if (!(req.method === 'GET' || req.method === 'HEAD')) {
      res.statusCode = 405;
      res.setHeader('Allow', ['GET', 'HEAD']);
      return this.renderError(null, req, res, path);
    }

    try {
      await serveStatic(req, res, path);
    } catch (err) {
      if (err.code === 'ENOENT' || err.statusCode === 404) {
        this.render404(req, res, parsedUrl);
      } else if (err.statusCode === 412) {
        res.statusCode = 412;
        return this.renderError(err, req, res, path);
      } else {
        throw err;
      }
    }
  }

  /**   * 检查路径是否可服务
   * @param {string} path - 文件路径
   * @returns {boolean} 是否可服务
   */
  isServeableUrl(path) {
    const resolved = resolve(path);
    if (
      resolved.indexOf(join(this.distDir) + sep) !== 0 &&
      resolved.indexOf(join(this.dir, 'static') + sep) !== 0 &&
      resolved.indexOf(join(this.dir, 'public') + sep) !== 0
    ) {
      return false;// Seems like the user is trying to traverse the filesystem.
    }
    return true;
  }

  /**
   * 读取构建 ID
   * @returns {string} 构建 ID
   */
  readBuildId() {
    const buildIdFile = join(this.distDir, BUILD_ID_FILE);
    try {
      return fs.readFileSync(buildIdFile, 'utf8').trim();
    } catch (err) {
      if (!fs.existsSync(buildIdFile)) {
        throw new Error(
          `Could not find a valid build in the '${this.distDir}' directory! Try building your app with 'next build' before starting the server.`
        );
      }
      throw err;
    }
  }

 
}

// 导出类，支持 CommonJS 和 ES Module
module.exports = Server;



/*
引入类:
CommonJS: 

const Server = require('./server/old_next-server');
const server = new Server({ dir: '.', dev: true });
const handler = server.getRequestHandler();
require('http').createServer(handler).listen(3000);

ES Module: 

import Server from './server/old_next-server';
const server = new Server({ dir: '.', dev: true });
const handler = server.getRequestHandler();
import { createServer } from 'http';
createServer(handler).listen(3000);

运行时要求:
运行在 Node.js 环境中，无需 JSX 支持，仅需基本 JavaScript 环境。

确保依赖模块（如 ./render.js, ./router.js）已转换为 JavaScript。






示例：
javascript

const Server = require('./server/old_next-server');
const server = new Server({ dir: '.', dev: true });
server.renderToHTML(
  { url: '/home', method: 'GET' },
  { statusCode: 200, setHeader: () => {}, end: () => {} },
  '/home'
).then((html) => console.log(html));

验证功能:
运行 npm run dev，启动服务器，访问 http://localhost:3000/home，检查页面渲染。

测试静态文件：
javascript

server.serveStatic(
  { url: '/static/test.txt', method: 'GET' },
  { statusCode: 200, setHeader: () => {}, end: () => {} },
  join(server.dir, 'static', 'test.txt')
);

测试 API 请求：
javascript

server.handleApiRequest(
  { url: '/api/test', method: 'GET' },
  { statusCode: 200, setHeader: () => {}, end: () => {} },
  '/api/test'
);










Server 类 (old_next-server.js):
constructor: 初始化服务器，设置配置，调用 generateRoutes, initializeSprCache。
handleRequest: 处理 HTTP 请求，调用 run。
run: 执行路由匹配，调用 router.match 或 render404。
render: 渲染页面，调用 renderToHTML。
renderToHTML: 公共渲染接口，调用 findPageComponents, renderToHTMLWithComponents。
renderToHTMLWithComponents: 使用组件渲染，调用 renderToHTML（从 old_render.js）或 Component.renderReqToHTML。
findPageComponents: 加载页面组件，调用 loadComponents。
renderError, renderErrorToHTML: 渲染错误页面，调用 renderToHTMLWithComponents。
render404: 渲染 404 页面，调用 renderError。
serveStatic: 提供静态文件，调用 serveStatic（从 ./serve-static）。
handleApiRequest: 处理 API 请求，调用 resolveApiRequest, apiResolver。
generateRoutes: 生成路由规则，调用 generatePublicRoutes, getDynamicRoutes。
setAssetPrefix, readBuildId, handleCompression: 辅助方法。




old_next-server.js
├── constructor - 初始化服务器
│   ├── generateRoutes - 生成路由规则
│   │   ├── generatePublicRoutes - 生成公共文件路由
│   │   │   └── recursiveReadDirSync (外部) - 递归读取目录
│   │   ├── getDynamicRoutes - 获取动态路由
│   │   │   ├── getRouteMatcher (外部) - 获取路由匹配器
│   │   │   ├── getRouteRegex (外部) - 获取路由正则
│   │   │   └── getSortedRoutes (外部) - 排序路由
│   │   └── route (外部) - 创建路由匹配器
│   ├── loadConfig (外部) - 加载 Next.js 配置
│   └── envConfig.setConfig (外部) - 设置运行时配置

├── handleRequest - 处理 HTTP 请求
│   ├── run - 执行路由匹配
│   │   ├── router.match - 匹配路由
│   │   │   ├── render - 渲染页面
│   │   │   ├── serveStatic - 提供静态文件
│   │   │   ├── handleApiRequest - 处理 API 请求
│   │   │   └── render404 - 渲染 404 页面
│   │   ├── render404 - 渲染 404 页面
│   │   └── handleCompression - 处理压缩
│   │       └── compression (外部) - 压缩响应
│   ├── parseUrl (外部) - 解析 URL
│   └── parseQs (外部) - 解析查询字符串

├── render - 渲染页面
│   ├── renderToHTML - 渲染到 HTML
│   ├── handleRequest - 处理内部 URL
│   ├── render404 - 渲染 404 页面
│   ├── isInternalUrl (外部) - 检查内部 URL
│   ├── isBlockedPage (外部) - 检查禁用页面
│   └── sendHTML - 发送 HTML 响应
│       └── sendHTML (外部) - 发送 HTML

├── renderToHTML - 公共渲染接口
│   ├── findPageComponents - 加载页面组件
│   │   └── loadComponents (外部) - 加载组件
│   ├── renderToHTMLWithComponents - 使用组件渲染
│   │   ├── renderToHTML [old_render.js] - 渲染页面到 HTML
│   │   ├── Component.renderReqToHTML - 无服务器渲染 
│   │   ├── __sendPayload - 发送响应数据
│   │    
│   └── parseUrl (外部) - 解析 URL
├── renderError - 渲染错误页面
│   ├── renderErrorToHTML - 渲染错误到 HTML
│   │   ├── findPageComponents - 加载错误页面组件
│   │   └── renderToHTMLWithComponents - 使用组件渲染
│   └── sendHTML - 发送 HTML 响应
├── render404 - 渲染 404 页面
│   ├── renderError - 渲染错误页面
│   └── parseUrl (外部) - 解析 URL

├── serveStatic - 提供静态文件
│   ├── serveStatic (外部) - 提供静态文件
│   ├── render404 - 渲染 404 页面
│   ├── renderError - 渲染错误页面
│   └── isServeableUrl - 检查可服务路径
├── handleApiRequest - 处理 API 请求
│   ├── resolveApiRequest - 解析 API 请求
│   │   └── getPagePath (外部) - 获取页面路径
│   ├── apiResolver (外部) - 执行 API 解析
│   ├── render404 - 渲染 404 页面
│   └── require (外部) - 加载 API 模块
├── setAssetPrefix - 设置资源前缀
├── readBuildId - 读取构建 ID
│   └── fs.readFileSync (外部) - 读取文件
└── handleCompression - 处理压缩
    └── compression (外部) - 压缩响应

/**** */