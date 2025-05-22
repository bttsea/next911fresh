// 导入 Next.js 客户端初始化函数和所有模块
import initNext, * as next from './';
 
// 导入按需加载入口客户端
import initOnDemandEntries from './dev/on-demand-entries-client';
// 导入 Webpack 热更新客户端
import initWebpackHMR from './dev/webpack-hot-middleware-client';
// 导入构建监视器
import initializeBuildWatcher from './dev/dev-build-watcher';
// 导入预渲染指示器
import initializePrerenderIndicator from './dev/prerender-indicator';

 

// 从 window.__NEXT_DATA__ 获取资源前缀
const {
  __NEXT_DATA__: { assetPrefix },
} = window;

// 设置资源前缀，默认为空字符串
const prefix = assetPrefix || '';

// 初始化 Webpack 热更新客户端
const webpackHMR = initWebpackHMR({ assetPrefix: prefix });

/**
 * 将 Next.js 客户端模块挂载到全局 window 对象   !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * 提供对路由器、事件发射器等 API 的全局访问
 */
window.next = next;

/**
 * 初始化 Next.js 开发环境客户端
 * 包括加载应用、设置热更新、按需加载、构建监视器等
 */
initNext({ webpackHMR })
  .then(emitter => {
    // 初始化按需加载入口
    initOnDemandEntries({ assetPrefix: prefix });

    // 如果启用了构建指示器，初始化构建监视器
    if (process.env.__NEXT_BUILD_INDICATOR) {
      initializeBuildWatcher();
    }

    // 如果启用了预渲染指示器且不在 Electron 环境中，初始化预渲染指示器
    if (
      process.env.__NEXT_PRERENDER_INDICATOR &&
      !(typeof process !== 'undefined' && 'electron' in process.versions)
    ) {
      initializePrerenderIndicator();
    }

    // 移除 Next.js 的无 FOUC（闪屏）样式，仅在未定义任何 CSS 时生效
    (window.requestAnimationFrame || setTimeout)(function () {
      const elements = document.querySelectorAll('[data-next-hide-fouc]');
      for (let i = elements.length - 1; i >= 0; i--) {
        elements[i].parentNode.removeChild(elements[i]);
      }
    });

    // 保存错误页面渲染时的滚动位置
    let lastScroll;

    // 监听渲染前事件，记录错误页面时的滚动位置
    emitter.on('before-reactdom-render', ({ Component, ErrorComponent }) => {
      if (!lastScroll && Component === ErrorComponent) {
        const { pageXOffset, pageYOffset } = window;
        lastScroll = {
          x: pageXOffset,
          y: pageYOffset,
        };
      }
    });

    // 监听渲染后事件，恢复滚动位置
    emitter.on('after-reactdom-render', ({ Component, ErrorComponent }) => {
      if (lastScroll && Component !== ErrorComponent) {
        const { x, y } = lastScroll;
        window.scroll(x, y);
        lastScroll = null;
      }
    });
  })
  .catch(err => {
    // 捕获并记录初始化错误
    console.error('未捕获的错误', err);
  });




  /*
  next-dev.js 的用途
在 Next.js 9.1.1 中，client/next-dev.js 是开发环境的客户端入口点，扩展了 client/index.js 的功能，添加了开发专用的特性。它的主要功能包括：
初始化 Next.js 客户端：通过 initNext（来自 index.js）加载 _app 和页面组件，执行水合。

全局模块挂载：将 next 模块挂载到 window.next，提供对路由器、事件发射器等的访问。

将 next 模块挂载到 window.next 
将 next 模块挂载到 window.next
将 next 模块挂载到 window.next
将 next 模块挂载到 window.next
将 next 模块挂载到 window.next
将 next 模块挂载到 window.next
将 next 模块挂载到 window.next

开发特性：
EventSource 垫片：为 IE11 提供 EventSource 支持，用于 Webpack HMR（热模块替换）。
Webpack HMR：通过 initWebpackHMR 启用热更新，支持代码修改后实时刷新。
按需加载：通过 initOnDemandEntries 支持动态页面加载（on-demand entries）。
构建监视器：通过 initializeBuildWatcher 显示构建状态（如果启用）。
预渲染指示器：通过 initializePrerenderIndicator 显示预渲染状态（如果启用且非 Electron 环境）。
FOUC 样式移除：移除 Next.js 的无闪屏（Flash of Unstyled Content）样式，确保 CSS 加载后页面样式正确。
滚动恢复：在错误页面（ErrorComponent）切换回正常页面时恢复滚动位置。

/***** */