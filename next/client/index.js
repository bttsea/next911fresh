/* global location */
import React from 'react';
import ReactDOM from 'react-dom';
import HeadManager from './head-manager';
import { createRouter, makePublicRouterInstance } from 'next/router';
import mitt from '../next-server/lib/mitt';
import {
  loadGetInitialProps,
  getURL,
  SUPPORTS_PERFORMANCE_USER_TIMING,
} from '../next-server/lib/utils';
import PageLoader from './page-loader';
import * as envConfig from '../next-server/lib/runtime-config';
import { HeadManagerContext } from '../next-server/lib/head-manager-context';
import { DataManagerContext } from '../next-server/lib/data-manager-context';
import { RouterContext } from '../next-server/lib/router-context';
import { DataManager } from '../next-server/lib/data-manager';
import { parse as parseQs, stringify as stringifyQs } from 'querystring';
import { isDynamicRoute } from '../next-server/lib/router/utils/is-dynamic';

// 为不支持 Promise 的环境添加 Promise 垫片
// 这是因为 Webpack 的动态加载（公共块）依赖 Promise
if (!window.Promise) {
  window.Promise = Promise;
}

// 从 DOM 元素中获取初始数据
const data = JSON.parse(document.getElementById('__NEXT_DATA__').textContent);
window.__NEXT_DATA__ = data;

// 导出 Next.js 版本号
export const version = process.env.__NEXT_VERSION;

// 解构初始数据
const {
  props,
  err,
  page,
  query,
  buildId,
  assetPrefix,
  runtimeConfig,
  dynamicIds,
} = data;

// 初始化数据管理器
const d = JSON.parse(window.__NEXT_DATA__.dataManager);
export const dataManager = new DataManager(d);

// 设置资源前缀
const prefix = assetPrefix || '';

// 在运行时动态设置 Webpack 公共路径
__webpack_public_path__ = `${prefix}/_next/`; // eslint-disable-line

// 初始化 next/config 的环境配置
envConfig.setConfig({
  serverRuntimeConfig: {},
  publicRuntimeConfig: runtimeConfig || {},
});

// 获取当前 URL 路径
const asPath = getURL();

// 初始化页面加载器
const pageLoader = new PageLoader(buildId, prefix);

/**
 * 注册页面模块
 * @param {Array} param - 包含页面路径和模块函数的数组
 */
const register = ([r, f]) => pageLoader.registerPage(r, f);
if (window.__NEXT_P) {
  window.__NEXT_P.map(register);
}
window.__NEXT_P = [];
window.__NEXT_P.push = register;

// 初始化头部管理器
const headManager = new HeadManager();
const appElement = document.getElementById('__next');

// 保存上一次的应用 props
let lastAppProps;
let webpackHMR;
export let router;
export let ErrorComponent;
let Component;
let App, onPerfEntry;











/**
 * Container 组件，用于包装应用并处理错误和滚动
 */
class Container extends React.Component {
  /**
   * 捕获组件树中的错误
   * @param {Error} err - 错误对象
   * @param {Object} info - 错误信息
   */
  componentDidCatch(err, info) {
    this.props.fn(err, info);
  }

  /**
   * 组件挂载时处理滚动和查询字符串更新
   */
  componentDidMount() {
    this.scrollToHash();

    // 如果是导出的页面、动态路由或有查询字符串，更新 URL
    if (
      data.nextExport &&
      (isDynamicRoute(router.pathname) || location.search || data.skeleton)
    ) {
      router.replace(
        router.pathname +
          '?' +
          stringifyQs({
            ...router.query,
            ...parseQs(location.search.substr(1)),
          }),
        asPath,
        {
          _h: 1, // 内部选项，用于客户端水合
        }
      );
    }
  }

  /**
   * 组件更新时处理滚动
   */
  componentDidUpdate() {
    this.scrollToHash();
  }

  /**
   * 滚动到 URL 中的哈希位置
   */
  scrollToHash() {
    let { hash } = location;
    hash = hash && hash.substring(1);
    if (!hash) return;

    const el = document.getElementById(hash);
    if (!el) return;

    setTimeout(() => el.scrollIntoView(), 0);
  }

  /**
   * 渲染子组件
   * @returns {JSX.Element} - 子组件
   */
  render() {
    return this.props.children;
  }
}

// 创建事件发射器
export const emitter = mitt();











/**
 * 初始化 Next.js 客户端
 * @param {Object} [options] - 可选配置，包含 webpackHMR
 * @returns {Object} - 事件发射器
 */
