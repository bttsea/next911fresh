// 引入 webpack 中的 loader 类型（虽然在 JS 中不会强制类型检查）
import { loader } from 'webpack'

// 定义一个空操作的 webpack loader：接收源代码，原样返回
const NoopLoader = function (source) {
  return source
}

// 导出该 loader，供 webpack 配置中使用
export default NoopLoader


/*
功能说明：
NoopLoader 是一个 无操作（No-op）Loader，也就是接收什么源码就返回什么，不做任何处理。

这个 Loader 在 webpack 中主要用于 占位 或 测试目的，可以跳过某些阶段的转换流程。
/*** */