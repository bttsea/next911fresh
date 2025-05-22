// 导入 HMR 客户端连接模块
import connect from './error-overlay/hot-dev-client';

/**
 * 初始化 Webpack 热模块替换（HMR）客户端
 * @param {Object} param - 配置参数
 * @param {string} param.assetPrefix - 资源前缀
 * @returns {Object} - HMR 客户端实例
 */
export default ({ assetPrefix }) => {
  // 配置 HMR 事件源路径
  const options = {
    path: `${assetPrefix}/_next/webpack-hmr`,
  };

  // 创建 HMR 客户端连接
  const devClient = connect(options);

  // 订阅 HMR 事件，处理页面重载和页面添加/移除
  devClient.subscribeToHmrEvent(obj => {
    // 处理不同 HMR 事件
    if (obj.action === 'reloadPage') {
      // 重新加载整个页面
      return window.location.reload();
    }
    if (obj.action === 'removedPage') {
      // 页面被移除：如果当前页面被移除，重新加载
      const [page] = obj.data;
      if (page === window.next.router.pathname) {
        return window.location.reload();
      }
      return;
    }
    if (obj.action === 'addedPage') {
      // 页面被添加：如果当前页面未缓存，重新加载
      const [page] = obj.data;
      if (
        page === window.next.router.pathname &&
        typeof window.next.router.components[page] === 'undefined'
      ) {
        return window.location.reload();
      }
      return;
    }
    // 未知事件：抛出错误
    throw new Error('未知的操作：' + obj.action);
  });

  // 返回 HMR 客户端实例
  return devClient;
};


/*
webpack-hot-middleware-client.js 的用途
在 Next.js 9.1.1 中，client/webpack-hot-middleware-client.js 是开发环境的模块，负责处理 Webpack 热模块替换（HMR）事件。它的主要功能包括：
HMR 客户端连接：
通过 connect（从 ./error-overlay/hot-dev-client 导入）建立与 Webpack HMR 服务器的连接（默认路径为 /_next/webpack-hmr）。

事件处理：
监听 HMR 事件（reloadPage、removedPage、addedPage），根据事件类型执行相应操作：
reloadPage：重新加载整个页面。
removedPage：如果当前页面被移除，重新加载页面。
addedPage：如果当前页面被添加且未缓存，重新加载页面。
未知事件抛出错误，确保开发者注意到异常。
集成：
由 next-dev.js 调用（通过 initWebpackHMR），提供开发环境的热重载支持。
与 router.js 配合，检查当前路由（window.next.router.pathname）和页面组件缓存（window.next.router.components）。

/***** */