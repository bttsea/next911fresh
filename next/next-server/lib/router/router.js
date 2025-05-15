// 禁用 TypeScript 的 tslint 注释，因为我们现在使用纯 JavaScript
// /* global __NEXT_DATA__ */

// 引入必要的依赖模块
const { parse, format } = require('url');
const mitt = require('../mitt'); // 假设 mitt 模块在指定路径
const {
  formatWithValidation,
  getURL,
  loadGetInitialProps,
  SUPPORTS_PERFORMANCE_USER_TIMING,
} = require('../utils'); // 假设 utils 模块在指定路径
const { rewriteUrlForNextExport } = require('./rewrite-url-for-export');
const { getRouteMatcher } = require('./utils/route-matcher');
const { getRouteRegex } = require('./utils/route-regex');
const { isDynamicRoute } = require('./utils/is-dynamic');

// 将路径转换为路由格式，移除末尾的斜杠，如果是空路径则返回 '/'
function toRoute(path) {
  return path.replace(/\/$/, '') || '/';
}

// 定义 Router 类，实现前端路由功能
class Router {
  /**
   * 构造函数，初始化路由器
   * @param {string} pathname - 当前路径名
   * @param {Object} query - 查询参数对象
   * @param {string} as - 显示在浏览器中的路径（别名路径）
   * @param {Object} options - 配置对象，包含初始属性、页面加载器等
   */







  // 静态事件发射器，用于全局路由事件
  static events = mitt();


    constructor(pathname, query, as, options) {
    const {
      subscription,
      initialProps,
      pageLoader,
      Component,
      App,
      wrapApp,
      err,
    } = options;












    // 设置当前路由，格式化为标准路由
    this.route = toRoute(pathname);

    // 初始化组件缓存对象
    this.components = {};

    // 如果不是错误页面，则缓存当前路由的组件和初始属性
    if (pathname !== '/_error') {
      this.components[this.route] = { Component, props: initialProps, err };
    }

    // 缓存应用组件
    this.components['/_app'] = { Component: App };

    // 静态事件发射器，供全局路由事件监听
    this.events = Router.events;

    // 保存页面加载器、路径、查询参数和别名路径
    this.pageLoader = pageLoader;
    this.pathname = pathname;
    this.query = query;
    this.asPath =
      isDynamicRoute(pathname) && __NEXT_DATA__.nextExport ? pathname : as;
    this.sub = subscription;
    this.clc = null; // 组件加载取消函数
    this._wrapApp = wrapApp; 

    // 仅在浏览器环境中执行
    if (typeof window !== 'undefined') {
      // 初始化时注册当前路由状态
      this.changeState(
        'replaceState',
        formatWithValidation({ pathname, query }),
        as
      );

      // 监听浏览器的 popstate 事件，处理前进后退
      window.addEventListener('popstate', this.onPopState.bind(this));

      // 监听页面卸载事件，处理从外部网站返回时的状态
      window.addEventListener('unload', () => {
        if (history.state) {
          const { url, as, options } = history.state;
          this.changeState('replaceState', url, as, {
            ...options,
            fromExternal: true,
          });
        }
      });
    }
  }

  /**   * 静态方法，重写 URL 用于 Next.js 导出
   * @param {string} url - 原始 URL   * @returns {string} - 重写后的 URL   */
  static _rewriteUrlForNextExport(url) {
    return rewriteUrlForNextExport(url);
  }

