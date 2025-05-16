// 引入 Node.js 内置模块
const { IncomingMessage, ServerResponse } = require('http');
// 引入 React 及其服务器端渲染方法
const React = require('react');
const { renderToString, renderToStaticMarkup } = require('react-dom/server');
// 引入自定义工具函数和模块
const mitt = require('../lib/mitt');
const {
  loadGetInitialProps,
  isResSent,
  getDisplayName,
} = require('../lib/utils');






const Head = require('../lib/head').default;
const defaultHead = require('../lib/head').defaultHead;
const Loadable = require('../lib/loadable').default;
const { DataManagerContext } = require('../lib/data-manager-context');
const { LoadableContext } = require('../lib/loadable-context');
const { RouterContext } = require('../lib/router-context');
const { DataManager } = require('../lib/data-manager');
const { getPageFiles } = require('./get-page-files');
const { AmpStateContext } = require('../lib/amp-context');
 
const { isInAmpMode } = require('../lib/amp');
const { isDynamicRoute } = require('../lib/router/utils/is-dynamic');
const { SPR_GET_INITIAL_PROPS_CONFLICT } = require('../../lib/constants');









// 错误：没有路由实例
function noRouter() {
  const message =
    'No router instance found. you should only use "next/router" inside the client side of your app. https://err.sh/zeit/next.js/no-router-instance';
  throw new Error(message);
}

// 模拟 Next.js 路由器类
class ServerRouter {           ///=== class ServerRouter implements NextRouter {
  route;  // 路由路径（去除末尾斜杠）
  pathname;  // 页面路径
  query;  // 查询参数对象
  asPath;  // 实际路径（包含查询参数）

  // 事件触发器（仅用于兼容，不推荐在服务器端使用）
  static events = mitt();

  constructor(pathname, query, as) {
    this.route = pathname.replace(/\/$/, '') || '/';
    this.pathname = pathname;
    this.query = query;
    this.asPath = as;
  }

  // 以下方法在服务器端不可用，调用时抛出错误
  push() { noRouter(); }
  replace() { noRouter(); }
  reload() { noRouter(); }
  back() { noRouter(); }
  prefetch() { noRouter(); }
  beforePopState() { noRouter(); }
}










// 增强 App 和 Component 组件
function enhanceComponents(options, App, Component) {
  // 兼容旧版：options 为函数时，直接增强 Component
  if (typeof options === 'function') {
    return {
      App,
      Component: options(Component),
    };
  }

  // 使用 enhanceApp 和 enhanceComponent 增强组件
  return {
    App: options.enhanceApp ? options.enhanceApp(App) : App,
    Component: options.enhanceComponent ? options.enhanceComponent(Component) : Component,
  };
}









// 渲染 React 元素为字符串
function render(renderElementToString, element, ampMode) {
  let html;
  let head;





  try {
    html = renderElementToString(element);
  } finally {
    head = Head.rewind() || defaultHead(isInAmpMode(ampMode));
  }

  return { html, head };
}






/**
 * 渲染 Document 组件为 HTML 字符串
 * @param {Function} Document - Document 组件
 * @param {Object} options - 渲染选项
 * @param {string} options.dataManagerData - 数据管理器数据（JSON 字符串）
 * @param {Object} options.props - 页面初始属性（getInitialProps 结果）
 * @param {Object} options.docProps - Document 初始属性（包含 html、head 等）
 * @param {string} options.pathname - 页面路径
 * @param {Object} options.query - 查询参数对象
 * @param {string} options.buildId - 构建 ID，用于缓存页面 bundle
 * @param {string} options.canonicalBase - 规范化基础路径
 * @param {string} [options.assetPrefix] - 资源前缀（可选）
 * @param {Object} [options.runtimeConfig] - 运行时配置
 * @param {boolean} [options.nextExport] - 是否为 next export 页面
 * @param {boolean} [options.autoExport] - 是否为自动导出页面
 * @param {boolean} [options.skeleton] - 是否为实验性预渲染骨架页面
 * @param {string[]} options.dynamicImportsIds - 动态导入的 ID 列表
 * @param {string} options.dangerousAsPath - 实际路径（可能包含敏感信息）
 * @param {boolean} options.hasCssMode - 是否启用 CSS 模式
 * @param {Error} [options.err] - 渲染错误（如果存在）
 * @param {boolean} [options.dev] - 是否为开发环境
 * @param {string} options.ampPath - AMP 页面路径
 * @param {Object} options.ampState - AMP 状态（ampFirst、hasQuery、hybrid）
 * @param {boolean} options.inAmpMode - 是否处于 AMP 模式
 * @param {boolean} options.hybridAmp - 是否为混合 AMP 模式
 * @param {boolean} options.staticMarkup - 是否使用静态标记
 * @param {string[]} options.devFiles - 开发环境文件列表
 * @param {string[]} options.files - 生产环境文件列表
 * @param {any[]} options.dynamicImports - 动态导入的模块列表
 * @returns {string} 渲染后的 HTML 字符串
 */
