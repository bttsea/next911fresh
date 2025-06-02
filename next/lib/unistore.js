// // node_modules/unistore/dist/unistore.js
// function n(n2, t) {
//   for (var r in t)
//     n2[r] = t[r];
//   return n2;
// }
// module.exports = function(t) {
//   var r = [];
//   function u(n2) {
//     for (var t2 = [], u2 = 0; u2 < r.length; u2++)
//       r[u2] === n2 ? n2 = null : t2.push(r[u2]);
//     r = t2;
//   }
//   function e(u2, e2, o) {
//     t = e2 ? u2 : n(n({}, t), u2);
//     for (var i = r, f = 0; f < i.length; f++)
//       i[f](t, o);
//   }
//   return t = t || {}, { action: function(n2) {
//     function r2(t2) {
//       e(t2, false, n2);
//     }
//     return function() {
//       for (var u2 = arguments, e2 = [t], o = 0; o < arguments.length; o++)
//         e2.push(u2[o]);
//       var i = n2.apply(this, e2);
//       if (null != i)
//         return i.then ? i.then(r2) : r2(i);
//     };
//   }, setState: e, subscribe: function(n2) {
//     return r.push(n2), function() {
//       u(n2);
//     };
//   }, unsubscribe: u, getState: function() {
//     return t;
//   } };
// };

// 工具函数：合并对象的属性
/**
 * 合并源对象到目标对象
 * @param {Object} target - 目标对象
 * @param {Object} source - 源对象
 * @returns {Object} - 合并后的目标对象
 */
 function mergeObjects(target, source) {
  for (const key in source) {
    target[key] = source[key];
  }
  return target;
}

/**
 * 创建 unistore 状态存储
 * @param {Object} [initialState={}] - 初始状态对象
 * @returns {Object} - 包含状态管理方法的对象
 */
function createStore(initialState) {
  // 初始化状态，默认为空对象
  let state = initialState || {};
  // 存储订阅者（监听器）列表
  let subscribers = [];

  /**
   * 移除指定订阅者
   * @param {Function} subscriber - 要移除的订阅者函数
   */
  function unsubscribe(subscriber) {
    subscribers = subscribers.filter((sub) => sub !== subscriber);
  }

  /**
   * 更新状态并通知订阅者
   * @param {Object} update - 新状态或状态更新
   * @param {boolean} [replace=false] - 是否替换整个状态（否则合并）
   * @param {Function} [action] - 触发更新的动作函数（可选）
   */
  function setState(update, replace = false, action) {
    // 更新状态：替换或合并
    state = replace ? update : mergeObjects(mergeObjects({}, state), update);
    // 通知所有订阅者，传递当前状态和动作
    subscribers.forEach((subscriber) => subscriber(state, action));
  }

  /**
   * 创建动作函数
   * @param {Function} actionFn - 动作函数，接收状态和参数，返回状态更新
   * @returns {Function} - 包装后的动作函数
   */
  function action(actionFn) {
    return function (...args) {
      // 准备动作参数：当前状态和传入参数
      const actionArgs = [state, ...args];
      // 执行动作函数
      const result = actionFn.apply(this, actionArgs);

      // 处理返回值
      if (result != null) {
        // 如果返回 Promise，等待解析后更新状态
        if (result.then) {
          return result.then((update) => setState(update, false, actionFn));
        }
        // 否则直接更新状态
        setState(result, false, actionFn);
      }
    };
  }

  // 返回状态管理接口
  return {
    /**
     * 创建动作函数
     * @param {Function} actionFn - 动作函数
     * @returns {Function} - 包装后的动作函数
     */
    action,

    /**
     * 更新状态
     * @param {Object} update - 新状态或状态更新
     * @param {boolean} [replace=false] - 是否替换整个状态
     */
    setState,

    /**
     * 订阅状态变化
     * @param {Function} subscriber - 监听器函数
     * @returns {Function} - 取消订阅的函数
     */
    subscribe(subscriber) {
      subscribers.push(subscriber);
      return () => unsubscribe(subscriber);
    },

    /**
     * 取消订阅
     * @param {Function} subscriber - 要移除的监听器
     */
    unsubscribe,

    /**
     * 获取当前状态
     * @returns {Object} - 当前状态对象
     */
    getState() {
      return state;
    },
  };
}

// 导出 createStore 函数
module.exports = createStore;

/*
unistore 是一个轻量级的状态管理库（约 1KB），用于创建全局状态存储，类似于 Redux，但更简单。它在你的项目中由 store.js 使用，管理 Next.js 开发服务器的状态（如编译进度、错误、警告）。其主要功能包括：
状态存储：
创建一个全局状态对象（state），初始化为用户提供的对象或空对象 {}。

提供 getState 方法获取当前状态。

状态更新：
通过 setState 方法更新状态，支持同步和异步更新。

支持合并新状态（类似 Object.assign）或替换整个状态。

动作（Action）：
提供 action 方法创建动作函数，接收当前状态和参数，生成新的状态。

支持异步动作（返回 Promise），自动在 Promise 解析后更新状态。

订阅机制：
通过 subscribe 方法注册监听器，当状态变化时通知所有订阅者。

提供 unsubscribe 方法移除监听器。

优化订阅管理，确保移除无效监听器。

用途：
在 Next.js 开发服务器中，unistore 管理 CLI 输出状态（如 store.js 中的 appUrl, bootstrap, errors），与 log.js 配合输出格式化日志。

提供简单的状态管理，适合轻量级应用或开发工具。
/***** */