  /**   * 处理浏览器 popstate 事件
   * @param {PopStateEvent} e - popstate 事件对象   */
  onPopState(e) {
    if (!e.state) {
      // 如果没有状态（老版本浏览器或仅 hash 变化），更新状态
            // We get state as undefined for two reasons.
      //  1. With older safari (< 8) and older chrome (< 34)
      //  2. When the URL changed with #       
      // In the both cases, we don't need to proceed and change the route.
      // (as it's already changed)
      // But we can simply replace the state with the new changes.
      // Actually, for (1) we don't need to nothing. But it's hard to detect that event.
      // So, doing the following for (1) does no harm.
      const { pathname, query } = this;
      this.changeState(
        'replaceState',
        formatWithValidation({ pathname, query }),
        getURL()
      );
      return;
    }

    // 如果是从外部网站返回，忽略  // Make sure we don't re-render on initial load,
    if (e.state.options && e.state.options.fromExternal) {
      return;
    }

    // 如果有 beforePopState 回调且返回 false，交给下游处理
        // If the downstream application returns falsy, return.   They will then be responsible for handling the event.
    if (this._bps && !this._bps(e.state)) {
      return;
    }

    const { url, as, options } = e.state;
    if (process.env.NODE_ENV !== 'production') {
      if (typeof url === 'undefined' || typeof as === 'undefined') {
        console.warn(
          '`popstate` event triggered but `event.state` did not have `url` or `as`'
        );
      }
    }
    this.replace(url, as, options);
  }

  /*   * 更新路由组件
   * @param {string} route - 路由路径  @param {Object} mod - 组件模块   */
  update(route, mod) {
    const Component = mod.default || mod;
    const data = this.components[route];
    if (!data) {
      throw new Error(`Cannot update unavailable route: ${route}`);
    }

    const newData = { ...data, Component };
    this.components[route] = newData;

    if (route === '/_app') {
      this.notify(this.components[this.route]);
      return;
    }

    if (route === this.route) {
      this.notify(newData);
    }
  }

  /**   * 刷新页面   */
  reload() {
    window.location.reload();
  }

  /**   * 回退到上一个历史记录   */
  back() {
    window.history.back();
  }

  /**
   * 使用 pushState 导航到新路由
   * @param {string|Object} url - 目标路径或 URL 对象
   * @param {string|Object} as - 显示路径（可选，默认为 url）
   * @param {Object} options - 导航选项
   * @returns {Promise<boolean>} - 导航是否成功
   */
  push(url, as = url, options = {}) {
    return this.change('pushState', url, as, options);
  }

  /**   * 使用 replaceState 替换当前路由
   * @param {string|Object} url - 目标路径或 URL 对象
   * @param {string|Object} as - 显示路径（可选，默认为 url）
   * @param {Object} options - 导航选项
   * @returns {Promise<boolean>} - 导航是否成功
   */
  replace(url, as = url, options = {}) {
    return this.change('replaceState', url, as, options);
  }

