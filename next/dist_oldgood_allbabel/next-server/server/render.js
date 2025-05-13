"use strict";

exports.__esModule = true;
exports.renderToHTML = renderToHTML;
var _react = _interopRequireDefault(require("react"));
var _server = require("react-dom/server");
var _mitt = _interopRequireDefault(require("../lib/mitt"));
var _utils = require("../lib/utils");
var _head = _interopRequireWildcard(require("../lib/head"));
var _loadable = _interopRequireDefault(require("../lib/loadable"));
var _dataManagerContext = require("../lib/data-manager-context");
var _loadableContext = require("../lib/loadable-context");
var _routerContext = require("../lib/router-context");
var _dataManager = require("../lib/data-manager");
var _getPageFiles = require("./get-page-files");
var _ampContext = require("../lib/amp-context");
var _optimizeAmp = _interopRequireDefault(require("./optimize-amp"));
var _amp = require("../lib/amp");
var _isDynamic = require("../lib/router/utils/is-dynamic");
var _constants = require("../../lib/constants");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); } // @ts-ignore types will be added later as it's an internal module
// Uses a module path because of the compiled output directory location
function noRouter() {
  const message = 'No router instance found. you should only use "next/router" inside the client side of your app. https://err.sh/zeit/next.js/no-router-instance';
  throw new Error(message);
}
class ServerRouter {
  constructor(pathname, query, as) {
    this.route = void 0;
    this.pathname = void 0;
    this.query = void 0;
    this.asPath = void 0;
    this.events = void 0;
    this.route = pathname.replace(/\/$/, '') || '/';
    this.pathname = pathname;
    this.query = query;
    this.asPath = as;
  }
  push() {
    noRouter();
  }
  replace() {
    noRouter();
  }
  reload() {
    noRouter();
  }
  back() {
    noRouter();
  }
  prefetch() {
    noRouter();
  }
  beforePopState() {
    noRouter();
  }
}
// TODO: Remove in the next major version, as this would mean the user is adding event listeners in server-side `render` method
ServerRouter.events = (0, _mitt.default)();
function enhanceComponents(options, App, Component) {
  // For backwards compatibility
  if (typeof options === 'function') {
    return {
      App,
      Component: options(Component)
    };
  }
  return {
    App: options.enhanceApp ? options.enhanceApp(App) : App,
    Component: options.enhanceComponent ? options.enhanceComponent(Component) : Component
  };
}
function render(renderElementToString, element, ampMode) {
  let html;
  let head;
  try {
    html = renderElementToString(element);
  } finally {
    head = _head.default.rewind() || (0, _head.defaultHead)((0, _amp.isInAmpMode)(ampMode));
  }
  return {
    html,
    head
  };
}
function renderDocument(Document, {
  dataManagerData,
  props,
  docProps,
  pathname,
  query,
  buildId,
  canonicalBase,
  assetPrefix,
  runtimeConfig,
  nextExport,
  autoExport,
  skeleton,
  dynamicImportsIds,
  dangerousAsPath,
  hasCssMode,
  err,
  dev,
  ampPath,
  ampState,
  inAmpMode,
  hybridAmp,
  staticMarkup,
  devFiles,
  files,
  dynamicImports
}) {
  return '<!DOCTYPE html>' + (0, _server.renderToStaticMarkup)(/*#__PURE__*/_react.default.createElement(_ampContext.AmpStateContext.Provider, {
    value: ampState
  }, /*#__PURE__*/_react.default.createElement(Document, _extends({
    __NEXT_DATA__: {
      dataManager: dataManagerData,
      props,
      // The result of getInitialProps
      page: pathname,
      // The rendered page
      query,
      // querystring parsed / passed by the user
      buildId,
      // buildId is used to facilitate caching of page bundles, we send it to the client so that pageloader knows where to load bundles
      assetPrefix: assetPrefix === '' ? undefined : assetPrefix,
      // send assetPrefix to the client side when configured, otherwise don't sent in the resulting HTML
      runtimeConfig,
      // runtimeConfig if provided, otherwise don't sent in the resulting HTML
      nextExport,
      // If this is a page exported by `next export`
      autoExport,
      // If this is an auto exported page
      skeleton,
      // If this is a skeleton page for experimentalPrerender
      dynamicIds: dynamicImportsIds.length === 0 ? undefined : dynamicImportsIds,
      err: err ? serializeError(dev, err) : undefined // Error if one happened, otherwise don't sent in the resulting HTML
    },
    dangerousAsPath: dangerousAsPath,
    canonicalBase: canonicalBase,
    ampPath: ampPath,
    inAmpMode: inAmpMode,
    isDevelopment: !!dev,
    hasCssMode: hasCssMode,
    hybridAmp: hybridAmp,
    staticMarkup: staticMarkup,
    devFiles: devFiles,
    files: files,
    dynamicImports: dynamicImports,
    assetPrefix: assetPrefix
  }, docProps))));
}
async function renderToHTML(req, res, pathname, query, renderOpts) {
  pathname = pathname === '/index' ? '/' : pathname;
  const {
    err,
    dev = false,
    documentMiddlewareEnabled = false,
    ampBindInitData = false,
    staticMarkup = false,
    ampPath = '',
    App,
    Document,
    pageConfig = {},
    DocumentMiddleware,
    Component,
    buildManifest,
    reactLoadableManifest,
    ErrorDebug,
    unstable_getStaticProps
  } = renderOpts;
  const isSpr = !!unstable_getStaticProps;
  const defaultAppGetInitialProps = App.getInitialProps === App.origGetInitialProps;
  const hasPageGetInitialProps = !!Component.getInitialProps;
  const isAutoExport = !hasPageGetInitialProps && defaultAppGetInitialProps && !isSpr;
  if (hasPageGetInitialProps && isSpr) {
    throw new Error(_constants.SPR_GET_INITIAL_PROPS_CONFLICT + ` ${pathname}`);
  }
  if (dev) {
    const {
      isValidElementType
    } = require('react-is');
    if (!isValidElementType(Component)) {
      throw new Error(`The default export is not a React Component in page: "${pathname}"`);
    }
    if (!isValidElementType(App)) {
      throw new Error(`The default export is not a React Component in page: "/_app"`);
    }
    if (!isValidElementType(Document)) {
      throw new Error(`The default export is not a React Component in page: "/_document"`);
    }
    if (isAutoExport) {
      // remove query values except ones that will be set during export
      query = {
        amp: query.amp
      };
      req.url = pathname;
      renderOpts.nextExport = true;
    }
  }
  if (isAutoExport) renderOpts.autoExport = true;
  await _loadable.default.preloadAll(); // Make sure all dynamic imports are loaded

  // @ts-ignore url will always be set
  const asPath = req.url;
  const router = new ServerRouter(pathname, query, asPath);
  const ctx = {
    err,
    req: isAutoExport ? undefined : req,
    res: isAutoExport ? undefined : res,
    pathname,
    query,
    asPath,
    AppTree: props => {
      return /*#__PURE__*/_react.default.createElement(AppContainer, null, /*#__PURE__*/_react.default.createElement(App, _extends({}, props, {
        Component: Component,
        router: router
      })));
    }
  };
  let props;
  if (documentMiddlewareEnabled && typeof DocumentMiddleware === 'function') {
    await DocumentMiddleware(ctx);
  }
  let dataManager;
  if (ampBindInitData) {
    dataManager = new _dataManager.DataManager();
  }
  const ampState = {
    ampFirst: pageConfig.amp === true,
    hasQuery: Boolean(query.amp),
    hybrid: pageConfig.amp === 'hybrid'
  };
  const reactLoadableModules = [];
  const AppContainer = ({
    children
  }) => /*#__PURE__*/_react.default.createElement(_routerContext.RouterContext.Provider, {
    value: router
  }, /*#__PURE__*/_react.default.createElement(_dataManagerContext.DataManagerContext.Provider, {
    value: dataManager
  }, /*#__PURE__*/_react.default.createElement(_ampContext.AmpStateContext.Provider, {
    value: ampState
  }, /*#__PURE__*/_react.default.createElement(_loadableContext.LoadableContext.Provider, {
    value: moduleName => reactLoadableModules.push(moduleName)
  }, children))));
  try {
    props = await (0, _utils.loadGetInitialProps)(App, {
      AppTree: ctx.AppTree,
      Component,
      router,
      ctx
    });
    if (isSpr) {
      const data = await unstable_getStaticProps({
        params: (0, _isDynamic.isDynamicRoute)(pathname) ? query : undefined
      });
      const invalidKeys = Object.keys(data).filter(key => key !== 'revalidate' && key !== 'props');
      if (invalidKeys.length) {
        throw new Error(`Additional keys were returned from \`getStaticProps\`. Properties intended for your component must be nested under the \`props\` key, e.g.:\n\n\treturn { props: { title: 'My Title', content: '...' }\n\nKeys that need moved: ${invalidKeys.join(', ')}.
        `);
      }
      if (typeof data.revalidate === 'number') {
        if (!Number.isInteger(data.revalidate)) {
          throw new Error(`A page's revalidate option must be seconds expressed as a natural number. Mixed numbers, such as '${data.revalidate}', cannot be used.` + `\nTry changing the value to '${Math.ceil(data.revalidate)}' or using \`Math.round()\` if you're computing the value.`);
        } else if (data.revalidate < 0) {
          throw new Error(`A page's revalidate option can not be less than zero. A revalidate option of zero means to revalidate _after_ every request.` + `\nTo never revalidate, you can set revalidate to \`false\` (only ran once at build-time).`);
        } else if (data.revalidate > 31536000) {
          // if it's greater than a year for some reason error
          console.warn(`Warning: A page's revalidate option was set to more than a year. This may have been done in error.` + `\nTo only run getStaticProps at build-time and not revalidate at runtime, you can set \`revalidate\` to \`false\`!`);
        }
      } else if (data.revalidate === false) {
        // `false` is an allowed behavior. We'll catch `revalidate: true` and
        // fall into our default behavior.
      } else {
        // By default, we revalidate after 1 second. This value is optimal for
        // the most up-to-date page possible, but without a 1-to-1
        // request-refresh ratio.
        data.revalidate = 1;
      }
      props.pageProps = data.props
      // pass up revalidate and props for export
      ;
      renderOpts.revalidate = data.revalidate;
      renderOpts.sprData = props;
    }
  } catch (err) {
    if (!dev || !err) throw err;
    ctx.err = err;
    renderOpts.err = err;
  }

  // the response might be finished on the getInitialProps call
  if ((0, _utils.isResSent)(res) && !isSpr) return null;
  const devFiles = buildManifest.devFiles;
  const files = [...new Set([...(0, _getPageFiles.getPageFiles)(buildManifest, pathname), ...(0, _getPageFiles.getPageFiles)(buildManifest, '/_app')])];
  const renderElementToString = staticMarkup ? _server.renderToStaticMarkup : _server.renderToString;
  const renderPageError = () => {
    if (ctx.err && ErrorDebug) {
      return render(renderElementToString, /*#__PURE__*/_react.default.createElement(ErrorDebug, {
        error: ctx.err
      }), ampState);
    }
    if (dev && (props.router || props.Component)) {
      throw new Error(`'router' and 'Component' can not be returned in getInitialProps from _app.js https://err.sh/zeit/next.js/cant-override-next-props`);
    }
  };
  let renderPage;
  if (ampBindInitData) {
    const ssrPrepass = require('react-ssr-prepass');
    renderPage = async (options = {}) => {
      const renderError = renderPageError();
      if (renderError) return renderError;
      const {
        App: EnhancedApp,
        Component: EnhancedComponent
      } = enhanceComponents(options, App, Component);
      const Application = () => /*#__PURE__*/_react.default.createElement(AppContainer, null, /*#__PURE__*/_react.default.createElement(EnhancedApp, _extends({
        Component: EnhancedComponent,
        router: router
      }, props)));
      const element = /*#__PURE__*/_react.default.createElement(Application, null);
      try {
        return render(renderElementToString, element, ampState);
      } catch (err) {
        if (err && typeof err === 'object' && typeof err.then === 'function') {
          await ssrPrepass(element);
          if (renderOpts.dataOnly) {
            return {
              html: '',
              head: [],
              dataOnly: true
            };
          } else {
            return render(renderElementToString, element, ampState);
          }
        }
        throw err;
      }
    };
  } else {
    renderPage = (options = {}) => {
      const renderError = renderPageError();
      if (renderError) return renderError;
      const {
        App: EnhancedApp,
        Component: EnhancedComponent
      } = enhanceComponents(options, App, Component);
      return render(renderElementToString, /*#__PURE__*/_react.default.createElement(AppContainer, null, /*#__PURE__*/_react.default.createElement(EnhancedApp, _extends({
        Component: EnhancedComponent,
        router: router
      }, props))), ampState);
    };
  }
  const docProps = await (0, _utils.loadGetInitialProps)(Document, {
    ...ctx,
    renderPage
  });
  // the response might be finished on the getInitialProps call
  if ((0, _utils.isResSent)(res) && !isSpr) return null;
  let dataManagerData = '[]';
  if (dataManager) {
    dataManagerData = JSON.stringify([...dataManager.getData()]);
  }
  if (!docProps || typeof docProps.html !== 'string') {
    const message = `"${(0, _utils.getDisplayName)(Document)}.getInitialProps()" should resolve to an object with a "html" prop set with a valid html string`;
    throw new Error(message);
  }
  if (docProps.dataOnly) {
    return dataManagerData;
  }
  const dynamicImportIdsSet = new Set();
  const dynamicImports = [];
  for (const mod of reactLoadableModules) {
    const manifestItem = reactLoadableManifest[mod];
    if (manifestItem) {
      manifestItem.map(item => {
        dynamicImports.push(item);
        dynamicImportIdsSet.add(item.id);
      });
    }
  }
  const dynamicImportsIds = [...dynamicImportIdsSet];
  const inAmpMode = (0, _amp.isInAmpMode)(ampState);
  const hybridAmp = ampState.hybrid;

  // update renderOpts so export knows current state
  renderOpts.inAmpMode = inAmpMode;
  renderOpts.hybridAmp = hybridAmp;
  let html = renderDocument(Document, {
    ...renderOpts,
    dangerousAsPath: router.asPath,
    dataManagerData,
    ampState,
    props,
    docProps,
    pathname,
    ampPath,
    query,
    inAmpMode,
    hybridAmp,
    dynamicImportsIds,
    dynamicImports,
    files,
    devFiles
  });
  if (inAmpMode && html) {
    // use replace to allow rendering directly to body in AMP mode
    html = html.replace('__NEXT_AMP_RENDER_TARGET__', `<!-- __NEXT_DATA__ -->${docProps.html}`);
    html = await (0, _optimizeAmp.default)(html);
    if (renderOpts.ampValidator) {
      await renderOpts.ampValidator(html, pathname);
    }
  }
  if (inAmpMode || hybridAmp) {
    // fix &amp being escaped for amphtml rel link
    html = html.replace(/&amp;amp=1/g, '&amp=1');
  }
  return html;
}
function errorToJSON(err) {
  const {
    name,
    message,
    stack
  } = err;
  return {
    name,
    message,
    stack
  };
}
function serializeError(dev, err) {
  if (dev) {
    return errorToJSON(err);
  }
  return {
    name: 'Internal Server Error.',
    message: '500 - Internal Server Error.',
    statusCode: 500
  };
}