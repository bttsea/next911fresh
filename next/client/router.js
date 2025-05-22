/* global window */
import React from 'react';
import Router from '../next-server/lib/router/router';
import { RouterContext } from '../next-server/lib/router-context';

// 导出 Router 和 NextRouter
export { Router };

// 单例路由器对象
const singletonRouter = {
  router: null, // 存储实际的路由器实例
  readyCallbacks: [], // 存储路由器就绪时的回调函数
  /**
   * 注册路由器就绪回调
   * @param {Function} cb - 路由器就绪时执行的回调
   */
  ready(cb) {
    if (this.router) return cb();
    if (typeof window !== 'undefined') {
      this.readyCallbacks.push(cb);
    }
  },
};

// 定义路由器的属性和事件
const urlPropertyFields = ['pathname', 'route', 'query', 'asPath', 'components'];
const routerEvents = [
  'routeChangeStart',
  'beforeHistoryChange',
  'routeChangeComplete',
  'routeChangeError',
  'hashChangeStart',
  'hashChangeComplete',
];
const coreMethodFields = [
  'push',
  'replace',
  'reload',
  'back',
  'prefetch',
  'beforePopState',
];

// 为单例路由器添加静态事件属性
Object.defineProperty(singletonRouter, 'events', {
  get() {
    return Router.events;
  },
});

// 为单例路由器添加 URL 属性
urlPropertyFields.forEach(field => {
  Object.defineProperty(singletonRouter, field, {
    /**
     * 获取路由器的指定属性值
     * @returns {string} - 属性值
     */
    get() {
      const router = getRouter();
      return router[field];
    },
  });
});

// 为单例路由器添加核心方法
coreMethodFields.forEach(field => {
  singletonRouter[field] = (...args) => {
    const router = getRouter();
    return router[field](...args);
  };
});

// 为单例路由器绑定事件监听
routerEvents.forEach(event => {
  singletonRouter.ready(() => {
    Router.events.on(event, (...args) => {
      const eventField = `on${event.charAt(0).toUpperCase()}${event.substring(1)}`;
      if (singletonRouter[eventField]) {
        try {
          singletonRouter[eventField](...args);
        } catch (err) {
          console.error(`运行路由器事件 ${eventField} 时出错`);
          console.error(`${err.message}\n${err.stack}`);
        }
      }
    });
  });
});

/**
 * 获取当前路由器实例
 * @returns {Router} - 路由器实例
 * @throws {Error} - 如果路由器未初始化
 */
function getRouter() {
  if (!singletonRouter.router) {
    const message =
      '未找到路由器实例。\n' +
      '请仅在客户端使用 "next/router"。\n';
    throw new Error(message);
  }
  return singletonRouter.router;
}

// 导出单例路由器作为公共 API
export default singletonRouter;

// 重新导出 withRouter 高阶组件
export { default as withRouter } from './with-router';

/**
 * 获取 RouterContext 中的路由器实例
 * @returns {NextRouter} - 路由器实例
 */
export function useRouter() {
  return React.useContext(RouterContext);
}

/**
 * 创建路由器实例并设置为单例
 * 仅在客户端初始化时使用，不应在服务器端使用
 * @param {...any} args - 路由器构造函数参数
 * @returns {Router} - 路由器实例
 */
export const createRouter = (...args) => {
  singletonRouter.router = new Router(...args);
  singletonRouter.readyCallbacks.forEach(cb => cb());
  singletonRouter.readyCallbacks = [];
  return singletonRouter.router;
};

/**
 * 创建公开的路由器实例，供 withRouter 使用
 * @param {Router} router - 路由器实例
 * @returns {NextRouter} - 公开的路由器实例
 */
export function makePublicRouterInstance(router) {
  const instance = {};

  for (const property of urlPropertyFields) {
    if (typeof router[property] === 'object') {
      instance[property] = { ...router[property] }; // 确保 query 等属性不是状态化的
      continue;
    }
    instance[property] = router[property];
  }

  instance.events = Router.events;

  coreMethodFields.forEach(field => {
    instance[field] = (...args) => {
      return router[field](...args);
    };
  });

  return instance;
}



/*
router.js 的用途
在 Next.js 9.1.1 中，client/router.js 是客户端路由管理的核心模块，负责：
单例路由器：通过 singletonRouter 提供全局路由器实例，管理路由状态和方法。
路由属性和方法：暴露 pathname、query、push、replace 等属性和方法，供组件使用。
事件监听：支持路由事件（如 routeChangeStart、routeChangeComplete），允许开发者订阅路由变化。
上下文提供：通过 RouterContext 和 useRouter 提供路由器实例，供 withRouter 和现代组件使用。
初始化：通过 createRouter 初始化路由器，makePublicRouterInstance 创建公开实例供 _app.jsx 和 withRouter 使用。

使用示例
以下是一个简单的示例，展示如何在 Next.js 9.1.1 中使用 router.js 的功能：
项目结构

my-next-app/
├── pages/
│   ├── _app.jsx        // 自定义 App 组件（使用你提供的 _app.jsx）
│   ├── index.jsx       // 首页
├── package.json

1. 首页 index.jsx

// pages/index.jsx
import React from 'react';
import { withRouter } from 'next/router';

class Home extends React.Component {
  handleNavigate = () => {
    this.props.router.push('/about');
  };

  render() {
    const { router } = this.props;
    return (
      <div>
        <h1>当前路径：{router.pathname}</h1>
        <button onClick={this.handleNavigate}>跳转到关于页面</button>
      </div>
    );
  }
}

export default withRouter(Home);

/***** */