// 渲染 Document 组件为 HTML 字符串
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
  dynamicImports,
}) {
  return (
    '<!DOCTYPE html>' +
    renderToStaticMarkup(
      <AmpStateContext.Provider value={ampState}>
        <Document
          __NEXT_DATA__={{
            dataManager: dataManagerData,
            props, // getInitialProps 的结果
            page: pathname, // 渲染的页面路径
            query, // 用户解析或传递的查询字符串
            buildId, // 构建 ID，用于客户端加载 bundle
            assetPrefix: assetPrefix === '' ? undefined : assetPrefix, // 配置时发送资源前缀，否则不包含
            runtimeConfig, // 提供时发送运行时配置，否则不包含
            nextExport, // 是否为 next export 页面
            autoExport, // 是否为自动导出页面
            skeleton, // 是否为实验性预渲染骨架页面
            dynamicIds: dynamicImportsIds.length === 0 ? undefined : dynamicImportsIds,
            err: err ? serializeError(dev, err) : undefined, // 存在错误时序列化，否则不包含
          }}
          dangerousAsPath={dangerousAsPath}
          canonicalBase={canonicalBase}
          ampPath={ampPath}
          inAmpMode={inAmpMode}
          isDevelopment={!!dev}
          hasCssMode={hasCssMode}
          hybridAmp={hybridAmp}
          staticMarkup={staticMarkup}
          devFiles={devFiles}
          files={files}
          dynamicImports={dynamicImports}
          assetPrefix={assetPrefix}
          {...docProps}
        />
      </AmpStateContext.Provider>
    )
  );
}











 







// 异步渲染页面为 HTML
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
    unstable_getStaticProps,
  } = renderOpts;





  const isSpr = !!unstable_getStaticProps;
  const defaultAppGetInitialProps = App.getInitialProps === App.origGetInitialProps;
  const hasPageGetInitialProps = !!Component.getInitialProps;
  const isAutoExport = !hasPageGetInitialProps && defaultAppGetInitialProps && !isSpr;
 









  
  if (dev) {
    const { isValidElementType } = require('react-is');
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
      query = { amp: query.amp };
      req.url = pathname;
      renderOpts.nextExport = true;
    }
  }


  if (isAutoExport) renderOpts.autoExport = true;

  await Loadable.preloadAll();
 

  const asPath = req.url;
  const router = new ServerRouter(pathname, query, asPath);
  const ctx = {
    err,
    req: isAutoExport ? undefined : req,
    res: isAutoExport ? undefined : res,
    pathname,
    query,
    asPath,
    AppTree: (props) => {
      return React.createElement(
        AppContainer,
        null,
        React.createElement(App, { ...props, Component, router })
      );
    },
  };

  let props;
  if (documentMiddlewareEnabled && typeof DocumentMiddleware === 'function') {
    await DocumentMiddleware(ctx);
  }

  let dataManager;
  if (ampBindInitData) {
    dataManager = new DataManager();
  }

  const ampState = {
    ampFirst: pageConfig.amp === true,
    hasQuery: Boolean(query.amp),
    hybrid: pageConfig.amp === 'hybrid',
  };

  const reactLoadableModules = [];

/**
 * 应用容器组件，包装页面组件，提供路由、数据管理、AMP 和动态加载上下文
 * @param {Object} props - 组件属性
 * @param {React.ReactNode} props.children - 子组件
 * @returns {JSX.Element} 包装后的组件
 */
