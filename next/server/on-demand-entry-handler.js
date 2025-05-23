/**
 * @copyright (c) 2017-present Next.js contributors
 * MIT License
 * 按需编译处理器，管理 Webpack 动态入口和页面编译
 * 基于 https://github.com/vercel/next.js 修改，适配 Next.js 服务端渲染
 */

// 引入模块
import { EventEmitter } from 'events';
import { join, posix } from 'path';
import { stringify } from 'querystring';
import { parse } from 'url';
import webpack from 'webpack';
import WebpackDevMiddleware from 'webpack-dev-middleware';
import DynamicEntryPlugin from 'webpack/lib/DynamicEntryPlugin';

// 内部模块
const { isWriteable } = require('../build/is-writeable');
const Log = require('../build/output/log');
 
const { API_ROUTE } = require('../lib/constants');
const {  IS_BUNDLED_PAGE_REGEX, ROUTE_NAME_REGEX } = require('../next-server/lib/constants');
const { normalizePagePath } = require('../next-server/server/normalize-page-path');
const { findPageFile } = require('./lib/find-page-file');
const { pageNotFoundError } = require('../next-server/server/requirepage');

 




// 页面编译状态
const ADDED = Symbol('added'); // 已添加
const BUILDING = Symbol('building'); // 正在编译
const BUILT = Symbol('built'); // 已编译

// /**
//  * 创建页面未找到的错误
//  * @param {string} page - 页面路径（例如 '/about'）
//  * @returns {Error} 包含错误信息的 Error 对象，带有 ENOENT 错误码
//  */
// function pageNotFoundError(page) {
//   const err = new Error(`Cannot find module for page: ${page}`);
//   err.code = 'ENOENT';
//   return err;
// }

/**
 * 添加 Webpack 动态入口
 * @param {Object} compilation - Webpack 编译对象
 * @param {string} context - 编译上下文路径
 * @param {string} name - 入口名称
 * @param {string[]} entry - 入口文件路径数组
 * @returns {Promise} 编译完成的 Promise
 */