export default async ({ webpackHMR: passedWebpackHMR } = {}) => {
  if (process.env.NODE_ENV === 'development') {
    webpackHMR = passedWebpackHMR;
  }

  // 加载 _app 页面
  const { page: app, mod } = await pageLoader.loadPageScript('/_app');
  App = app;
  if (mod && mod.unstable_onPerformanceData) {
    onPerfEntry = function ({ name, startTime, value }) {
      mod.unstable_onPerformanceData({ name, startTime, value });
    };
  }

  let initialErr = err;

  try {
    // 加载当前页面组件
    Component = await pageLoader.loadPage(page);

    if (process.env.NODE_ENV !== 'production') {
      const { isValidElementType } = require('react-is');
      if (!isValidElementType(Component)) {
        throw new Error(`页面 "${page}" 的默认导出不是 React 组件`);
      }
    }
  } catch (error) {
    initialErr = error;
  }

  // 执行预加载回调
  if (window.__NEXT_PRELOADREADY) {
    await window.__NEXT_PRELOADREADY(dynamicIds);
  }

  // 初始化路由器
  router = createRouter(page, query, asPath, {
    initialProps: props,
    pageLoader,
    App,
    Component,
    wrapApp,
    err: initialErr,
    subscription: ({ Component, props, err }, App) => {
      render({ App, Component, props, err, emitter });
    },
  });

  // 渲染初始上下文
  const renderCtx = { App, Component, props, err: initialErr, emitter };
  render(renderCtx);

  return emitter;
};

/**
 * 渲染页面
 * @param {Object} props - 包含 App、Component、props、err 和 emitter
 */
export async function render(props) {
  if (props.err) {
    await renderError(props);
    return;
  }

  try {
    await doRender(props);
  } catch (err) {
    await renderError({ ...props, err });
  }
}

/**
 * 渲染错误页面
 * @param {Object} props - 包含 App、err 等
 */
export async function renderError(props) {
  const { App, err } = props;

  if (process.env.NODE_ENV !== 'production') {
    return webpackHMR.reportRuntimeError(webpackHMR.prepareError(err));
  }

  console.error(err);

  // 加载错误页面组件
  ErrorComponent = await pageLoader.loadPage('/_error');

  const AppTree = wrapApp(App);
  const appCtx = {
    Component: ErrorComponent,
    AppTree,
    router,
    ctx: { err, pathname: page, query, asPath, AppTree },
  };

  const initProps = props.props ? props.props : await loadGetInitialProps(App, appCtx);

  await doRender({ ...props, err, Component: ErrorComponent, props: initProps });
}



// If hydrate does not exist, eg in preact. 用于检查是否支持 ReactDOM.hydrate（在 React 环境中存在，但在某些替代库如 Preact 中可能不存在
let isInitialRender = typeof ReactDOM.hydrate === 'function';



/**
 * 渲染或水合 React 元素
 * @param {JSX.Element} reactEl - React 元素
 * @param {HTMLElement} domEl - DOM 容器
 */
function renderReactElement(reactEl, domEl) {
  if (SUPPORTS_PERFORMANCE_USER_TIMING) {
    performance.mark('beforeRender');
  }

  if (isInitialRender) {
    ReactDOM.hydrate(reactEl, domEl, markHydrateComplete);
    isInitialRender = false;
  } else {
    ReactDOM.render(reactEl, domEl, markRenderComplete);
  }

  if (onPerfEntry) {
    performance.getEntriesByType('paint').forEach(onPerfEntry);
  }
}

/**
 * 标记水合完成并记录性能
 */
function markHydrateComplete() {
  if (!SUPPORTS_PERFORMANCE_USER_TIMING) return;

  performance.mark('afterHydrate');

  performance.measure('Next.js-before-hydration', 'navigationStart', 'beforeRender');
  performance.measure('Next.js-hydration', 'beforeRender', 'afterHydrate');
  if (onPerfEntry) {
    performance.getEntriesByName('Next.js-hydration').forEach(onPerfEntry);
    performance.getEntriesByName('beforeRender').forEach(onPerfEntry);
  }
  clearMarks();
}

/**
 * 标记渲染完成并记录性能
 */
function markRenderComplete() {
  if (!SUPPORTS_PERFORMANCE_USER_TIMING) return;

  performance.mark('afterRender');
  const navStartEntries = performance.getEntriesByName('routeChange', 'mark');

  if (!navStartEntries.length) {
    return;
  }

  performance.measure('Next.js-route-change-to-render', navStartEntries[0].name, 'beforeRender');
  performance.measure('Next.js-render', 'beforeRender', 'afterRender');
  if (onPerfEntry) {
    performance.getEntriesByName('Next.js-render').forEach(onPerfEntry);
    performance.getEntriesByName('Next.js-route-change-to-render').forEach(onPerfEntry);
  }
  clearMarks();
}

/**
 * 清理性能标记和测量
 */
