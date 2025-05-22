/* global document, window */
import mitt from '../next-server/lib/mitt';

/**
 * 检查浏览器是否支持 preload 特性
 * @param {HTMLElement} el - 用于测试的 DOM 元素
 * @returns {boolean} - 是否支持 preload
 */
function supportsPreload(el) {
  try {
    return el.relList.supports('preload');
  } catch {
    return false;
  }
}

// 检查当前浏览器是否支持 preload
const hasPreload = supportsPreload(document.createElement('link'));

/**
 * 预加载脚本资源
 * @param {string} url - 脚本的 URL
 */
function preloadScript(url) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.crossOrigin = process.crossOrigin;
  link.href = encodeURI(url);
  link.as = 'script';
  document.head.appendChild(link);
}

/**
 * PageLoader 类，用于加载和缓存页面脚本
 */
export default class PageLoader {
  /**
   * 构造函数
   * @param {string} buildId - 构建 ID
   * @param {string} assetPrefix - 资源前缀
   */
  constructor(buildId, assetPrefix) {
    this.buildId = buildId;
    this.assetPrefix = assetPrefix;
    this.pageCache = {}; // 页面缓存
    this.pageRegisterEvents = mitt(); // 页面注册事件发射器
    this.loadingRoutes = {}; // 正在加载的路由
    if (process.env.__NEXT_GRANULAR_CHUNKS) {
      // 初始化构建清单承诺
      this.promisedBuildManifest = new Promise(resolve => {
        if (window.__BUILD_MANIFEST) {
          resolve(window.__BUILD_MANIFEST);
        } else {
          window.__BUILD_MANIFEST_CB = () => {
            resolve(window.__BUILD_MANIFEST);
          };
        }
      });
    }
  }

  /**
   * 获取路由的依赖项
   * @param {string} route - 路由路径
   * @returns {Promise<string[]>} - 依赖的脚本 URL 数组
   */
  getDependencies(route) {
    return this.promisedBuildManifest.then(
      man => (man[route] && man[route].map(url => `/_next/${url}`)) || []
    );
  }

  /**
   * 规范化路由路径
   * @param {string} route - 原始路由路径
   * @returns {string} - 规范化后的路由路径
   */
  normalizeRoute(route) {
    if (route[0] !== '/') {
      throw new Error(`路由名称应以 "/" 开头，得到 "${route}"`);
    }
    route = route.replace(/\/index$/, '/');
    if (route === '/') return route;
    return route.replace(/\/$/, '');
  }

  /**
   * 加载页面组件
   * @param {string} route - 路由路径
   * @returns {Promise<Object>} - 页面组件
   */
  loadPage(route) {
    return this.loadPageScript(route).then(v => v.page);
  }

  /**
   * 加载页面脚本及其模块
   * @param {string} route - 路由路径
   * @returns {Promise<Object>} - 包含页面组件和模块的对象
   */
  loadPageScript(route) {
    route = this.normalizeRoute(route);

    return new Promise((resolve, reject) => {
      const fire = ({ error, page, mod }) => {
        this.pageRegisterEvents.off(route, fire);
        delete this.loadingRoutes[route];
        if (error) {
          reject(error);
        } else {
          resolve({ page, mod });
        }
      };

      // 检查缓存
      const cachedPage = this.pageCache[route];
      if (cachedPage) {
        const { error, page, mod } = cachedPage;
        error ? reject(error) : resolve({ page, mod });
        return;
      }

      // 注册页面加载事件监听
      this.pageRegisterEvents.on(route, fire);

      // 如果页面通过 SSR 加载，等待其完成
      if (document.querySelector(`script[data-next-page="${route}"]`)) {
        return;
      }

      // 避免重复加载
      if (!this.loadingRoutes[route]) {
        if (process.env.__NEXT_GRANULAR_CHUNKS) {
          this.getDependencies(route).then(deps => {
            deps.forEach(d => {
              if (!document.querySelector(`script[src^="${d}"]`)) {
                this.loadScript(d, route, false);
              }
            });
            this.loadRoute(route);
            this.loadingRoutes[route] = true;
          });
        } else {
          this.loadRoute(route);
          this.loadingRoutes[route] = true;
        }
      }
    });
  }

  /**
   * 加载路由对应的脚本
   * @param {string} route - 路由路径
   */
  async loadRoute(route) {
    route = this.normalizeRoute(route);
    let scriptRoute = route === '/' ? '/index.js' : `${route}.js`;
    const url = `${this.assetPrefix}/_next/static/${encodeURIComponent(
      this.buildId
    )}/pages${scriptRoute}`;
    this.loadScript(url, route, true);
  }

