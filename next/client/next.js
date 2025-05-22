// 导入 Next.js 客户端初始化函数和所有模块
import initNext, * as next from './';

/**
 * 将 Next.js 客户端模块挂载到全局 window 对象
 * 允许通过 window.next 访问路由器、事件发射器等 
 * * 示例：window.next.router.push('/about')、window.next.emitter.on('before-reactdom-render', ...)
 */
window.next = next;

/**
 * 初始化 Next.js 客户端，执行以下步骤：
 * 1. 加载 _app 和页面组件
 * 2. 初始化路由器和页面加载器
 * 3. 执行客户端水合（ReactDOM.hydrate）
 * 4. 返回事件发射器（emitter）
 * @throws {Error} - 如果页面加载或渲染失败
 */
initNext().catch(err => {
   // 捕获初始化错误，打印错误消息和堆栈
  console.error(`${err.message}\n${err.stack}`);
});


 









/*
补充说明：initNext 和 next 的内容
根据你提供的 client/index.js 和其他文件，以下是 initNext 和 next 的具体内容：
initNext：
对应 client/index.js 的默认导出函数：
javascript

export default async ({ webpackHMR } = {}) => {
  // 初始化逻辑：加载 _app、页面组件，创建路由器，渲染应用
  // 返回 emitter（mitt 事件发射器）
}

功能：
加载 _app 和当前页面组件。

初始化路由器（router），设置页面加载器（PageLoader）。

执行客户端水合（ReactDOM.hydrate）或渲染（ReactDOM.render）。

返回 emitter 用于监听渲染事件（如 before-reactdom-render）。

next 模块：
* as next 导入 ./ 目录下的所有导出，可能包括：
client/index.js：version、dataManager、emitter、router、ErrorComponent、render、renderError。

client/router.js：Router、NextRouter、default（singletonRouter）、withRouter、useRouter、createRouter、makePublicRouterInstance。

client/head-manager.js：default（HeadManager 类）。

其他模块（如 link.js 的 Link、with-router.js 的 withRouter）。

示例：通过 window.next，你可以访问：
javascript

console.log(window.next.version); // Next.js 版本
console.log(window.next.router); // 单例路由器
window.next.useRouter(); // 获取路由器上下文


/**** */