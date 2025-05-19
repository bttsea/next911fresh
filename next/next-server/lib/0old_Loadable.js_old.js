// loadable.js
// 基于 https://github.com/jamiebuilds/react-loadable@v5.5.0 修改，适配 webpack 4 和 Next.js

// 引入 React 和上下文模块
const React = require('react');
const { LoadableContext } = require('./loadable-context');

// 初始化器数组，用于管理组件预加载
const ALL_INITIALIZERS = [];
const READY_INITIALIZERS = [];
let initialized = false;

/**
 * 加载单个动态模块
 * @param {Function} loader - 返回 Promise 的加载函数
 * @returns {Object} 包含加载状态、结果和 Promise 的状态对象
 */
function load(loader) {
  let promise = loader();

  let state = {
    loading: true, // 是否正在加载
    loaded: null, // 加载完成的模块
    error: null,  // 加载错误
  };

  state.promise = promise
    .then((loaded) => {
      state.loading = false;
      state.loaded = loaded;
      return loaded;
    })
    .catch((err) => {
      state.loading = false;
      state.error = err;
      throw err;
    });

  return state;
}

 
/**
 * 解析模块，获取默认导出或模块本身
 * @param {Object} obj - 加载的模块
 * @returns {any} 默认导出或模块
 */
function resolve(obj) {
  return obj && obj.__esModule ? obj.default : obj;
}

/**
 * 渲染加载完成的组件
 * @param {Object} loaded - 加载的模块
 * @param {Object} props - 组件的 props
 * @returns {ReactElement} 渲染的 React 组件
 */
function render(loaded, props) {
  return React.createElement(resolve(loaded), props);
}

/**
 * 创建动态加载组件
 * @param {Function} loadFn - 加载函数（load 或 loadMap）
 * @param {Object} options - 配置选项
 * @returns {React.Component} 动态加载的 React 组件
 */
function createLoadableComponent(loadFn, options) {
  let opts = Object.assign(
    {
      loader: null,         // 加载函数
      loading: null,        // 加载中显示的组件
      delay: 200,           // 延迟显示加载组件的时间（毫秒）
      timeout: null,        // 加载超时时间（毫秒）
      render,               // 渲染函数
      webpack: null,        // Webpack 模块 ID 获取函数
      modules: null,        // 模块名称数组
    },
    options
  );

  let res = null;

  // 初始化加载
  function init() {
    if (!res) {
      res = loadFn(opts.loader);
    }
    return res.promise;
  }

  // 服务端：添加初始化器
  if (typeof window === 'undefined') {
    ALL_INITIALIZERS.push(init);
  }

  // 客户端：处理 Webpack 模块预加载
  if (!initialized && typeof window !== 'undefined' && typeof opts.webpack === 'function') {
    const moduleIds = opts.webpack();
    READY_INITIALIZERS.push((ids) => {
      for (const moduleId of moduleIds) {
        if (ids.indexOf(moduleId) !== -1) {
          return init();
        }
      }
    });
  }

  // 定义动态加载组件
  class LoadableComponent extends React.Component {
    constructor(props) {
      super(props);
      init();

      this.state = {
        error: res.error,      // 加载错误
        pastDelay: false,      // 是否超过延迟时间
        timedOut: false,       // 是否超时
        loading: res.loading,  // 是否正在加载
        loaded: res.loaded,    // 加载完成的模块
      };
    }

    // 静态方法：预加载组件
    static preload() {
      return init();
    }

    // 设置上下文类型
    static contextType = LoadableContext;

    // 组件挂载前加载模块
    componentWillMount() {
      this._mounted = true;
      this._loadModule();
    }

    // 加载模块并更新状态
    _loadModule() {
      // 通知上下文中的模块名称
      if (this.context && Array.isArray(opts.modules)) {
        opts.modules.forEach((moduleName) => {
          this.context(moduleName);
        });
      }

      // 如果已加载完成，无需继续
      if (!res.loading) {
        return;
      }

      // 设置延迟显示加载组件
      if (typeof opts.delay === 'number') {
        if (opts.delay === 0) {
          this.setState({ pastDelay: true });
        } else {
          this._delay = setTimeout(() => {
            this.setState({ pastDelay: true });
          }, opts.delay);
        }
      }

      // 设置加载超时
      if (typeof opts.timeout === 'number') {
        this._timeout = setTimeout(() => {
          this.setState({ timedOut: true });
        }, opts.timeout);
      }

      // 更新状态
      let update = () => {
        if (!this._mounted) {
          return;
        }

        this.setState({
          error: res.error,
          loaded: res.loaded,
          loading: res.loading,
        });

        this._clearTimeouts();
      };

      res.promise
        .then(() => {
          update();
        })
        .catch(() => {
          update();
        });
    }

    // 组件卸载时清理
    componentWillUnmount() {
      this._mounted = false;
      this._clearTimeouts();
    }

    // 清理定时器
    _clearTimeouts() {
      clearTimeout(this._delay);
      clearTimeout(this._timeout);
    }

    // 重试加载
    retry = () => {
      this.setState({ error: null, loading: true, timedOut: false });
      res = loadFn(opts.loader);
      this._loadModule();
    };

    // 渲染组件
    render() {
      if (this.state.loading || this.state.error) {
        return React.createElement(opts.loading, {
          isLoading: this.state.loading,
          pastDelay: this.state.pastDelay,
          timedOut: this.state.timedOut,
          error: this.state.error,
          retry: this.retry,
        });
      } else if (this.state.loaded) {
        return opts.render(this.state.loaded, this.props);
      } else {
        return null;
      }
    }
  }

  return LoadableComponent;
}

