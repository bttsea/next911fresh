/**
 * Webpack 插件：性能分析插件，跟踪 Webpack 构建过程
 *
 * 代码来源：https://github.com/webpack/webpack/blob/master/lib/debug/ProfilingPlugin.js
 * 包含修复：https://github.com/webpack/webpack/pull/9566
 * 支持自定义跟踪器，跨多次构建捕获性能数据
 *
 * 许可证：MIT（详见文件头部）
 */

// 插件名称
const pluginName = 'ProfilingPlugin';

/**
 * Webpack 性能分析插件类
 */
export class ProfilingPlugin {
  // 跟踪器对象
  tracer;

  /**
   * 构造函数
   * @param {Object} opts - 插件选项
   * @param {Object} opts.tracer - 自定义跟踪器对象
   */
  constructor(opts) {
    this.tracer = opts.tracer;
  }

  /**
   * 应用插件到 Webpack 编译器
   * @param {Object} compiler - Webpack 编译器
   */
  apply(compiler) {
    const tracer = this.tracer;

    // 拦截 Compiler 钩子
    Object.keys(compiler.hooks).forEach((hookName) => {
      compiler.hooks[hookName].intercept(
        makeInterceptorFor('Compiler', tracer)(hookName)
      );
    });

    // 拦截 Resolver 钩子
    Object.keys(compiler.resolverFactory.hooks).forEach((hookName) => {
      compiler.resolverFactory.hooks[hookName].intercept(
        makeInterceptorFor('Resolver', tracer)(hookName)
      );
    });

    // 监听 compilation 钩子
    compiler.hooks.compilation.tap(
      pluginName,
      (compilation, { normalModuleFactory, contextModuleFactory }) => {
        // 拦截 Compilation 钩子
        interceptAllHooksFor(compilation, tracer, 'Compilation');
        // 拦截 Normal Module Factory 钩子
        interceptAllHooksFor(normalModuleFactory, tracer, 'Normal Module Factory');
        // 拦截 Context Module Factory 钩子
        interceptAllHooksFor(contextModuleFactory, tracer, 'Context Module Factory');
        // 拦截 Parser 钩子
        interceptAllParserHooks(normalModuleFactory, tracer);
        // 拦截模板实例钩子
        interceptTemplateInstancesFrom(compilation, tracer);
      }
    );
  }
}

/**
 * 拦截模板实例的钩子
 * @param {Object} compilation - 编译对象
 * @param {Object} tracer - 跟踪器对象
 */
const interceptTemplateInstancesFrom = (compilation, tracer) => {
  const { mainTemplate, chunkTemplate, hotUpdateChunkTemplate, moduleTemplates } =
    compilation;

  const { javascript, webassembly } = moduleTemplates;
  [
    { instance: mainTemplate, name: 'MainTemplate' },
    { instance: chunkTemplate, name: 'ChunkTemplate' },
    { instance: hotUpdateChunkTemplate, name: 'HotUpdateChunkTemplate' },
    { instance: javascript, name: 'JavaScriptModuleTemplate' },
    { instance: webassembly, name: 'WebAssemblyModuleTemplate' },
  ].forEach((templateObject) => {
    Object.keys(templateObject.instance.hooks).forEach((hookName) => {
      templateObject.instance.hooks[hookName].intercept(
        makeInterceptorFor(templateObject.name, tracer)(hookName)
      );
    });
  });
};

/**
 * 拦截指定实例的所有钩子
 * @param {Object} instance - 实例对象
 * @param {Object} tracer - 跟踪器对象
 * @param {string} logLabel - 日志标签
 */
const interceptAllHooksFor = (instance, tracer, logLabel) => {
  if (Reflect.has(instance, 'hooks')) {
    Object.keys(instance.hooks).forEach((hookName) => {
      instance.hooks[hookName].intercept(
        makeInterceptorFor(logLabel, tracer)(hookName)
      );
    });
  }
};

/**
 * 拦截所有解析器钩子
 * @param {Object} moduleFactory - 模块工厂
 * @param {Object} tracer - 跟踪器对象
 */
