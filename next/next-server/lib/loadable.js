// loadable.js
 
// MIT 授权，原始作者 James Kyle（me@thejameskyle.com）
// 修改以兼容 Webpack 4 与 Next.js，源代码来自：https://github.com/jamiebuilds/react-loadable

import React from 'react'
import { LoadableContext } from './loadable-context'

// 所有需要初始化的模块（用于服务端预加载）
const ALL_INITIALIZERS = []
// 所有准备好的初始化模块（用于客户端按需加载）
const READY_INITIALIZERS = []

let initialized = false // 标记是否初始化完 READY_INITIALIZERS

/**
 * 加载一个模块
 * @param {Function} loader - 返回 Promise 的函数
 */
function load(loader) {
  const promise = loader()

  const state = {
    loading: true,
    loaded: null,
    error: null
  }

  state.promise = promise
    .then(loaded => {
      state.loading = false
      state.loaded = loaded
      return loaded
    })
    .catch(err => {
      state.loading = false
      state.error = err
      throw err
    })

  return state
}

 

/**
 * 获取默认导出（兼容 ES 模块）
 */
function resolve(obj) {
  return obj && obj.__esModule ? obj.default : obj
}

/**
 * 默认渲染方法，传入 loaded 模块和 props，生成 React 元素
 */
function render(loaded, props) {
  return React.createElement(resolve(loaded), props)
}

/**
 * 创建 Loadable 组件类
 */
function createLoadableComponent(loadFn, options) {
  const opts = Object.assign(
    {
      loader: null,
      loading: null,
      delay: 200,
      timeout: null,
      render,
      webpack: null,
      modules: null
    },
    options
  )

  let res = null

  function init() {
    if (!res) {
      res = loadFn(opts.loader)
    }
    return res.promise
  }

  // 服务端：提前注册所有的 init 方法
  if (typeof window === 'undefined') {
    ALL_INITIALIZERS.push(init)
  }

  // 客户端：注册按需加载器
  if (!initialized && typeof window !== 'undefined' && typeof opts.webpack === 'function') {
    const moduleIds = opts.webpack()
    READY_INITIALIZERS.push(ids => {
      for (const moduleId of moduleIds) {
        if (ids.indexOf(moduleId) !== -1) {
          return init()
        }
      }
    })
  }

  return class LoadableComponent extends React.Component {
    constructor(props) {
      super(props)
      init()

      this.state = {
        error: res.error,
        pastDelay: false,
        timedOut: false,
        loading: res.loading,
        loaded: res.loaded
      }
    }

    static preload() {
      return init()
    }

    static contextType = LoadableContext

    // React 生命周期（旧 API）：组件即将挂载
    UNSAFE_componentWillMount() {
      this._mounted = true
      this._loadModule()
    }

    // 加载模块
    _loadModule() {
      if (this.context && Array.isArray(opts.modules)) {
        opts.modules.forEach(m => {
          this.context(m)
        })
      }

      if (!res.loading) return

      // 延迟状态处理
      if (typeof opts.delay === 'number') {
        if (opts.delay === 0) {
          this.setState({ pastDelay: true })
        } else {
          this._delay = setTimeout(() => {
            this.setState({ pastDelay: true })
          }, opts.delay)
        }
      }

      // 超时处理
      if (typeof opts.timeout === 'number') {
        this._timeout = setTimeout(() => {
          this.setState({ timedOut: true })
        }, opts.timeout)
      }

      const update = () => {
        if (!this._mounted) return

        this.setState({
          error: res.error,
          loaded: res.loaded,
          loading: res.loading
        })

        this._clearTimeouts()
      }

      res.promise.then(update).catch(update)
    }

    componentWillUnmount() {
      this._mounted = false
      this._clearTimeouts()
    }

    _clearTimeouts() {
      clearTimeout(this._delay)
      clearTimeout(this._timeout)
    }

    // 重试加载
    retry = () => {
      this.setState({ error: null, loading: true, timedOut: false })
      res = loadFn(opts.loader)
      this._loadModule()
    }

    render() {
      if (this.state.loading || this.state.error) {
        return React.createElement(opts.loading, {
          isLoading: this.state.loading,
          pastDelay: this.state.pastDelay,
          timedOut: this.state.timedOut,
          error: this.state.error,
          retry: this.retry
        })
      } else if (this.state.loaded) {
        return opts.render(this.state.loaded, this.props)
      } else {
        return null
      }
    }
  }
}

/**
 * 创建一个 Loadable 单模块组件
 */
function Loadable(opts) {
  return createLoadableComponent(load, opts)
}

 

/**
 * 执行并清空所有初始加载器
 */
function flushInitializers(initializers, ids) {
  const promises = []

  while (initializers.length) {
    const init = initializers.pop()
    promises.push(init(ids))
  }

  return Promise.all(promises).then(() => {
    if (initializers.length) {
      return flushInitializers(initializers, ids)
    }
  })
}

// 服务端预加载全部模块
Loadable.preloadAll = () => {
  return new Promise((resolve, reject) => {
    flushInitializers(ALL_INITIALIZERS).then(resolve, reject)
  })
}

// 客户端根据模块 ID 预加载模块
Loadable.preloadReady = (ids = []) => {
  return new Promise(resolve => {
    const res = () => {
      initialized = true
      return resolve()
    }
    flushInitializers(READY_INITIALIZERS, ids).then(res, res)
  })
}

// 注入 Next.js 客户端预加载支持
if (typeof window !== 'undefined') {
  window.__NEXT_PRELOADREADY = Loadable.preloadReady
}

export default Loadable


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