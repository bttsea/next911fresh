// dynamic.js
/**
 * 动态导入 React 组件，支持单模块按需加载和 SSR
 * 基于 React Loadable，优化 Next.js 性能
 */
 const React = require('react');
 const Loadable = require('./loadable');
 
 const isServerSide = typeof window === 'undefined';
 
 /**
  * 禁用 SSR，仅客户端加载组件
  * @param {Function} LoadableInitializer - Loadable 函数
  * @param {Object} loadableOptions - 配置（loading, loader 等）
  * @returns {Function} - 组件构造函数
  */
 function noSSR(LoadableInitializer, loadableOptions) {
   // 删除 webpack 和 modules 配置，防止预加载行为
   delete loadableOptions.webpack;
   delete loadableOptions.modules

   // 客户端直接初始化
   if (!isServerSide) {
     return LoadableInitializer(loadableOptions);
   }
 
   const Loading = loadableOptions.loading;
   // 服务端渲染 Loading 组件
   return () => (
    <Loading error={null} isLoading pastDelay={false} timedOut={false} />
  )
 }
 
 /**
  * 创建动态加载组件（仅支持单模块）
  * @param {Function|Promise} dynamicOptions - 动态导入函数或 Promise（如 () => import('../Component')）
  * @param {Object} [options] - 配置（loading, ssr 等）
  * @returns {Function} - 动态加载组件
  */
 function dynamic(dynamicOptions, options) {

    let loadableFn = Loadable


   let loadableOptions = {
     // 默认 Loading 组件
     loading: ({ error, isLoading, pastDelay }) => {
       if (!pastDelay) return null;
       if (process.env.NODE_ENV === 'development') {
         if (isLoading) return null;
         if (error) {
          return (
            <p>
              {error.message}
              <br />
              {error.stack}
            </p>
          )
         }
       }
       return null;
     },
   };
 
   // 支持直接传入 Promise（如 dynamic(import('../Component')))
   if (dynamicOptions instanceof Promise) {
     loadableOptions.loader = () => dynamicOptions;
   // 支持传入函数（如 dynamic(() => import('../Component')))
   } else if (typeof dynamicOptions === 'function') {
     loadableOptions.loader = dynamicOptions;
   // 支持传入配置对象（如 dynamic({ loader: () => import('../Component') }))
   } else if (typeof dynamicOptions === 'object') {
     loadableOptions = { ...loadableOptions, ...dynamicOptions };
   }
 
   // 合并额外配置  // 如果 options 存在，将其合并到配置项中
   loadableOptions = { ...loadableOptions, ...options };
 
   // 合并 loadableGenerated 配置（来自 Babel 插件） // 合并由 Babel 插件生成的配置项 loadableGenerated
   if (loadableOptions.loadableGenerated) {
     loadableOptions = { ...loadableOptions, ...loadableOptions.loadableGenerated };
     delete loadableOptions.loadableGenerated;
   }
 
   // 支持禁用 SSR（如 { ssr: false }）
   if (typeof loadableOptions.ssr === 'boolean') {
     if (!loadableOptions.ssr) {
       delete loadableOptions.ssr;
       return noSSR(loadableFn, loadableOptions);
     }
     delete loadableOptions.ssr;
   }
 
   return loadableFn(loadableOptions);
 }
 
 module.exports = dynamic;


 /*
 作用：实现 next/dynamic，提供动态导入 React 组件的功能，支持按需加载（code-splitting）和服务端渲染（SSR），是 Next.js 对 React Loadable 的封装。

功能：
dynamic：创建动态加载组件，支持单模块（loader） 
noSSR：禁用 SSR，仅在客户端加载组件。
支持选项：loading（加载中 UI）、render（自定义渲染）、ssr（是否启用 SSR）、webpack（模块 ID） 
集成 loadable.js（H:\next911new\next\next-server\lib\loadable.js）和 loadable-context.js（捕获模块名）。


/***** */