  /**
   * 动态加载脚本
   * @param {string} url - 脚本 URL
   * @param {string} route - 路由路径
   * @param {boolean} isPage - 是否为页面脚本
   */
  loadScript(url, route, isPage) {
    const script = document.createElement('script');
    if (process.env.__NEXT_MODERN_BUILD && 'noModule' in script) {
      script.type = 'module';
      if (isPage) url = url.replace(/\.js$/, '.module.js');
    }
    script.crossOrigin = process.crossOrigin;
    script.src = encodeURI(url);
    script.onerror = () => {
      const error = new Error(`加载脚本 ${url} 出错`);
      error.code = 'PAGE_LOAD_ERROR';
      this.pageRegisterEvents.emit(route, { error });
    };
    document.body.appendChild(script);
  }

  /**
   * 注册页面组件
   * @param {string} route - 路由路径
   * @param {Function} regFn - 注册函数
   */
  registerPage(route, regFn) {
    const register = () => {
      try {
        const mod = regFn();
        const pageData = { page: mod.default || mod, mod };
        this.pageCache[route] = pageData;
        this.pageRegisterEvents.emit(route, pageData);
      } catch (error) {
        this.pageCache[route] = { error };
        this.pageRegisterEvents.emit(route, { error });
      }
    };

    if (process.env.NODE_ENV !== 'production') {
      // 在开发环境中，等待 Webpack 空闲
      if (module.hot && module.hot.status() !== 'idle') {
        console.log(`等待 Webpack 空闲以初始化页面："${route}"`);
        const check = status => {
          if (status === 'idle') {
            module.hot.removeStatusHandler(check);
            register();
          }
        };
        module.hot.status(check);
        return;
      }
    }

    register();
  }

  /**
   * 预加载页面或依赖项
   * @param {string} route - 路由路径
   * @param {boolean} isDependency - 是否为依赖项
   * @returns {Promise<void>}
   */
  async prefetch(route, isDependency) {
    route = this.normalizeRoute(route);
    let scriptRoute = `${route === '/' ? '/index' : route}.js`;

    if (
      process.env.__NEXT_MODERN_BUILD &&
      'noModule' in document.createElement('script')
    ) {
      scriptRoute = scriptRoute.replace(/\.js$/, '.module.js');
    }
    const url = isDependency
      ? route
      : `${this.assetPrefix}/_next/static/${encodeURIComponent(
          this.buildId
        )}/pages${scriptRoute}`;

    // 检查是否已加载或预加载
    if (
      document.querySelector(
        `link[rel="preload"][href^="${url}"], script[data-next-page="${route}"]`
      )
    ) {
      return;
    }

    // 检查网络条件，避免在 2G 或 Save-Data 模式下预加载
    let cn;
    if ((cn = navigator.connection)) {
      if ((cn.effectiveType || '').indexOf('2g') !== -1 || cn.saveData) {
        return;
      }
    }

    // 预加载依赖项
    if (process.env.__NEXT_GRANULAR_CHUNKS && !isDependency) {
      (await this.getDependencies(route)).forEach(url => {
        this.prefetch(url, true);
      });
    }

    // 使用 preload 或 fallback 到 loadPage
    if (hasPreload) {
      preloadScript(url);
      return;
    }

    if (isDependency) {
      return;
    }

    if (document.readyState === 'complete') {
      return this.loadPage(route).catch(() => {});
    } else {
      return new Promise(resolve => {
        window.addEventListener('load', () => {
          this.loadPage(route).then(() => resolve(), () => resolve());
        });
      });
    }
  }
}


/*
负责动态加载页面脚本和组件
负责动态加载页面脚本和组件
负责动态加载页面脚本和组件
负责动态加载页面脚本和组件
负责动态加载页面脚本和组件


page-loader.js 的用途
在 Next.js 9.1.1 中，client/page-loader.js 是客户端页面加载的核心模块，负责动态加载页面脚本和组件。它的主要功能包括：
页面加载：
通过 loadPage 和 loadPageScript 动态加载页面组件（pages/*.jsx）。

支持 SSR（服务器端渲染）加载的页面，等待脚本完成。

脚本加载：
使用 loadScript 动态插入 <script> 标签，加载页面脚本或依赖项。

支持现代构建（__NEXT_MODERN_BUILD）的 ES 模块（.module.js）。

缓存管理：
使用 pageCache 缓存已加载的页面组件，避免重复加载。

预加载：
通过 prefetch 预加载页面脚本或依赖项，优化导航性能。

使用 <link rel="preload">（如果浏览器支持）或回退到 loadPage。

事件管理：
使用 mitt 事件发射器（pageRegisterEvents）通知页面加载状态。

开发支持：
在开发环境中，配合 Webpack HMR（热模块替换），等待 Webpack 空闲以注册页面iteral


/*** */