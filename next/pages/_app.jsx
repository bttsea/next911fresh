// 导入 React 和 ErrorInfo
import React, { ErrorInfo } from 'react';
// 导入 PropTypes 用于类型检查
import PropTypes from 'prop-types';
// 导入 Next.js 提供的工具函数
import {
  execOnce,
  loadGetInitialProps,
  
 
} from '../next-server/lib/utils';

 

// 导入 Next.js 客户端路由相关模块
import { Router, makePublicRouterInstance } from '../client/router';
 

/**
 * appGetInitialProps 函数用于获取页面的初始 props
 * @param {Object} param0 - 包含 Component 和 ctx 的上下文对象
 * @returns {Promise<Object>} - 返回页面 props
 */
async function appGetInitialProps({ Component, ctx }) {
  // 调用 loadGetInitialProps 获取页面组件的初始 props
  const pageProps = await loadGetInitialProps(Component, ctx);
  return { pageProps };
}

/**
 * App 组件是 Next.js 应用的入口组件，用于页面初始化
 * 允许在导航间保持状态、自定义错误处理、注入额外数据
 */
export default class App extends React.Component {
  // 定义子组件上下文类型
  static childContextTypes = {
    router: PropTypes.object,
  };

  // 静态方法，保存原始的 getInitialProps
  static origGetInitialProps = appGetInitialProps;
  static getInitialProps = appGetInitialProps;

  // 提供子组件上下文，返回公开的路由实例
  getChildContext() {
    return {
      router: makePublicRouterInstance(this.props.router),
    };
  }

  /**
   * 捕获组件树中的错误（已废弃）
   * @param {Error} error - 捕获的错误
   * @param {ErrorInfo} _errorInfo - 错误信息
   * @deprecated 错误现在在顶层处理，此方法不再需要
   */
  componentDidCatch(error, _errorInfo) {
    throw error;
  }

  // 渲染方法，渲染页面组件并传递 props 和 url
  render() {
    const { router, Component, pageProps } = this.props;
    const url = createUrl(router);
    return <Component {...pageProps} url={url} />;
  }
}

// 定义警告函数，用于开发环境下的废弃警告
let warnContainer;
let warnUrl;

if (process.env.NODE_ENV !== 'production') {
  // 警告 Container 组件已废弃
  warnContainer = execOnce(() => {
    console.warn(
      '警告：`_app` 中的 `Container` 已废弃，请移除。详见：https://err.sh/zeit/next.js/app-container-deprecated'
    );
  });

  // 警告 url 属性已废弃
  warnUrl = execOnce(() => {
    console.error(
      '警告：`url` 属性已废弃。详见：https://err.sh/zeit/next.js/url-deprecated'
    );
  });
}




/*

小结
 req=>
render(req, res)
    renderToHTML(req, res)
        renderToHTMLWithComponents(req, res)
            renderToHTML(req,res)
                _app.initialProps = loadGetInitialProps(App, { Component, router, ctx })
                _document.initialProps = loadGetInitialProps(Document, { ...ctx, renderPage })
                renderDocument(Document, _app.initialProps, _document.initialProps)
<=res


    对应
 req=>
    _app.getInitialProps()
        Component.getInitialProps()
    _document.getInitialProps()
        _app.render()
            Component.render()
    _document.render()
<=res
 /****** */


























/**
 * Container 组件（已废弃）   （已废弃）（已废弃）（已废弃）（已废弃）（已废弃）（已废弃）（已废弃）
 * @param {Object} p - 包含子组件的 props
 * @returns 子组件
 * @deprecated 仅为兼容性保留，计划移除
 */
export function Container(p) {
  if (process.env.NODE_ENV !== 'production') warnContainer();
  return p.children;
}

/**
 * 创建 URL 对象，封装路由相关信息和方法    （已废弃）（已废弃）（已废弃）（已废弃）（已废弃）（已废弃）（已废弃）
 * @param {Router} router - Next.js 路由实例
 * @returns {Object} - 包含路由信息和导航方法的 URL 对象
 */
export function createUrl(router) {
  const { pathname, asPath, query } = router;
  return {
    // 获取查询参数，开发环境触发废弃警告
    get query() {
      if (process.env.NODE_ENV !== 'production') warnUrl();
      return query;
    },
    // 获取路径名，开发环境触发废弃警告
    get pathname() {
      if (process.env.NODE_ENV !== 'production') warnUrl();
      return pathname;
    },
    // 获取 asPath，开发环境触发废弃警告
    get asPath() {
      if (process.env.NODE_ENV !== 'production') warnUrl();
      return asPath;
    },
    // 返回上一页
    back: () => {
      if (process.env.NODE_ENV !== 'production') warnUrl();
      router.back();
    },
    // 导航到指定 URL
    push: (url, as) => {
      if (process.env.NODE_ENV !== 'production') warnUrl();
      return router.push(url, as);
    },
    // 导航到指定路由（兼容旧版）
    pushTo: (href, as) => {
      if (process.env.NODE_ENV !== 'production') warnUrl();
      const pushRoute = as ? href : '';
      const pushUrl = as || href;
      return router.push(pushRoute, pushUrl);
    },
    // 替换当前页面到指定 URL
    replace: (url, as) => {
      if (process.env.NODE_ENV !== 'production') warnUrl();
      return router.replace(url, as);
    },
    // 替换当前页面到指定路由（兼容旧版）
    replaceTo: (href, as) => {
      if (process.env.NODE_ENV !== 'production') warnUrl();
      const replaceRoute = as ? href : '';
      const replaceUrl = as || href;
      return router.replace(replaceRoute, replaceUrl);
    },
  };
}