  /**   * 执行路由变更
   * @param {string} method - 历史记录方法（pushState 或 replaceState）
   * @param {string|Object} _url - 目标路径或 URL 对象
   * @param {string|Object} _as - 显示路径
   * @param {Object} options - 导航选项
   * @returns {Promise<boolean>} - 导航是否成功   */
  change(method, _url, _as, options) {
    return new Promise((resolve, reject) => {
      // 标记路由变更开始  // marking route changes as a navigation start entry
      if (SUPPORTS_PERFORMANCE_USER_TIMING) {   performance.mark('routeChange');      }

      // 格式化 URL 和显示路径
      const url = typeof _url === 'object' ? formatWithValidation(_url) : _url;
      let as = typeof _as === 'object' ? formatWithValidation(_as) : _as;

      // 如果配置了导出 trailing slash，处理路径 
      // // Add the ending slash to the paths. So, we can serve the   "<page>/index.html" directly for the SSR page.
      if (process.env.__NEXT_EXPORT_TRAILING_SLASH) {
        if (__NEXT_DATA__.nextExport) {
          as = rewriteUrlForNextExport(as);
        }
      }

      // 取消当前组件加载
      this.abortComponentLoad(as);

      // 如果只是 hash 变化，仅更新状态
      // If the url change is only related to a hash change      // We should not proceed. We should only change the state.
      // WARNING: `_h` is an internal option for handing Next.js client-side
      // hydration. Your app should _never_ use this property. It may change at      // any time without notice.
      if (!options._h && this.onlyAHashChange(as)) {
        this.asPath = as;
        Router.events.emit('hashChangeStart', as);
        this.changeState(method, url, as);
        this.scrollToHash(as);
        Router.events.emit('hashChangeComplete', as);
        return resolve(true);
      }

      const { pathname, query, protocol } = parse(url, true);

      if (!pathname || protocol) {
        if (process.env.NODE_ENV !== 'production') {
          throw new Error(`Invalid href passed to router: ${url}`);
        }
        return resolve(false);
      }

      // 如果路径未变，使用 replaceState
            // If asked to change the current URL we should reload the current page
      // (not location.reload() but reload getInitialProps and other Next.js stuffs)
      // We also need to set the method = replaceState always
      // as this should not go into the history (That's how browsers work)
      // We should compare the new asPath to the current asPath, not the url
      if (!this.urlIsNew(as)) {
        method = 'replaceState';
      }

      const route = toRoute(pathname);
      const { shallow = false } = options;

      // 处理动态路由
      if (isDynamicRoute(route)) {
        const { pathname: asPathname } = parse(as);
        const rr = getRouteRegex(route);
        const routeMatch = getRouteMatcher(rr)(asPathname);
        if (!routeMatch) {
          console.error('The provided `as` value is incompatible with the `href` value.');
          return resolve(false);
        }
        Object.assign(query, routeMatch);
      }

      Router.events.emit('routeChangeStart', as);




      // If shallow is true and the route exists in the router cache we reuse the previous result
      // 获取路由信息
      this.getRouteInfo(route, pathname, query, as, shallow).then(
        (routeInfo) => {
          const { error } = routeInfo;

          if (error && error.cancelled) {
            return resolve(false);
          }

          Router.events.emit('beforeHistoryChange', as);
          this.changeState(method, url, as, options);
        const hash = window.location.hash.substring(1);

          if (process.env.NODE_ENV !== 'production') {
            const appComp = this.components['/_app'].Component;
            window.next.isPrerendered =
              appComp.getInitialProps === appComp.origGetInitialProps &&
              !routeInfo.Component.getInitialProps;
          }

          this.set(route, pathname, query, as, { ...routeInfo , hash }); ///===!!!

          if (error) {
            Router.events.emit('routeChangeError', error, as);
            throw error;
          }

          Router.events.emit('routeChangeComplete', as);
          return resolve(true);
        },  reject );
    });
  }

  /**   * 更新历史记录状态
   * @param {string} method - 历史记录方法
   * @param {string} url - 目标路径
   * @param {string} as - 显示路径
   * @param {Object} options - 选项   */
  changeState(method, url, as, options = {}) {
    if (process.env.NODE_ENV !== 'production') {
      if (typeof window.history === 'undefined') {
        console.error('Warning: window.history is not available.');
        return;
      }
      if (typeof window.history[method] === 'undefined') {
        console.error(`Warning: window.history.${method} is not available`);
        return;
      }
    }

    if (method !== 'pushState' || getURL() !== as) {
      window.history[method]({ url, as, options }, null, as);
    }
  }

