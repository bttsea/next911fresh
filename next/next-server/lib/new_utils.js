// 引入 Node.js 内置的 url 模块，用于 URL 格式化
const { format } = require('url');

// 引入 http 模块，提供 HTTP 请求和响应对象
const { ServerResponse, IncomingMessage } = require('http');







































































































































































 

/*
// 行为：
// const logOnce = execOnce(() => console.log('Hello'));
// logOnce(); // 输出: Hello
// logOnce(); // 无输出
// 工具函数：只执行一次的函数包装器
function execOnce(fn) {
  let used = false;
  return (...args) => {
    if (!used) {
      used = true;
      fn.apply(this, args);
    }
  };
}
推荐：移除 apply，直接调用 fn： /***** */
// 工具函数：只执行一次的函数包装器
// 适用于不需要特定 this 上下文的函数
function execOnce(fn) {
  let used = false;
  return (...args) => {
    if (!used) {
      used = true;
      fn(...args); // 直接调用，忽略 this
    }
  };
}





// 获取当前页面的源地址（协议 + 主机名 + 端口）
function getLocationOrigin() {
  const { protocol, hostname, port } = window.location;
  return `${protocol}//${hostname}${port ? ':' + port : ''}`;
}

// 获取当前页面的相对路径（去除源地址部分）
function getURL() {
  const { href } = window.location;
  const origin = getLocationOrigin();
  return href.substring(origin.length);
}

// 获取 React 组件的显示名称
function getDisplayName(Component) {
  return typeof Component === 'string'
    ? Component
    : Component.displayName || Component.name || 'Unknown';
}

// 检查 HTTP 响应是否已发送
function isResSent(res) {
  return res.finished || res.headersSent;
}

// 异步加载组件的初始属性 (getInitialProps)
async function loadGetInitialProps(Component, ctx) {
  if (process.env.NODE_ENV !== 'production') {
    if (Component.prototype && Component.prototype.getInitialProps) {
      const message = `"${getDisplayName(
        Component
      )}.getInitialProps()" is defined as an instance method - visit https://err.sh/zeit/next.js/get-initial-props-as-an-instance-method for more information.`;
      throw new Error(message);
    }
  }

  // 处理嵌套的 ctx（例如在 _app 中）
  const res = ctx.res || (ctx.ctx && ctx.ctx.res);

  // 如果组件没有 getInitialProps 方法，返回空对象
  if (!Component.getInitialProps) {
    return {};
  }

  const props = await Component.getInitialProps(ctx);

  // 如果响应已发送，直接返回属性
  if (res && isResSent(res)) {
    return props;
  }

  // 验证返回的属性是对象
  if (!props) {
    const message = `"${getDisplayName(
      Component
    )}.getInitialProps()" should resolve to an object. But found "${props}" instead.`;
    throw new Error(message);
  }

  // 开发环境警告：空对象可能影响静态优化
  if (process.env.NODE_ENV !== 'production') {
    if (Object.keys(props).length === 0 && !ctx.ctx) {
      console.warn(
        `${getDisplayName(
          Component
        )} returned an empty object from \`getInitialProps\`. This de-optimizes and prevents automatic static optimization. https://err.sh/zeit/next.js/empty-object-getInitialProps`
      );
    }
  }

  return props;
}

// URL 对象支持的键列表
const urlObjectKeys = [
  'auth',
  'hash',
  'host',
  'hostname',
  'href',
  'path',
  'pathname',
  'port',
  'protocol',
  'query',
  'search',
  'slashes',
];

// 带验证的 URL 格式化函数
function formatWithValidation(url, options) {
  if (process.env.NODE_ENV === 'development') {
    if (url !== null && typeof url === 'object') {
      Object.keys(url).forEach((key) => {
        if (urlObjectKeys.indexOf(key) === -1) {
          console.warn(
            `Unknown key passed via urlObject into url.format: ${key}`
          );
        }
      });
    }
  }

  return format(url, options);
}

// 检查是否支持 performance API
const SUPPORTS_PERFORMANCE = typeof performance !== 'undefined';

// 检查是否支持 performance 用户计时 API
const SUPPORTS_PERFORMANCE_USER_TIMING =
  SUPPORTS_PERFORMANCE &&
  typeof performance.mark === 'function' &&
  typeof performance.measure === 'function';

// 导出所有工具函数和常量，支持 CommonJS 和 ES Module
module.exports = {
  execOnce,
  getLocationOrigin,
  getURL,
  getDisplayName,
  isResSent,
  loadGetInitialProps,
  urlObjectKeys,
  formatWithValidation,
  SUPPORTS_PERFORMANCE,
  SUPPORTS_PERFORMANCE_USER_TIMING,
};