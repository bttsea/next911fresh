// 引入许可证信息
 

// 基于 https://github.com/developit/mitt/blob/v1.1.3/src/index.js 修改
// 为适配项目需求进行了编辑
// 许可证信息见文件顶部

/**
 * 创建一个事件发布/订阅器
 * @returns {Object} 事件发射器对象，包含 on、off、emit 方法
 * @property {Function} on - 注册事件监听器
 * @property {Function} off - 移除事件监听器
 * @property {Function} emit - 触发事件
 */
function mitt() {
  // 存储所有事件类型及其监听器数组的对象
  const all = Object.create(null);

  return {
    /**
     * 注册事件监听器
     * @param {string} type - 事件类型
     * @param {Function} handler - 事件处理函数，接收任意参数
     */
    on(type, handler) {
      // 如果事件类型不存在，初始化为空数组，然后添加监听器
      (all[type] || (all[type] = [])).push(handler);
    },

    /**
     * 移除事件监听器
     * @param {string} type - 事件类型
     * @param {Function} handler - 要移除的事件处理函数
     */
    off(type, handler) {
      if (all[type]) {
        // 找到监听器索引并移除（>>> 0 确保正整数）
        all[type].splice(all[type].indexOf(handler) >>> 0, 1);
      }
    },

    /**
     * 触发事件，调用所有对应类型的监听器
     * @param {string} type - 事件类型
     * @param {...any} evts - 传递给监听器的参数
     */
    emit(type, ...evts) {
      // 复制监听器数组（避免修改时影响），逐个调用
      (all[type] || []).slice().forEach((handler) => {
        handler(...evts);
      });
    },
  };
}

// 导出函数，支持 CommonJS 和 ES Module
module.exports = mitt;


/*
引入函数:
CommonJS: 

const mitt = require('../lib/mitt');
const emitter = mitt();
emitter.on('test', (data) => console.log(data));
emitter.emit('test', 'Hello'); // 输出: Hello

ES Module: 

import mitt from '../lib/mitt';
const emitter = mitt();
emitter.on('test', (data) => console.log(data));
emitter.emit('test', 'Hello'); // 输出: Hello









示例：
const mitt = require('../lib/mitt');
const emitter = mitt();
emitter.on('event', (...args) => console.log('Event:', args));
emitter.emit('event', 1, 2, 3); // 输出: Event: [1, 2, 3]
emitter.off('event', handler);
emitter.emit('event', 4); // 无输出













[mitt.js]
└── mitt - 创建事件发射器
    ├── on - 注册事件监听
    ├── off - 移除事件监听
    └── emit - 触发事件

/***** */