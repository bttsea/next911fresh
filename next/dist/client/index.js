"use strict";

exports.__esModule = true;
exports.emitter = exports.default = exports.dataManager = exports.ErrorComponent = void 0;
exports.render = render;
exports.renderError = renderError;
exports.version = exports.router = void 0;
var _react = _interopRequireDefault(require("react"));
var _reactDom = _interopRequireDefault(require("react-dom"));
var _headManager = _interopRequireDefault(require("./head-manager"));
var _router = require("next/router");
var _mitt = _interopRequireDefault(require("../next-server/lib/mitt"));
var _utils = require("../next-server/lib/utils");
var _pageLoader = _interopRequireDefault(require("./page-loader"));
var envConfig = _interopRequireWildcard(require("../next-server/lib/runtime-config"));
var _headManagerContext = require("../next-server/lib/head-manager-context");
var _dataManagerContext = require("../next-server/lib/data-manager-context");
var _routerContext = require("../next-server/lib/router-context");
var _dataManager = require("../next-server/lib/data-manager");
var _querystring = require("querystring");
var _isDynamic = require("../next-server/lib/router/utils/is-dynamic");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/* global location */

// Polyfill Promise globally
// This is needed because Webpack's dynamic loading(common chunks) code
// depends on Promise.
// So, we need to polyfill it.
// See: https://webpack.js.org/guides/code-splitting/#dynamic-imports
if (!window.Promise) {
  window.Promise = Promise;
}
const data = JSON.parse(document.getElementById('__NEXT_DATA__').textContent);
window.__NEXT_DATA__ = data;
const version = exports.version = "9.1.1";
const {
  props,
  err,
  page,
  query,
  buildId,
  assetPrefix,
  runtimeConfig,
  dynamicIds
} = data;
const d = JSON.parse(window.__NEXT_DATA__.dataManager);
const dataManager = exports.dataManager = new _dataManager.DataManager(d);
const prefix = assetPrefix || '';

