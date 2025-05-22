/* global window */

import Router from 'next/router';
import { setupPing, currentPage, closePing } from './on-demand-entries-utils';

/**
 * 初始化按需加载客户端，管理页面按需编译和心跳检测
 * @param {Object} param - 配置参数
 * @param {string} param.assetPrefix - 资源前缀
 * @returns {Promise<void>}
 */
export default async ({ assetPrefix }) => {
  // 当路由器准备就绪时，绑定路由变化事件
  Router.ready(() => {
    Router.events.on(
      'routeChangeComplete',
      setupPing.bind(this, assetPrefix, () => Router.pathname)
    );
  });

  // 初始化心跳检测，监控当前页面
  setupPing(assetPrefix, () => Router.pathname, currentPage);

  // 仅在非测试模式下监听页面可见性变化
  if (!process.env.__NEXT_TEST_MODE) {
    document.addEventListener('visibilitychange', event => {
      const state = document.visibilityState;
      if (state === 'visible') {
        // 页面可见时，重新建立心跳检测
        setupPing(assetPrefix, () => Router.pathname, true);
      } else {
        // 页面隐藏时，关闭心跳检测
        closePing();
      }
    });
  }
};

/*
on-demand-entries-client.js 的用途
在 Next.js 9.1.1 中，client/on-demand-entries-client.js 是开发环境的模块，负责实现按需加载（on-demand entries）功能。它的主要功能包括：
按需编译：
通过心跳检测（setupPing）向服务器发送当前页面路径（Router.pathname），通知服务器保留或编译相关页面。
减少开发环境中未使用页面的编译，提升构建性能。
路由事件监听：
监听 Router.events 的 routeChangeComplete 事件，每次路由变化时更新心跳检测，确保服务器知道当前活跃页面。
页面可见性管理：
根据浏览器标签页的可见性（document.visibilityState）动态管理心跳：
可见时（visible）：重新建立心跳，通知服务器当前页面。
隐藏时（非 visible）：关闭心跳，减少服务器负载。

/***** */






/* global window 

import Router from 'next/router'
import { setupPing, currentPage, closePing } from './on-demand-entries-utils'

export default async ({ assetPrefix }) => {
  Router.ready(() => {
    Router.events.on(
      'routeChangeComplete',
      setupPing.bind(this, assetPrefix, () => Router.pathname)
    )
  })

  setupPing(assetPrefix, () => Router.pathname, currentPage)

  // prevent HMR connection from being closed when running tests
  if (!process.env.__NEXT_TEST_MODE) {
    document.addEventListener('visibilitychange', event => {
      const state = document.visibilityState
      if (state === 'visible') {
        setupPing(assetPrefix, () => Router.pathname, true)
      } else {
        closePing()
      }
    })
  }
}
*/