function addEntry(compilation, context, name, entry) {
  return new Promise((resolve, reject) => {
    const dep = DynamicEntryPlugin.createDependency(entry, name);
    compilation.addEntry(context, dep, name, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

/**
 * 按需编译处理器
 * @param {Object} devMiddleware - WebpackDevMiddleware 实例
 * @param {Object} multiCompiler - Webpack 多编译器实例
 * @param {Object} options - 配置选项
 * @param {string} options.buildId - 构建 ID
 * @param {string} options.pagesDir - 页面目录路径
 * @param {Function} options.reload - 重载函数
 * @param {string[]} options.pageExtensions - 页面文件扩展名
 * @param {number} options.maxInactiveAge - 非活跃页面最大存活时间（毫秒）
 * @param {number} options.pagesBufferLength - 最近访问页面缓冲长度
 * @returns {Object} 包含 ensurePage, middleware, waitUntilReloaded 方法的对象
 */
function onDemandEntryHandler(devMiddleware, multiCompiler, {
  buildId,
  pagesDir,
  reload,
  pageExtensions,
  maxInactiveAge,
  pagesBufferLength,
}) {
  const { compilers } = multiCompiler;
  const invalidator = new Invalidator(devMiddleware, multiCompiler);
  let entries = {};
  let lastAccessPages = [''];
  let doneCallbacks = new EventEmitter();
  let reloading = false;
  let stopped = false;
  let reloadCallbacks = new EventEmitter();
  let lastEntry = null;

  // 为每个编译器添加 make 钩子，处理动态入口
  for (const compiler of compilers) {
    compiler.hooks.make.tapPromise('NextJsOnDemandEntries', async (compilation) => {
      invalidator.startBuilding();

      const allEntries = Object.keys(entries).map(async (page) => {
        if (compiler.name === 'client' && page.match(API_ROUTE)) {
          return;
        }
        const { name, absolutePagePath } = entries[page];
        const pageExists = await isWriteable(absolutePagePath);
        if (!pageExists) {
          Log.event(`页面已移除: ${page}`);
          delete entries[page];
          return;
        }

        entries[page].status = BUILDING;
        return addEntry(compilation, compiler.context, name, [
          compiler.name === 'client'
            ? `next-client-pages-loader?${stringify({ page, absolutePagePath })}!`
            : absolutePagePath,
        ]);
      });

      return Promise.all(allEntries).catch((err) => console.error(err));
    });
  }

  /**
   * 查找硬失败的页面（编译失败且无法恢复）
   * @param {Object[]} errors - Webpack 错误数组
   * @returns {string[]} 失败页面路径数组
   */
  function findHardFailedPages(errors) {
    return errors
      .filter((e) => {
        const hasNoModuleFoundError = /ENOENT/.test(e.message) || /Module not found/.test(e.message);
        if (!hasNoModuleFoundError) return false;
        if (IS_BUNDLED_PAGE_REGEX.test(e.module.name)) return true;
        return e.module.dependencies.length === 0;
      })
      .map((e) => e.module.chunks)
      .reduce((a, b) => [...a, ...b], [])
      .map((c) => {
        const pageName = ROUTE_NAME_REGEX.exec(c.name)[1];
        return normalizePage(`/${pageName}`);
      });
  }

  /**
   * 从入口点获取页面路径
   * @param {Map} entrypoints - Webpack 入口点 Map
   * @returns {string[]} 页面路径数组
   */
  function getPagePathsFromEntrypoints(entrypoints) {
    const pagePaths = [];
    for (const [, entrypoint] of entrypoints.entries()) {
      const result = ROUTE_NAME_REGEX.exec(entrypoint.name);
      if (!result) continue;
      const pagePath = result[1];
      if (pagePath) pagePaths.push(pagePath);
    }
    return pagePaths;
  }

  // 处理编译完成钩子
  multiCompiler.hooks.done.tap('NextJsOnDemandEntries', (multiStats) => {
    const [clientStats, serverStats] = multiStats.stats;
    const hardFailedPages = [
      ...new Set([
        ...findHardFailedPages(clientStats.compilation.errors),
        ...findHardFailedPages(serverStats.compilation.errors),
      ]),
    ];
    const pagePaths = new Set([
      ...getPagePathsFromEntrypoints(clientStats.compilation.entrypoints),
      ...getPagePathsFromEntrypoints(serverStats.compilation.entrypoints),
    ]);

    for (const pagePath of pagePaths) {
      const page = normalizePage('/' + pagePath);
      const entry = entries[page];
      if (!entry || entry.status !== BUILDING) continue;

      entry.status = BUILT;
      entry.lastActiveTime = Date.now();
      doneCallbacks.emit(page);
    }

    invalidator.doneBuilding();

    if (hardFailedPages.length > 0 && !reloading) {
      console.log(`> 因页面状态不一致重载 Webpack: ${hardFailedPages.join(', ')}`);
      reloading = true;
      reload()
        .then(() => {
          console.log('> Webpack 重载完成');
          reloadCallbacks.emit('done');
          stop();
        })
        .catch((err) => {
          console.error(`> Webpack 重载失败: ${err.message}`);
          console.error(err.stack);
          process.exit(1);
        });
    }
  });

  // 定时清理非活跃页面
  const disposeHandler = setInterval(() => {
    if (stopped) return;
    disposeInactiveEntries(devMiddleware, entries, lastAccessPages, maxInactiveAge);
  }, 5000);
  disposeHandler.unref();

  /**
   * 停止清理和事件监听
   */
  function stop() {
    clearInterval(disposeHandler);
    stopped = true;
    doneCallbacks = null;
    reloadCallbacks = null;
  }

  /**
   * 处理客户端 ping 请求
   * @param {string} pg - 页面路径
   * @returns {Object|undefined} 响应数据（{ invalid: true } 或 { success: true }）
   */
  function handlePing(pg) {
    const page = normalizePage(pg);
    const entryInfo = entries[page];
    let toSend;

    if (!entryInfo) {
      if (page !== lastEntry) {
        Log.event(`客户端 ping，但无页面条目: ${page}`);
      }
      lastEntry = page;
      return { invalid: true };
    }

    if (page === '/_error') {
      toSend = { invalid: true };
    } else {
      toSend = { success: true };
    }

    if (entryInfo.status !== BUILT) return;

    if (!lastAccessPages.includes(page)) {
      lastAccessPages.unshift(page);
      if (lastAccessPages.length > pagesBufferLength) {
        lastAccessPages.pop();
      }
    }
    entryInfo.lastActiveTime = Date.now();
    return toSend;
  }

  return {
    /**
     * 等待 Webpack 重载完成
     * @returns {Promise<boolean>} 重载完成返回 true
     */
    waitUntilReloaded() {
      if (!reloading) return Promise.resolve(true);
      return new Promise((resolve) => {
        reloadCallbacks.once('done', () => resolve());
      });
    },

    /**
     * 确保页面已编译
     * @param {string} page - 页面路径
     * @returns {Promise} 页面编译完成的 Promise
     */
    async ensurePage(page) {
      await this.waitUntilReloaded();
      let normalizedPagePath;
      try {
        normalizedPagePath = normalizePagePath(page);
      } catch (err) {
        console.error(err);
        throw pageNotFoundError(page);
      }

      let pagePath = await findPageFile(pagesDir, normalizedPagePath, pageExtensions);

      if (page === '/_error' && pagePath === null) {
        pagePath = 'next/dist/pages/_error';
      }

      if (pagePath === null) {
        throw pageNotFoundError(normalizedPagePath);
      }

      let pageUrl = `/${pagePath
        .replace(new RegExp(`\\.+(?:${pageExtensions.join('|')})$`), '')
        .replace(/\\/g, '/')}`
        .replace(/\/index$/, '');
      pageUrl = pageUrl === '' ? '/' : pageUrl;
      const bundleFile = pageUrl === '/' ? '/index.js' : `${pageUrl}.js`;
      const name = join('static', buildId, 'pages', bundleFile);

      




      const absolutePagePath = pagePath.startsWith('next/dist/pages')
        ? require.resolve(pagePath)
        : join(pagesDir, pagePath);

console.log('name is ' + name + '; buildId is ' + buildId + '; absolutePagePath is ' + absolutePagePath);


      page = posix.normalize(pageUrl);

      return new Promise((resolve, reject) => {
        const normalizedPage = normalizePage(page);
        const entryInfo = entries[normalizedPage];

        if (entryInfo) {
          if (entryInfo.status === BUILT) {
            resolve();
            return;
          }
          if (entryInfo.status === BUILDING) {
            doneCallbacks.once(normalizedPage, handleCallback);
            return;
          }
        }

        Log.event(`编译页面: ${normalizedPage}`);
        entries[normalizedPage] = { name, absolutePagePath, status: ADDED };
        doneCallbacks.once(normalizedPage, handleCallback);
        invalidator.invalidate();

        function handleCallback(err) {
          if (err) return reject(err);
          resolve();
        }
      });
    },

    /**
     * Webpack HMR 中间件
     * @returns {Function} 中间件函数
     */
    middleware() {
      return (req, res, next) => {
        if (stopped) {
          res.statusCode = 302;
          res.setHeader('Location', req.url);
          res.end('302');
        } else if (reloading) {
          this.waitUntilReloaded().then(() => {
            res.statusCode = 302;
            res.setHeader('Location', req.url);
            res.end('302');
          });
        } else {
          if (!/^\/_next\/webpack-hmr/.test(req.url)) return next();

          const { query } = parse(req.url, true);
          const page = query.page;
          if (!page) return next();

          const runPing = () => {
            const data = handlePing(query.page);
            if (!data) return;
            res.write('data: ' + JSON.stringify(data) + '\n\n');
          };
          const pingInterval = setInterval(() => runPing(), 5000);

          req.on('close', () => {
            clearInterval(pingInterval);
          });
          setImmediate(() => runPing());
          next();
        }
      };
    },
  };
}

/**
 * 清理非活跃页面
 * @param {Object} devMiddleware - WebpackDevMiddleware 实例
 * @param {Object} entries - 页面条目对象
 * @param {string[]} lastAccessPages - 最近访问页面数组
 * @param {number} maxInactiveAge - 非活跃页面最大存活时间（毫秒）
 */
function disposeInactiveEntries(devMiddleware, entries, lastAccessPages, maxInactiveAge) {
  const disposingPages = [];

  Object.keys(entries).forEach((page) => {
    const { lastActiveTime, status } = entries[page];
    if (status !== BUILT) return;
    if (lastAccessPages.includes(page)) return;
    if (Date.now() - lastActiveTime > maxInactiveAge) {
      disposingPages.push(page);
    }
  });

  if (disposingPages.length > 0) {
    disposingPages.forEach((page) => {
      delete entries[page];
    });
    Log.event(`清理非活跃页面: ${disposingPages.join(', ')}`);
    devMiddleware.invalidate();
  }
}

/**
 * 规范化页面路径
 * @param {string} page - 页面路径
 * @returns {string} 规范化后的页面路径
 */
  function  normalizePage(page) {
  const unixPagePath = page.replace(/\\/g, '/');
  if (unixPagePath === '/index' || unixPagePath === '/') {
    return '/';
  }
  return unixPagePath.replace(/\/index$/, '');
}

/**
 * Webpack 失效器，控制编译失效
 */
class Invalidator {
  /**
   * 构造函数
   * @param {Object} devMiddleware - WebpackDevMiddleware 实例
   * @param {Object} multiCompiler - Webpack 多编译器实例
   */
  constructor(devMiddleware, multiCompiler) {
    this.multiCompiler = multiCompiler;
    this.devMiddleware = devMiddleware;
    this.building = false;
    this.rebuildAgain = false;
  }

  /**
   * 触发编译失效
   */
  invalidate() {
    if (this.building) {
      this.rebuildAgain = true;
      return;
    }

    this.building = true;
    for (const compiler of this.multiCompiler.compilers) {
      compiler.hooks.invalid.call();
    }
    this.devMiddleware.invalidate();
  }

  /**
   * 开始编译
   */
  startBuilding() {
    this.building = true;
  }

  /**
   * 编译完成
   */
  doneBuilding() {
    this.building = false;
    if (this.rebuildAgain) {
      this.rebuildAgain = false;
      this.invalidate();
    }
  }
}

// 导出模块，支持 CommonJS 和 ES Module
/// module.exports = onDemandEntryHandler;


module.exports = {
  onDemandEntryHandler,
  normalizePage
};


/*
实现了一个按需编译（on-demand compilation）处理器，用于在开发模式下动态编译页面和 API 路由的 Webpack 入口点（entry points）

保留按需编译逻辑：
动态添加 Webpack 入口（addEntry）。
管理页面状态（entries, ADDED, BUILDING, BUILT）。
处理 HMR 请求（middleware）。
清理不活跃页面（disposeInactiveEntries）。
规范化页面路径（normalizePage）。

保留核心逻辑：
保留按需编译逻辑（addEntry, ensurePage）。
保留 HMR 中间件（middleware）和页面清理（disposeInactiveEntries）。
保留 normalizePage 和 Invalidator 类，确保与 hot-reloader.js 修复兼容。



详细功能
onDemandEntryHandler 函数提供以下功能：
按需编译页面:
动态添加 Webpack 入口点，仅编译用户访问的页面，减少开发模式的构建时间。
示例：访问 /about 时，编译 pages/about.js 而不是所有页面。

页面状态管理:
维护页面条目（entries），跟踪状态（ADDED, BUILDING, BUILT）。
示例：entries['/about'] = { name, absolutePagePath, status: BUILT }。

页面失效和清理:
定期清理不活跃的页面（disposeInactiveEntries），释放内存。
示例：超过 maxInactiveAge 的页面被移除。

错误处理:
检测硬失败页面（findHardFailedPages），如缺失模块（ENOENT 或 Module not found）。
触发 Webpack 重载（reload），修复不一致状态。
示例：页面缺失时，日志输出：

> Reloading webpack due to inconsistant state of page(s): /about



在 Next.js 9.1.1 中的作用
开发模式核心:
在 next dev 模式下，next-dev-server（通过 next.js 加载）使用 onDemandEntryHandler 按需编译页面。
示例：访问 http://localhost:3000/about，触发 /about 页面编译。

性能优化:
仅编译活跃页面，减少初次构建时间（，提到性能优化）。
示例：项目有 100 个页面，仅编译访问的 /index 和 /about。

HMR 集成:
处理 /_next/webpack-hmr 请求，支持热更新（，提到 HMR 优化）。
示例：修改 pages/index.js，客户端自动刷新。

错误调试:
与 error-debug.jsx（H:\next911new\next\server\error-debug.jsx）和 error-overlay-middleware.js（H:\next911new\next\server\lib\error-overlay-middleware.js）协作，显示编译错误。
示例：Module not found 错误触发错误叠加层。

与核心模块的协作:
渲染: 与 render.js（可能位于 next/server）和 htmlescape.js（H:\next911new\next\server\htmlescape.js）协作，渲染编译后的页面。
路由: 与 router.js（H:\next911new\next\next-server\server\router.ts）和 path-match.js（H:\next911new\next\next-server\server\lib\path-match.js）协作，处理页面请求。
页面查找: 与 find-page-file.js（H:\next911new\next\server\lib\find-page-file.js）和 recursive-readdir-sync.js（H:\next911new\next\next-server\server\lib\recursive-readdir-sync.js）协作，定位页面文件。
服务器: 与 start-server.js（H:\next911new\next\server\lib\start-server.js）和 next.js（H:\next911new\next\server\next.js）协作，初始化开发服务器。
静态文件和 API: 与 serve-static.js（H:\next911new\next\next-server\server\serve-static.js）和 api-utils.js（H:\next911new\next\next-server\server\api-utils.js）协作，处理静态资源和 API。
事件系统: 与 mitt.js（H:\next911new\next\next-server\server\lib\mitt.js）协作，触发编译事件。
日志: 与 store.js（H:\next911new\next\next-server\server\store.js）和 log.js（H:\next911new\next\next-server\server\log.js）协作，输出 CLI 日志。


/*** */