function clearMarks() {
  ['beforeRender', 'afterHydrate', 'afterRender', 'routeChange'].forEach(mark =>
    performance.clearMarks(mark)
  );
  [
    'Next.js-before-hydration',
    'Next.js-hydration',
    'Next.js-route-change-to-render',
    'Next.js-render',
  ].forEach(measure => performance.clearMeasures(measure));
}

/**
 * AppContainer 组件，包装应用并提供上下文
 * @param {Object} props - 包含子组件
 * @returns {JSX.Element} - 包装后的 JSX 结构
 */
function AppContainer({ children }) {
  return (
    <Container
      fn={error =>
        renderError({ App, err: error }).catch(err =>
          console.error('渲染页面出错：', err)
        )
      }
    >
      <RouterContext.Provider value={makePublicRouterInstance(router)}>
        <DataManagerContext.Provider value={dataManager}>
          <HeadManagerContext.Provider value={headManager.updateHead}>
            {children}
          </HeadManagerContext.Provider>
        </DataManagerContext.Provider>
      </RouterContext.Provider>
    </Container>
  );
}

/**
 * 包装 App 组件，添加上下文和路由
 * @param {React.ComponentType} App - 应用组件
 * @returns {Function} - 包装后的组件
 */
const wrapApp = App => props => {
  const appProps = { ...props, Component, err, router };
  return (
    <AppContainer>
      <App {...appProps} />
    </AppContainer>
  );
};


/**
 * 执行渲染逻辑
 * @param {Object} props - 包含 App、Component、props、err 等
 */
async function doRender({ App, Component, props, err }) {
  if (
    !props &&
    Component &&
    Component !== ErrorComponent &&
    lastAppProps.Component === ErrorComponent
  ) {
    const { pathname, query, asPath } = router;
    const AppTree = wrapApp(App);
    const appCtx = {
      router,
      AppTree,
      Component: ErrorComponent,
      ctx: { err, pathname, query, asPath, AppTree },
    };
    props = await loadGetInitialProps(App, appCtx);
  }

  Component = Component || lastAppProps.Component;
  props = props || lastAppProps.props;

  const appProps = { ...props, Component, err, router };
  lastAppProps = appProps;

  emitter.emit('before-reactdom-render', {
    Component,
    ErrorComponent,
    appProps,
  });

  // 渲染 React 元素
  renderReactElement(
    <AppContainer>
      <App {...appProps} />
    </AppContainer>,
    appElement
  );

  emitter.emit('after-reactdom-render', { Component, ErrorComponent, appProps });
}


/*
index.js 的用途
在 Next.js 9.1.1 中，client/index.js 是客户端的入口点，负责初始化 Next.js 应用。它执行以下核心任务：
初始化环境：
设置 Promise 垫片以支持 Webpack 动态加载。
解析 __NEXT_DATA__ 数据，包含页面 props、错误、路由信息等。
配置 next/config 和资源前缀。

页面加载：
使用 PageLoader 加载 _app 和页面组件。
初始化路由器（createRouter）并处理动态路由和查询字符串。
错误处理：
使用 renderError 加载 _error 页面处理错误。
在开发环境中通过 webpackHMR 报告运行时错误。
渲染：
通过 ReactDOM.hydrate 或 ReactDOM.render 进行客户端水合或渲染。
使用 AppContainer 提供路由、数据和头部管理的上下文。
性能监控：
使用 performance.mark 和 performance.measure 记录渲染和水合的性能数据。












Hydration 真的很重要吗？
是的，Hydration（水合） 在 Next.js（包括 9.1.1 版本）和现代 React 应用中非常重要，特别是在服务器端渲染（SSR）或静态站点生成（SSG）场景中。以下是详细分析：
什么是 Hydration？
定义：Hydration 是指客户端接收服务器端渲染（SSR）生成的 HTML，并在客户端通过 React 将这些静态 HTML 转换为动态、可交互的 DOM 树的过程。

工作原理：
服务器端生成 HTML（包含 __NEXT_DATA__ 和初始 DOM 结构）。

客户端加载 JavaScript，通过 ReactDOM.hydrate（在 Next.js 9.1.1 中）将 React 组件树附加到现有的 DOM 结构，而不是重新渲染整个页面。

Hydration 会重用服务器端的 DOM 节点，仅为它们绑定事件监听器和其他动态行为。

代码中的体现：
在你的 index.js 中，renderReactElement 函数使用 ReactDOM.hydrate 进行水合：

if (isInitialRender) {
  ReactDOM.hydrate(reactEl, domEl, markHydrateComplete);
  isInitialRender = false;
} else {
  ReactDOM.render(reactEl, domEl, markRenderComplete);
}

isInitialRender 检查 ReactDOM.hydrate 是否可用，以支持 Preact 等环境（Preact 在当时可能使用 render 而非 hydrate）。



/******** */