// 存储全局事件回调
const eventCallbacks = [];

/**
 * 事件源包装器，管理 Webpack HMR 和按需加载的事件流
 * @param {Object} options - 配置选项
 * @param {string} options.path - 事件源 URL（如 /_next/webpack-hmr）
 * @param {number} [options.timeout=20000] - 超时时间（毫秒）
 * @param {boolean} [options.log] - 是否记录日志
 * @returns {Object} - 事件源实例，包含 close 和 addMessageListener 方法
 */
function EventSourceWrapper(options) {
  let source; // 事件源实例
  let lastActivity = new Date(); // 最后活跃时间
  let listeners = []; // 消息监听器列表

  // 设置默认超时时间（20秒）
  if (!options.timeout) {
    options.timeout = 20 * 1000;
  }

  // 初始化事件源
  init();
  // 每隔 timeout/2 检查是否超时
  const timer = setInterval(function () {
    if (new Date() - lastActivity > options.timeout) {
      handleDisconnect();
    }
  }, options.timeout / 2);

  /**
   * 初始化事件源连接
   */
  function init() {
    source = new window.EventSource(options.path);
    source.onopen = handleOnline;
    source.onerror = handleDisconnect;
    source.onmessage = handleMessage;    ///===!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  }

  /**
   * 处理连接成功事件
   */
  function handleOnline() {
    if (options.log) console.log('[HMR] 已连接');
    lastActivity = new Date();
  }

  /**
   * 处理消息事件，分发给监听器和全局回调
   * @param {Event} event - 事件对象
   */
  function handleMessage(event) {        ///===!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    lastActivity = new Date();
    // 分发给所有监听器
    for (let i = 0; i < listeners.length; i++) {
      listeners[i](event);
    }
    // 如果消息包含 'action'，触发全局回调
    if (event.data.indexOf('action') !== -1) {
      eventCallbacks.forEach(cb => cb(event));
    }
  }

  /**
   * 处理断开连接，关闭当前连接并延迟重连
   */
  function handleDisconnect() {
    clearInterval(timer);
    source.close();
    setTimeout(init, options.timeout);
  }

  return {
    /**
     * 关闭事件源连接
     */
    close: () => {
      clearTimeout(timer);
      source.close();
    },
    /**
     * 添加消息监听器
     * @param {Function} fn - 监听回调函数
     */
    addMessageListener: function (fn) {
      listeners.push(fn);
    },
  };
}

/**
 * 获取事件源包装器实例
 * @param {Object} options - 配置选项
 * @param {string} options.path - 事件源 URL
 * @param {number} [options.timeout] - 超时时间
 * @param {boolean} [options.log] - 是否记录日志
 * @param {number} [options.ondemand] - 是否按需创建实例
 * @returns {Object} - 事件源包装器或简化的监听器接口
 */
export function getEventSourceWrapper(options) {
  // 非按需模式，仅返回全局监听器接口
  if (!options.ondemand) {
    return {
      addMessageListener: cb => {
        eventCallbacks.push(cb);
      },
    };
  }
  // 按需模式，返回完整的事件源包装器
  return EventSourceWrapper(options);
}

/*
与 WebSocket 的区别
EventSource：单向（服务器 → 客户端），简单，适合推送通知。
WebSocket：双向，复杂，适合实时交互（如聊天应用）。




window.EventSource 的简单例子
以下是一个简单的示例，展示如何使用 EventSource 接收服务器推送的消息，并在页面上显示。
1. 服务器端代码（Node.js 示例）
创建一个简单的服务器，使用 text/event-stream 格式推送消息。
javascript

// server.js
const http = require('http');

http.createServer((req, res) => {
  if (req.url === '/events') {
    // 设置 SSE 响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // 每秒推送一条消息
    const interval = setInterval(() => {
      const message = `data: 当前时间: ${new Date().toLocaleTimeString()}\n\n`;
      res.write(message);
    }, 1000);

    // 客户端断开时清理
    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  } else {
    // 提供简单的 HTML 页面
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <body>
        <h1>实时消息</h1>
        <div id="messages"></div>
        <script>
          const source = new EventSource('/events');
          source.onmessage = function(event) {
            const div = document.getElementById('messages');
            div.innerHTML += '<p>' + event.data + '</p>';
          };
          source.onerror = function() {
            console.log('事件源连接错误');
          };
        </script>
      </body>
      </html>
    `);
  }
}).listen(3000, () => {
  console.log('服务器运行在 http://localhost:3000');
});

2. 客户端代码（嵌入在 HTML 中）
客户端使用 EventSource 连接到 /events 端点，接收服务器推送的时间消息并显示在页面上。
关键部分（从上面的 HTML 提取）：

const source = new EventSource('/events');
source.onmessage = function(event) {
  const div = document.getElementById('messages');
  div.innerHTML += '<p>' + event.data + '</p>';
};
source.onerror = function() {
  console.log('事件源连接错误');
};

3. 运行示例
保存服务器代码为 server.js。

安装 Node.js（如果未安装）。

运行服务器：
node server.js

打开浏览器，访问 http://localhost:3000。

页面每秒显示一条新消息，例如：

当前时间: 11:25:01 PM
当前时间: 11:25:02 PM
当前时间: 11:25:03 PM
...











































eventsource.js 的用途
在 Next.js 9.1.1 中，client/error-overlay/eventsource.js 是一个开发环境的辅助模块，提供事件源（EventSource）包装器，用于处理 Webpack 热模块替换（HMR）和按需加载（on-demand entries）的事件流。它的主要功能包括：
事件源管理：
创建 EventSource 连接（如 /_next/webpack-hmr），接收服务器推送的事件。

支持超时检测（默认 20 秒），自动断线重连。

消息分发：
将事件分发给本地监听器（listeners）和全局回调（eventCallbacks）。

特别处理包含 action 的消息（如 HMR 事件），触发全局回调。

按需模式：
支持 ondemand 模式，按需创建事件源实例（用于 on-demand-entries-utils.js 等）。

非 ondemand 模式仅提供全局监听器接口（用于 webpack-hot-middleware-client.js 等）。

断线重连：
检测连接断开（onerror）或超时（lastActivity），自动重连。

集成：
被多个模块调用（如 on-demand-entries-utils.js、webpack-hot-middleware-client.js），支持 HMR 和按需编译。

此模块是 Next.js 开发环境中事件驱动功能（如 HMR、按需加载、构建状态监控）的核心组件。
核心组件
核心组件
核心组件
核心组件
核心组件
核心组件
核心组件
核心组件

/****** */





















/*const eventCallbacks = []

function EventSourceWrapper (options) {
  var source
  var lastActivity = new Date()
  var listeners = []

  if (!options.timeout) {
    options.timeout = 20 * 1000
  }

  init()
  var timer = setInterval(function () {
    if (new Date() - lastActivity > options.timeout) {
      handleDisconnect()
    }
  }, options.timeout / 2)

  function init () {
    source = new window.EventSource(options.path)
    source.onopen = handleOnline
    source.onerror = handleDisconnect
    source.onmessage = handleMessage
  }

  function handleOnline () {
    if (options.log) console.log('[HMR] connected')
    lastActivity = new Date()
  }

  function handleMessage (event) {
    lastActivity = new Date()
    for (var i = 0; i < listeners.length; i++) {
      listeners[i](event)
    }
    if (event.data.indexOf('action') !== -1) {
      eventCallbacks.forEach(cb => cb(event))
    }
  }

  function handleDisconnect () {
    clearInterval(timer)
    source.close()
    setTimeout(init, options.timeout)
  }

  return {
    close: () => {
      clearTimeout(timer)
      source.close()
    },
    addMessageListener: function (fn) {
      listeners.push(fn)
    }
  }
}

export function getEventSourceWrapper (options) {
  if (!options.ondemand) {
    return {
      addMessageListener: cb => {
        eventCallbacks.push(cb)
      }
    }
  }
  return EventSourceWrapper(options)
}
/***** */