const interceptAllParserHooks = (moduleFactory, tracer) => {
  const moduleTypes = [
    'javascript/auto',
    'javascript/dynamic',
    'javascript/esm',
    'json',
    'webassembly/experimental',
  ];

  moduleTypes.forEach((moduleType) => {
    moduleFactory.hooks.parser.for(moduleType).tap('ProfilingPlugin', (parser) => {
      interceptAllHooksFor(parser, tracer, 'Parser');
    });
  });
};

/**
 * 创建钩子拦截器
 * @param {string} instance - 实例名称
 * @param {Object} tracer - 跟踪器对象
 * @returns {Function} 拦截器生成函数
 */
const makeInterceptorFor = (instance, tracer) => (hookName) => ({
  register: ({ name, type, context, fn }) => {
    const newFn = makeNewProfiledTapFn(hookName, tracer, { name, type, fn });
    return { name, type, context, fn: newFn };
  },
});

/**
 * 创建性能分析的钩子函数
 * @param {string} hookName - 钩子名称
 * @param {Object} tracer - 跟踪器对象
 * @param {Object} options - 钩子选项
 * @param {string} options.name - 插件名称
 * @param {string} options.type - 钩子类型（sync | async | promise）
 * @param {Function} options.fn - 原始钩子函数
 * @returns {Function} 新的钩子函数
 */
const makeNewProfiledTapFn = (hookName, tracer, { name, type, fn }) => {
  const defaultCategory = ['blink.user_timing'];

  switch (type) {
    case 'promise':
      return (...args) => {
        const id = ++tracer.counter;
        tracer.trace.begin({ name, id, cat: defaultCategory });
        const promise = fn(...args);
        return promise.then((r) => {
          tracer.trace.end({ name, id, cat: defaultCategory });
          return r;
        });
      };
    case 'async':
      return (...args) => {
        const id = ++tracer.counter;
        tracer.trace.begin({ name, id, cat: defaultCategory });
        const callback = args.pop();
        fn(...args, (...r) => {
          tracer.trace.end({ name, id, cat: defaultCategory });
          callback(...r);
        });
      };
    case 'sync':
      return (...args) => {
        const id = ++tracer.counter;
        // 避免分析自身插件
        if (name === pluginName) {
          return fn(...args);
        }

        tracer.trace.begin({ name, id, cat: defaultCategory });
        let r;
        try {
          r = fn(...args);
        } catch (error) {
          tracer.trace.end({ name, id, cat: defaultCategory });
          throw error;
        }
        tracer.trace.end({ name, id, cat: defaultCategory });
        return r;
      };
    default:
      return fn;
  }
};


/*
代码功能说明
作用：
这是一个 Webpack 插件，用于 Next.js 9.1.1 的构建流程，分析 Webpack 构建性能。

基于 Webpack 的 ProfilingPlugin（https://github.com/webpack/webpack/blob/master/lib/debug/ProfilingPlugin.js），包含修复（https://github.com/webpack/webpack/pull/9566）。

支持自定义跟踪器（tracer），可在多次构建中捕获性能数据。

主要功能：
拦截 Compiler 钩子：
遍历 compiler.hooks，为每个钩子添加拦截器，记录性能。

拦截 Resolver 钩子：
拦截 compiler.resolverFactory.hooks，分析解析器性能。

拦截 Compilation 钩子：
在 compiler.hooks.compilation 阶段，拦截 Compilation, Normal Module Factory, Context Module Factory 的钩子。

拦截 Parser 钩子（支持多种模块类型）。

拦截模板实例（MainTemplate, ChunkTemplate, HotUpdateChunkTemplate, JavaScriptModuleTemplate, WebAssemblyModuleTemplate）。

性能跟踪：
使用 tracer.trace.begin 和 tracer.trace.end 记录钩子执行时间。

支持 sync, async, promise 钩子类型。

使用 blink.user_timing 分类存储性能数据。


/**** */