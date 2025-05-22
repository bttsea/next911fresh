/* global window, location */

import fetch from 'unfetch';
import { getEventSourceWrapper } from './error-overlay/eventsource';

// 全局事件源实例
let evtSource;
// 当前页面路径
export let currentPage;

/**
 * 关闭当前的心跳检测连接
 */
export function closePing() {
  if (evtSource) evtSource.close();
  evtSource = null;
}

/**
 * 设置心跳检测，通知服务器当前活跃页面
 * @param {string} assetPrefix - 资源前缀
 * @param {Function} pathnameFn - 获取当前页面路径的函数
 * @param {boolean} retry - 是否强制重试
 */
export function setupPing(assetPrefix, pathnameFn, retry) {
  const pathname = pathnameFn();

  // 如果页面未变化且非重试模式，则跳过
  if (pathname === currentPage && !retry) return;
  currentPage = pathname;
  // 关闭现有的事件源连接
  closePing();

  // 构造 HMR 事件源 URL，包含当前页面路径
  const url = `${assetPrefix}/_next/webpack-hmr?page=${currentPage}`;
  evtSource = getEventSourceWrapper({ path: url, timeout: 5000, ondemand: 1 });

  // 监听事件源消息
  evtSource.addMessageListener(event => {
    // 忽略非 JSON 数据
    if (event.data.indexOf('{') === -1) return;
    try {
      const payload = JSON.parse(event.data);
      if (payload.invalid) {
        // 如果页面失效，检查页面是否仍存在
        fetch(location.href, {
          credentials: 'same-origin',
        }).then(pageRes => {
          // 如果页面存在（状态码 200），重新加载
          if (pageRes.status === 200) {
            location.reload();
          }
        });
      }
    } catch (err) {
      console.error('按需加载解析响应失败', err);
    }
  });
}




/*

关键逻辑
获取页面路径：
pathnameFn() 返回当前页面路径（例如，/index 或 /about），通常由 on-demand-entries-client.js 提供（如 () => Router.pathname）。

更新 currentPage：
将路径存储在 currentPage 变量中，确保只在页面变化时重新建立连接。

构造 URL：
生成事件源 URL：${assetPrefix}/_next/webpack-hmr?page=${currentPage}，将页面路径作为查询参数。

例如：/_next/webpack-hmr?page=/index。

建立事件源连接：
使用 getEventSourceWrapper 创建 EventSource 连接，发送心跳到服务器。
使用 getEventSourceWrapper 创建 EventSource 连接，发送心跳到服务器。
使用 getEventSourceWrapper 创建 EventSource 连接，发送心跳到服务器。
使用 getEventSourceWrapper 创建 EventSource 连接，发送心跳到服务器。
使用 getEventSourceWrapper 创建 EventSource 连接，发送心跳到服务器。



服务器接收 page 参数，得知当前活跃页面，只编译相关页面。

处理失效事件：
监听服务器返回的 invalid 事件，检查页面状态并可能触发重载。



















开发环境专属：开发环境专属：开发环境专属：开发环境专属：开发环境专属：开发环境专属：
该模块仅在开发环境中使用（由 on-demand-entries-client.js 调用），生产环境中不加载。
依赖 /_next/webpack-hmr 端点（由 Next.js 开发服务器提供）。




on-demand-entries-utils.js 的用途
在 Next.js 9.1.1 中，client/on-demand-entries-utils.js 是开发环境的辅助模块，为按需加载（on-demand entries）功能提供核心工具函数。它的主要功能包括：
心跳检测：

通过 setupPing 建立事件源连接（/_next/webpack-hmr?page=<pathname>），通知服务器当前活跃页面。
通过 setupPing 建立事件源连接（/_next/webpack-hmr?page=<pathname>），通知服务器当前活跃页面。
通过 setupPing 建立事件源连接（/_next/webpack-hmr?page=<pathname>），通知服务器当前活跃页面。
通过 setupPing 建立事件源连接（/_next/webpack-hmr?page=<pathname>），通知服务器当前活跃页面。
通过 setupPing 建立事件源连接（/_next/webpack-hmr?page=<pathname>），通知服务器当前活跃页面。



服务器根据心跳信息仅编译活跃页面，减少未访问页面的编译开销。

连接管理：
使用 closePing 关闭事件源连接，释放资源。

维护全局 evtSource（事件源实例）和 currentPage（当前页面路径）。

页面失效处理：
监听 HMR 事件，处理 invalid 状态（页面失效），通过 fetch 检查页面是否存在，若存在则触发重载（location.reload）。

集成：
被 on-demand-entries-client.js 导入和调用，配合路由事件和可见性变化实现按需编译。

/****** */











/* global window, location

import fetch from 'unfetch'
import { getEventSourceWrapper } from './error-overlay/eventsource'

let evtSource
export let currentPage

export function closePing () {
  if (evtSource) evtSource.close()
  evtSource = null
}

export function setupPing (assetPrefix, pathnameFn, retry) {
  const pathname = pathnameFn()

  // Make sure to only create new EventSource request if page has changed
  if (pathname === currentPage && !retry) return
  currentPage = pathname
  // close current EventSource connection
  closePing()

  const url = `${assetPrefix}/_next/webpack-hmr?page=${currentPage}`
  evtSource = getEventSourceWrapper({ path: url, timeout: 5000, ondemand: 1 })

  evtSource.addMessageListener(event => {
    if (event.data.indexOf('{') === -1) return
    try {
      const payload = JSON.parse(event.data)
      if (payload.invalid) {
        // Payload can be invalid even if the page does not exist.
        // So, we need to make sure it exists before reloading.
        fetch(location.href, {
          credentials: 'same-origin'
        }).then(pageRes => {
          if (pageRes.status === 200) {
            location.reload()
          }
        })
      }
    } catch (err) {
      console.error('on-demand-entries failed to parse response', err)
    }
  })
}
 */