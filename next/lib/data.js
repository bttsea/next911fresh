/**
 * 创建 React Hook 用于数据获取
 */

// 引入模块
import { useContext } from 'react';
import { DataManagerContext } from '../next-server/lib/data-manager-context';
import { RouterContext } from '../next-server/lib/router-context';
import fetch from 'unfetch';
import { stringify } from 'querystring';

/**
 * 生成参数的唯一键
 * @param {Array<string|number|Array<string|number>>} args - 参数数组（字符串、数字或嵌套数组）
 * @returns {string} 拼接的参数键
 * @throws {Error} 如果参数不是字符串或数字
 */
function generateArgsKey(args) {
  return args.reduce((a, b) => {
    if (Array.isArray(b)) {
      return a + generateArgsKey(b);
    }
    if (typeof b !== 'string' && typeof b !== 'number') {
      throw new Error('参数只能是字符串或数字');
    }
    return a + b.toString();
  }, '');
}

/**
 * 创建 React Hook 用于数据获取
 * @param {Function} fetcher - 数据获取函数，接收参数并返回 Promise
 * @param {Object} options - 配置对象
 * @param {string} options.key - 数据键前缀
 * @returns {Function} React Hook 函数，接收参数并返回数据
 * @throws {Error} 如果未提供 options.key 或客户端与服务器参数不匹配
 */
function createHook(fetcher, options) {
  if (!options.key) {
    throw new Error('createHook 的 options 必须提供 key');
  }

  return function useData(...args) {
    const router = useContext(RouterContext);
    const dataManager = useContext(DataManagerContext);
    const key = `${options.key}${generateArgsKey(args)}`;
    const existing = dataManager.get(key);

    if (existing) {
      if (existing.status === 'resolved') {
        return existing.result;
      }
      if (existing === 'mismatched-key') {
        throw new Error('返回的数据缺少匹配的键，请确保客户端和服务器的参数一致');
      }
    }

    // 客户端环境：通过 fetch 获取数据
    if (typeof window !== 'undefined') {
      const res = fetch(router.route + '?' + stringify(router.query), {
        headers: {
          accept: 'application/amp.bind+json',
        },
      })
        .then(res => res.json())
        .then(result => {
          const hasKey = result.some(pair => pair[0] === key);
          if (!hasKey) {
            result = [[key, 'mismatched-key']];
          }
          dataManager.overwrite(result);
        });
      throw res;
    }

    // 服务器环境：调用 fetcher 获取数据
    const res = fetcher(...args).then(result => {
      dataManager.set(key, {
        status: 'resolved',
        result,
      });
    });
    throw res;
  };
}

// 导出模块，支持 CommonJS 和 ES Module
module.exports = { createHook };

/*
示例：
javascript

const { createHook } = require('./data');
const useMyData = createHook(async (id) => {
  const res = await fetch(`/api/data/${id}`);
  return res.json();
}, { key: 'my-data' });
// 在 React 组件中使用
function MyComponent() {
  const data = useMyData(123);
  return <div>{JSON.stringify(data)}</div>;
}










功能重要性
统一数据获取：
createHook 提供了一种标准化的方式，在客户端和服务器端一致地获取数据。

它桥接了 Next.js 的路由（RouterContext）和数据管理（DataManagerContext），简化了数据加载逻辑。

特别适合需要动态数据（例如 API 调用）的页面或组件。

支持 AMP：
文件支持 application/amp.bind+json 格式，专为 AMP（Accelerated Mobile Pages）优化。



/**** */