/**
 * 创建单个动态加载组件
 * @param {Object} opts - 配置选项
 * @returns {React.Component} 动态加载组件
 */
function Loadable(opts) {
  return createLoadableComponent(load, opts);
}

/**
 * 创建多模块动态加载组件
 * @param {Object} opts - 配置选项，需包含 render 函数
 * @returns {React.Component} 动态加载组件
 */
function LoadableMap(opts) {
  if (typeof opts.render !== 'function') {
    throw new Error('LoadableMap requires a `render(loaded, props)` function');
  }

  return createLoadableComponent(loadMap, opts);
}

// 绑定 LoadableMap 到 Loadable
Loadable.Map = LoadableMap;

/**
 * 执行初始化器，加载模块
 * @param {Array<Function>} initializers - 初始化器数组
 * @param {Array<string>} ids - 模块 ID 数组
 * @returns {Promise} 加载完成的 Promise
 */
function flushInitializers(initializers, ids) {
  let promises = [];

  while (initializers.length) {
    let init = initializers.pop();
    promises.push(init(ids));
  }

  return Promise.all(promises).then(() => {
    if (initializers.length) {
      return flushInitializers(initializers, ids);
    }
  });
}

/**
 * 预加载所有动态组件
 * @returns {Promise} 加载完成的 Promise
 */
Loadable.preloadAll = () => {
  return new Promise((resolve, reject) => {
    flushInitializers(ALL_INITIALIZERS).then(resolve, reject);
  });
};

/**
 * 预加载指定模块
 * @param {Array<string>} ids - 模块 ID 数组
 * @returns {Promise} 加载完成的 Promise
 */
Loadable.preloadReady = (ids = []) => {
  return new Promise((resolve) => {
    const res = () => {
      initialized = true;
      return resolve();
    };
    flushInitializers(READY_INITIALIZERS, ids).then(res, res);
  });
};

// 客户端：绑定 preloadReady 到全局
if (typeof window !== 'undefined') {
  window.__NEXT_PRELOADREADY = Loadable.preloadReady;
}

// 导出 Loadable，支持 CommonJS 和 ES Module
module.exports = {
  Loadable
};


 /*

 loadable.js
作用：实现 React Loadable（动态导入库），支持按需加载 React 组件，兼容 Webpack 4 和 Next.js 9.1.1 的 SSR。
保留功能：
单模块加载：Loadable 和 load 函数。
预加载：preloadAll（服务端）、preloadReady（客户端）。
SSR 兼容：通过 loadable-context.js 捕获模块名。
retry 功能（加载失败重试）。




示例 1：动态加载组件（SSR）
请求：GET http://localhost:3000/dashboard

执行：
on-demand-entry-handler.js 编译 pages/dashboard.jsx.
get-page-files.js 获取 [static/development/pages/dashboard.js].
normalize-page-path.js 规范化路径 /dashboard.
loadable.js 的 Loadable 创建 Chart 组件，调用 loader: () => import('../components/Chart').    !!!!!!!!!!!!!!!!!!!!!!!!!!
loadable-context.js 的 LoadableContext 捕获模块名 ../components/Chart，确保 SSR 打包。         !!!!!!!!!!!!!!!!!!!!!!!!!!
_document.js 渲染 HTML，htmlescape.js 转义 __NEXT_DATA__.
send-html.js 发送 HTML，设置 ETag, Content-Type.

渲染页面：
Dashboard
Data Visualization

打包：.next/static/chunks/Chart.<hash>.js 单独生成，SSR 时包含。                               !!!!!!!!!!!!!!!!!!!!!!!!!!










功能一致性:
load: 加载单个模块，返回状态对象（loading, loaded, error, promise）。

loadMap: 加载多个模块，返回状态对象。

resolve: 解析模块默认导出。

render: 渲染加载完成的组件。

createLoadableComponent: 创建动态加载组件，支持延迟、超时、自定义渲染。

Loadable: 主函数，创建单个动态组件。

LoadableMap: 创建多模块动态组件，需自定义 render。

preloadAll, preloadReady: 预加载组件，支持服务端和客户端。

示例:
javascript

const Loadable = require('../lib/loadable');
const MyComponent = Loadable({
  loader: () => import('../components/MyComponent'),
  loading: () => <div>加载中...</div>,
});



/****** */