function AppContainer({ children }) {
  // 以下变量由外部作用域（renderToHTML）提供
  // router: Next.js 路由对象
  // dataManager: 数据管理器实例
  // ampState: AMP 状态（ampFirst、hasQuery、hybrid）
  // reactLoadableModules: 动态加载模块列表
  return (
    <RouterContext.Provider value={router}>
      <DataManagerContext.Provider value={dataManager}>
        <AmpStateContext.Provider value={ampState}>
          <LoadableContext.Provider
            value={(moduleName) => reactLoadableModules.push(moduleName)}
          >
            {children}
          </LoadableContext.Provider>
        </AmpStateContext.Provider>
      </DataManagerContext.Provider>
    </RouterContext.Provider>
  );
}

  try {
    props = await loadGetInitialProps(App, {
      AppTree: ctx.AppTree,
      Component,
      router,
      ctx,
    });


    














































    
  } catch (err) {
    if (!dev || !err) throw err;
    ctx.err = err;
    renderOpts.err = err;
  }

  if (isResSent(res) && !isSpr) return null;

  const devFiles = buildManifest.devFiles;
  const files = [
    ...new Set([
      ...getPageFiles(buildManifest, pathname),
      ...getPageFiles(buildManifest, '/_app'),
    ]),
  ];

  const renderElementToString = staticMarkup ? renderToStaticMarkup : renderToString;

  function renderPageError() {
    if (ctx.err && ErrorDebug) {
      return render(renderElementToString, React.createElement(ErrorDebug, { error: ctx.err }), ampState);
    }

    if (dev && (props.router || props.Component)) {
      throw new Error(
        `'router' and 'Component' can not be returned in getInitialProps from _app.js https://err.sh/zeit/next.js/cant-override-next-props`
      );
    }
  }

  let renderPage;

























































    renderPage = (options = {}) => {
      const renderError = renderPageError();
      if (renderError) return renderError;

      const { App: EnhancedApp, Component: EnhancedComponent } = enhanceComponents(options, App, Component);

      return render(
        renderElementToString,
        <AppContainer>
          <EnhancedApp
            Component={EnhancedComponent}
            router={router}
            {...props}
          />
        </AppContainer>,
        ampState
      )
    };
    





  const docProps = await loadGetInitialProps(Document, { ...ctx, renderPage });
  if (isResSent(res) && !isSpr) return null;

  let dataManagerData = '[]';
  if (dataManager) {
    dataManagerData = JSON.stringify([...dataManager.getData()]);
  }

  if (!docProps || typeof docProps.html !== 'string') {
    const message = `"${getDisplayName(Document)}.getInitialProps()" should resolve to an object with a "html" prop set with a valid html string`;
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
      manifestItem.forEach((item) => {
        dynamicImports.push(item);
        dynamicImportIdsSet.add(item.id);
      });
    }
  }





  const dynamicImportsIds = [...dynamicImportIdsSet];
  const inAmpMode = isInAmpMode(ampState);
  const hybridAmp = ampState.hybrid;

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
    devFiles,
  });

















  


  return html;
}

// 将错误对象序列化为 JSON
function errorToJSON(err) {
  const { name, message, stack } = err;
  return { name, message, stack };
}

// 序列化错误对象，开发环境返回详细信息，生产环境返回通用错误
function serializeError(dev, err) {
  if (dev) {
    return errorToJSON(err);
  }
  return {
    name: 'Internal Server Error.',
    message: '500 - Internal Server Error.',
    statusCode: 500,
  };
}

// 导出函数，支持 CommonJS 和 ES Module
module.exports = {
  renderToHTML,
  serializeError,
};




/*
[old_render.js]
├── renderToHTML - 渲染页面到 HTML
│   ├── loadGetInitialProps - 加载初始属性
│   ├── renderDocument - 渲染 Document 组件
│   │   └── renderToStaticMarkup (外部) - 渲染为静态标记
│   ├── AppContainer - 包装组件提供上下文
│   │   ├── RouterContext (外部) - 路由上下文
│   │   ├── DataManagerContext (外部) - 数据管理上下文
│   │   ├── AmpStateContext (外部) - AMP 状态上下文
│   │   └── LoadableContext (外部) - 动态加载上下文
│   └── ServerRouter.events [mitt.js] - 路由事件
├── renderDocument - 渲染 Document 组件
│   ├── renderToStaticMarkup (外部) - 渲染为静态标记
│   └── serializeError - 序列化错误
├── AppContainer - 包装组件提供上下文
└── serializeError - 序列化错误
    └── errorToJSON (外部) - 错误转 JSON








 


    /**** */