// With dynamic assetPrefix it's no longer possible to set assetPrefix at the build time
// So, this is how we do it in the client side at runtime
__webpack_public_path__ = `${prefix}/_next/`; //eslint-disable-line
// Initialize next/config with the environment configuration
envConfig.setConfig({
  serverRuntimeConfig: {},
  publicRuntimeConfig: runtimeConfig || {}
});
const asPath = (0, _utils.getURL)();
const pageLoader = new _pageLoader.default(buildId, prefix);
const register = ([r, f]) => pageLoader.registerPage(r, f);
if (window.__NEXT_P) {
  window.__NEXT_P.map(register);
}
window.__NEXT_P = [];
window.__NEXT_P.push = register;
const headManager = new _headManager.default();
const appElement = document.getElementById('__next');
let lastAppProps;
let webpackHMR;
let router = exports.router = void 0;
let ErrorComponent = exports.ErrorComponent = void 0;
let Component;
let App, onPerfEntry;
class Container extends _react.default.Component {
  componentDidCatch(err, info) {
    this.props.fn(err, info);
  }
  componentDidMount() {
    this.scrollToHash();

    // If page was exported and has a querystring
    // If it's a dynamic route or has a querystring
    if (data.nextExport && ((0, _isDynamic.isDynamicRoute)(router.pathname) || location.search || data.skeleton)) {
      // update query on mount for exported pages
      router.replace(router.pathname + '?' + (0, _querystring.stringify)({
        ...router.query,
        ...(0, _querystring.parse)(location.search.substr(1))
      }), asPath, {
        // WARNING: `_h` is an internal option for handing Next.js
        // client-side hydration. Your app should _never_ use this property.
        // It may change at any time without notice.
        _h: 1
      });
    }
  }
  componentDidUpdate() {
    this.scrollToHash();
  }
  scrollToHash() {
    let {
      hash
    } = location;
    hash = hash && hash.substring(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;

    // If we call scrollIntoView() in here without a setTimeout
    // it won't scroll properly.
    setTimeout(() => el.scrollIntoView(), 0);
  }
  render() {
    return this.props.children;
  }
}
const emitter = exports.emitter = (0, _mitt.default)();
var _default = async ({
  webpackHMR: passedWebpackHMR
} = {}) => {
  // This makes sure this specific lines are removed in production
  if (process.env.NODE_ENV === 'development') {
    webpackHMR = passedWebpackHMR;
  }
  const {
    page: app,
    mod
  } = await pageLoader.loadPageScript('/_app');
  App = app;
  if (mod && mod.unstable_onPerformanceData) {
    onPerfEntry = function ({
      name,
      startTime,
      value
    }) {
      mod.unstable_onPerformanceData({
        name,
        startTime,
        value
      });
    };
  }
  let initialErr = err;
  try {
    Component = await pageLoader.loadPage(page);
    if (process.env.NODE_ENV !== 'production') {
      const {
        isValidElementType
      } = require('react-is');
      if (!isValidElementType(Component)) {
        throw new Error(`The default export is not a React Component in page: "${page}"`);
      }
    }
  } catch (error) {
    // This catches errors like throwing in the top level of a module
    initialErr = error;
  }
  if (window.__NEXT_PRELOADREADY) {
    await window.__NEXT_PRELOADREADY(dynamicIds);
  }
  exports.router = router = (0, _router.createRouter)(page, query, asPath, {
    initialProps: props,
    pageLoader,
    App,
    Component,
    wrapApp,
    err: initialErr,
    subscription: ({
      Component,
      props,
      err
    }, App) => {
      render({
        App,
        Component,
        props,
        err,
        emitter
      });
    }
  });
  const renderCtx = {
    App,
    Component,
    props,
    err: initialErr,
    emitter
  };
  render(renderCtx);
  return emitter;
};
exports.default = _default;
async function render(props) {
  if (props.err) {
    await renderError(props);
    return;
  }
  try {
    await doRender(props);
  } catch (err) {
    await renderError({
      ...props,
      err
    });
  }
}

// This method handles all runtime and debug errors.
// 404 and 500 errors are special kind of errors
// and they are still handle via the main render method.
async function renderError(props) {
  const {
    App,
    err
  } = props;

  // In development runtime errors are caught by react-error-overlay
  // In production we catch runtime errors using componentDidCatch which will trigger renderError
  if (process.env.NODE_ENV !== 'production') {
    return webpackHMR.reportRuntimeError(webpackHMR.prepareError(err));
  }

  // Make sure we log the error to the console, otherwise users can't track down issues.
  console.error(err);
  exports.ErrorComponent = ErrorComponent = await pageLoader.loadPage('/_error');

  // In production we do a normal render with the `ErrorComponent` as component.
  // If we've gotten here upon initial render, we can use the props from the server.
  // Otherwise, we need to call `getInitialProps` on `App` before mounting.
  const AppTree = wrapApp(App);
  const appCtx = {
    Component: ErrorComponent,
    AppTree,
    router,
    ctx: {
      err,
      pathname: page,
      query,
      asPath,
      AppTree
    }
  };
  const initProps = props.props ? props.props : await (0, _utils.loadGetInitialProps)(App, appCtx);
  await doRender({
    ...props,
    err,
    Component: ErrorComponent,
    props: initProps
  });
}

// If hydrate does not exist, eg in preact.
let isInitialRender = typeof _reactDom.default.hydrate === 'function';
function renderReactElement(reactEl, domEl) {
  // mark start of hydrate/render
  if (_utils.SUPPORTS_PERFORMANCE_USER_TIMING) {
    performance.mark('beforeRender');
  }

  // The check for `.hydrate` is there to support React alternatives like preact
  if (isInitialRender) {
    _reactDom.default.hydrate(reactEl, domEl, markHydrateComplete);
    isInitialRender = false;
  } else {
    _reactDom.default.render(reactEl, domEl, markRenderComplete);
  }
  if (onPerfEntry) {
    performance.getEntriesByType('paint').forEach(onPerfEntry);
  }
}
function markHydrateComplete() {
  if (!_utils.SUPPORTS_PERFORMANCE_USER_TIMING) return;
  performance.mark('afterHydrate'); // mark end of hydration

  performance.measure('Next.js-before-hydration', 'navigationStart', 'beforeRender');
  performance.measure('Next.js-hydration', 'beforeRender', 'afterHydrate');
  if (onPerfEntry) {
    performance.getEntriesByName('Next.js-hydration').forEach(onPerfEntry);
    performance.getEntriesByName('beforeRender').forEach(onPerfEntry);
  }
  clearMarks();
}
function markRenderComplete() {
  if (!_utils.SUPPORTS_PERFORMANCE_USER_TIMING) return;
  performance.mark('afterRender'); // mark end of render
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
function clearMarks() {
  ;
  ['beforeRender', 'afterHydrate', 'afterRender', 'routeChange'].forEach(mark => performance.clearMarks(mark));
  ['Next.js-before-hydration', 'Next.js-hydration', 'Next.js-route-change-to-render', 'Next.js-render'].forEach(measure => performance.clearMeasures(measure));
}
function AppContainer({
  children
}) {
  return /*#__PURE__*/_react.default.createElement(Container, {
    fn: error => renderError({
      App,
      err: error
    }).catch(err => console.error('Error rendering page: ', err))
  }, /*#__PURE__*/_react.default.createElement(_routerContext.RouterContext.Provider, {
    value: (0, _router.makePublicRouterInstance)(router)
  }, /*#__PURE__*/_react.default.createElement(_dataManagerContext.DataManagerContext.Provider, {
    value: dataManager
  }, /*#__PURE__*/_react.default.createElement(_headManagerContext.HeadManagerContext.Provider, {
    value: headManager.updateHead
  }, children))));
}
const wrapApp = App => props => {
  const appProps = {
    ...props,
    Component,
    err,
    router
  };
  return /*#__PURE__*/_react.default.createElement(AppContainer, null, /*#__PURE__*/_react.default.createElement(App, appProps));
};
async function doRender({
  App,
  Component,
  props,
  err
}) {
  // Usual getInitialProps fetching is handled in next/router
  // this is for when ErrorComponent gets replaced by Component by HMR
  if (!props && Component && Component !== ErrorComponent && lastAppProps.Component === ErrorComponent) {
    const {
      pathname,
      query,
      asPath
    } = router;
    const AppTree = wrapApp(App);
    const appCtx = {
      router,
      AppTree,
      Component: ErrorComponent,
      ctx: {
        err,
        pathname,
        query,
        asPath,
        AppTree
      }
    };
    props = await (0, _utils.loadGetInitialProps)(App, appCtx);
  }
  Component = Component || lastAppProps.Component;
  props = props || lastAppProps.props;
  const appProps = {
    ...props,
    Component,
    err,
    router
  };
  // lastAppProps has to be set before ReactDom.render to account for ReactDom throwing an error.
  lastAppProps = appProps;
  emitter.emit('before-reactdom-render', {
    Component,
    ErrorComponent,
    appProps
  });

  // We catch runtime errors using componentDidCatch which will trigger renderError
  renderReactElement(/*#__PURE__*/_react.default.createElement(AppContainer, null, /*#__PURE__*/_react.default.createElement(App, appProps)), appElement);
  emitter.emit('after-reactdom-render', {
    Component,
    ErrorComponent,
    appProps
  });
}