  /** * 获取路由信息
   * @param {string} route - 路由路径
   * @param {string} pathname - 路径名
   * @param {Object} query - 查询参数
   * @param {string} as - 显示路径
   * @param {boolean} shallow - 是否浅层路由
   * @returns {Promise<Object>} - 路由信息   */
  getRouteInfo(route, pathname, query, as, shallow = false) {
    const cachedRouteInfo = this.components[route];
    // If there is a shallow route transition possible // If the route is already rendered on the screen.
    if (shallow && cachedRouteInfo && this.route === route) {
      return Promise.resolve(cachedRouteInfo);
    }

    return Promise.resolve()
      .then(() => {
        if (cachedRouteInfo) {
          return cachedRouteInfo;
        }
        ///=== 错误处理：原代码通过 reject 传递错误，转换代码通过 .then 的返回 Promise 链传递错误，.catch 块捕获。
        return this.fetchComponent(route).then((Component) => ({ Component }));
      })
      .then((routeInfo) => {
        const { Component } = routeInfo;

        if (process.env.NODE_ENV !== 'production') {
          const { isValidElementType } = require('react-is');
          if (!isValidElementType(Component)) {
            throw new Error(
              `The default export is not a React Component in page: "${pathname}"`
            );
          }
        }

        return this.getInitialProps(Component, { pathname, query, asPath: as }).then(
          (props) => {
            routeInfo.props = props;
            this.components[route] = routeInfo;
            return routeInfo;
          }
        );
      })
      .catch((err) => {
        if (err.code === 'PAGE_LOAD_ERROR') {
            // If we can't load the page it could be one of following reasons
            //  1. Page doesn't exists
            //  2. Page does exist in a different zone
            //  3. Internal error while loading the page

            // So, doing a hard reload is the proper way to deal with this.
          window.location.href = as;

          // Changing the URL doesn't block executing the current code path.
          // So, we need to mark it as a cancelled error and stop the routing logic.
          err.cancelled = true;

          // TODO: fix the control flow here
          return { error: err };
        }

        if (err.cancelled) {
          return { error: err };
        }

        return this.fetchComponent('/_error').then((Component) => {
          const routeInfo = { Component, err };
          return this.getInitialProps(Component, { err, pathname, query }).then(
            (props) => {
              routeInfo.props = props;
              routeInfo.error = err;
              return routeInfo;
            },
            (gipErr) => {
              console.error('Error in error page `getInitialProps`: ', gipErr);
              routeInfo.error = err;
              routeInfo.props = {};
              return routeInfo;
            }
          );
        });
      });
  }














  /**
   * 设置路由状态
   * @param {string} route - 路由路径
   * @param {string} pathname - 路径名
   * @param {Object} query - 查询参数
   * @param {string} as - 显示路径
   * @param {Object} data - 路由信息
   */
  set(route, pathname, query, as, data) {
    this.route = route;
    this.pathname = pathname;
    this.query = query;
    this.asPath = as;
    this.notify(data);
  }

  /**
   * 设置 popstate 事件前的回调   Callback to execute before replacing router state
   * @param {Function} cb - 回调函数
   */
  beforePopState(cb) {
    this._bps = cb;
  }

  /**
   * 检查是否仅为 hash 变化
   * @param {string} as - 显示路径
   * @returns {boolean} - 是否仅为 hash 变化
   */
  onlyAHashChange(as) {
    if (!this.asPath) return false;
    const [oldUrlNoHash, oldHash] = this.asPath.split('#');
    const [newUrlNoHash, newHash] = as.split('#');
    // Makes sure we scroll to the provided hash if the url/hash are the same
    if (newHash && oldUrlNoHash === newUrlNoHash && oldHash === newHash) {
      return true;
    }

    // If the urls are change, there's more than a hash change
    if (oldUrlNoHash !== newUrlNoHash) {
      return false;
    }

    // If the hash has changed, then it's a hash only change.
    // This check is necessary to handle both the enter and
    // leave hash === '' cases. The identity case falls through
    // and is treated as a next reload.
    return oldHash !== newHash;
  }

  /**
   * 滚动到指定的 hash 位置
   * @param {string} as - 显示路径
   */
  scrollToHash(as) {
    const [, hash] = as.split('#');
    if (hash === '') {    // Scroll to top if the hash is just `#` with no value
      window.scrollTo(0, 0);
      return;
    }

    const idEl = document.getElementById(hash);
    if (idEl) {
      idEl.scrollIntoView();
      return;
    }

    const nameEl = document.getElementsByName(hash)[0];
    if (nameEl) {
      nameEl.scrollIntoView();
    }
  }

  /**   * 检查 URL 是否为新路径
   * @param {string} asPath - 显示路径
   * @returns {boolean} - 是否为新路径   */
  urlIsNew(asPath) {
    return this.asPath !== asPath;
  }

  /**   * 预加载页面代码
   * @param {string} url - 预加载的路径
   * @returns {Promise<void>}   */
  prefetch(url) {
    return new Promise((resolve, reject) => {
      const { pathname, protocol } = parse(url);

      if (!pathname || protocol) {
        if (process.env.NODE_ENV !== 'production') {
          throw new Error(`Invalid href passed to router: ${url}`);
        }
        return;
      }
// Prefetch is not supported in development mode because it would trigger on-demand-entries
      if (process.env.NODE_ENV !== 'production') return;
      const route = toRoute(pathname); //   pathname is always defined
      this.pageLoader.prefetch(route).then(resolve, reject);
    });
  }

  /**   * 加载页面组件
   * @param {string} route - 路由路径
   * @returns {Promise<Object>} - 组件   */
  async fetchComponent(route) {
    let cancelled = false;
    const cancel = (this.clc = () => {
      cancelled = true;
    });

    const Component = await this.pageLoader.loadPage(route);

    if (cancelled) {
      const error = new Error(`Abort fetching component for route: "${route}"`);
      error.cancelled = true;
      throw error;
    }

    if (cancel === this.clc) {
      this.clc = null;
    }

    return Component;
  }

  /**   * 获取初始属性
   * @param {Object} Component - 页面组件
   * @param {Object} ctx - 上下文对象
   * @returns {Promise<Object>} - 初始属性   */
  async getInitialProps(Component, ctx) {
    let cancelled = false;
    const cancel = () => {
      cancelled = true;
    };
    this.clc = cancel;

    const { Component: App } = this.components['/_app'];
    let props;

    if (
      (self.__HAS_SPR || process.env.NODE_ENV !== 'production') &&
      Component.__NEXT_SPR
    ) {
      let status;
      const { pathname } = parse(ctx.asPath || ctx.pathname);

      props = await fetch(`/_next/data${pathname}.json`)
        .then((res) => {
          if (!res.ok) {
            status = res.status;
            throw new Error('failed to load prerender data');
          }
          return res.json();
        })
        .catch((err) => {
          console.error(`Failed to load data`, status, err);
          window.location.href = pathname;
          return new Promise(() => {});
        });
    } else {
      const AppTree = this._wrapApp(App);
      ctx.AppTree = AppTree;
      props = await loadGetInitialProps(App, {
        AppTree,
        Component,
        router: this,
        ctx,
      });
    }

    if (cancel === this.clc) {
      this.clc = null;
    }

    if (cancelled) {
      const err = new Error('Loading initial props cancelled');
      err.cancelled = true;
      throw err;
    }

    return props;
  }

  /**
   * 取消当前组件加载
   * @param {string} as - 显示路径
   */
  abortComponentLoad(as) {
    if (this.clc) {
      const e = new Error('Route Cancelled');
      e.cancelled = true;
      Router.events.emit('routeChangeError', e, as);
      this.clc();
      this.clc = null;
    }
  }

  /**
   * 通知订阅者路由数据更新
   * @param {Object} data - 路由信息
   */
  notify(data) {
    this.sub(data, this.components['/_app'].Component);
  }


}

// 导出 Router 类，支持 CommonJS 和 ES Module
module.exports = Router;










/*
使用方法
保存代码：
将代码保存为 router.js（或其他文件名）。

引入 Router：
使用 CommonJS： 

const Router = require('./router');
const router = new Router(
  '/home',
  { id: '1' },
  '/home',
  {
    subscription: (data, App) => console.log(data, App),
    initialProps: {},
    pageLoader: { loadPage: async () => ({ default: () => {} }) },
    Component: () => {},
    App: () => {},
    wrapApp: (App) => App,
  }
);
router.push('/about');

使用 ES Module： 

import Router from './router';
// 同上

/**** */