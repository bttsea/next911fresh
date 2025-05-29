/**
 * Webpack 插件：为 Next.js 生成第二个（现代）JavaScript 包
 *
 * @author: Janicklas Ralph (https://github.com/janicklas-ralph)
 *
 * 原始代码来源：https://github.com/prateekbh/babel-esm-plugin
 */
// 导入 Webpack 的相关模块
import {
  Compiler,
  compilation,
  RuleSetRule,
  RuleSetLoader,
  Output,
} from 'webpack';

// 导入 Webpack 的插件
const SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin');
const MultiEntryPlugin = require('webpack/lib/MultiEntryPlugin');
const JsonpTemplatePlugin = require('webpack/lib/web/JsonpTemplatePlugin');
const SplitChunksPlugin = require('webpack/lib/optimize/SplitChunksPlugin');
const RuntimeChunkPlugin = require('webpack/lib/optimize/RuntimeChunkPlugin');

// 插件名称
const PLUGIN_NAME = 'NextEsmPlugin';

/**
 * Webpack 插件类：NextEsmPlugin
 */
export default class NextEsmPlugin {
  /**
   * 构造函数
   * @param {Object} options - 插件选项
   * @param {any} options.filename - 输出文件名或函数
   * @param {any} options.chunkFilename - 块文件名或函数
   * @param {string[]} [options.excludedPlugins] - 排除的插件列表
   * @param {any[]} [options.additionalPlugins] - 附加的插件列表
   */
  constructor(options) {
    this.options = Object.assign(
      {
        excludedPlugins: [PLUGIN_NAME],
        additionalPlugins: [],
      },
      options
    );
  }

  /**
   * 应用插件到 Webpack 编译器
   * @param {Object} compiler - Webpack 编译器
   */
  apply(compiler) {
    // 监听 make 钩子，异步执行构建
    compiler.hooks.make.tapAsync(
      PLUGIN_NAME,
      (compilation, callback) => {
        this.runBuild(compiler, compilation).then(callback);
      }
    );
  }

  /**
   * 获取 Babel 加载器配置
   * @param {Array} rules - Webpack 模块规则
   * @returns {Object|undefined} Babel 加载器配置
   */
  getBabelLoader(rules) {
    for (let rule of rules) {
      if (!rule.use) continue;

      if (Array.isArray(rule.use)) {
        return rule.use.find(
          (r) => r.loader && r.loader.includes('next-babel-loader')
        );
      }

      const ruleUse = rule.use;
      const ruleLoader = rule.loader;
      if (
        (ruleUse.loader && ruleUse.loader.includes('next-babel-loader')) ||
        (ruleLoader && ruleLoader.includes('next-babel-loader'))
      ) {
        return ruleUse || rule;
      }
    }
  }

  /**
   * 更新子编译器选项
   * @param {Object} childCompiler - 子编译器
   */
  updateOptions(childCompiler) {
    if (!childCompiler.options.module) {
      throw new Error('Webpack.options.module not found!');
    }

    let babelLoader = this.getBabelLoader(childCompiler.options.module.rules);

    if (!babelLoader) {
      throw new Error('Babel-loader config not found!');
    }

    // 设置 Babel 加载器的现代化选项
    babelLoader.options = Object.assign({}, babelLoader.options, {
      isModern: true,
    });
  }

  /**
   * 更新资源和块
   * @param {Object} compilation - 主编译对象
   * @param {Object} childCompilation - 子编译对象
   */
  updateAssets(compilation, childCompilation) {
    // 合并资源
    compilation.assets = Object.assign(
      childCompilation.assets,
      compilation.assets
    );

    // 合并命名块组
    compilation.namedChunkGroups = Object.assign(
      childCompilation.namedChunkGroups,
      compilation.namedChunkGroups
    );

    // 创建子编译块映射
    const childChunkFileMap = childCompilation.chunks.reduce(
      (chunkMap, chunk) => {
        chunkMap[chunk.name] = chunk;
        return chunkMap;
      },
      {}
    );

    // 合并相同块的文件
    compilation.chunks.forEach((chunk) => {
      const childChunk = childChunkFileMap[chunk.name];

      if (childChunk && childChunk.files) {
        delete childChunkFileMap[chunk.name];
        chunk.files.push(
          ...childChunk.files.filter((v) => !chunk.files.includes(v))
        );
      }
    });

    // 添加仅现代化的块
    compilation.chunks.push(...Object.values(childChunkFileMap));

    // 将现代化块添加到正确的入口点
    compilation.entrypoints.forEach((entryPoint, entryPointName) => {
      const childEntryPoint = childCompilation.entrypoints.get(entryPointName);

      childEntryPoint.chunks.forEach((chunk) => {
        if (childChunkFileMap.hasOwnProperty(chunk.name)) {
          entryPoint.chunks.push(chunk);
        }
      });
    });
  }

  /**
   * 执行现代化构建
   * @param {Object} compiler - 主编译器
   * @param {Object} compilation - 主编译对象
   * @returns {Promise} 构建完成后的 Promise
   */
  async runBuild(compiler, compilation) {
    // 复制输出选项
    const outputOptions = { ...compiler.options.output };

    // 设置输出文件名
    if (typeof this.options.filename === 'function') {
      outputOptions.filename = this.options.filename(outputOptions.filename);
    } else {
      outputOptions.filename = this.options.filename;
    }

    // 设置块文件名
    if (typeof this.options.chunkFilename === 'function') {
      outputOptions.chunkFilename = this.options.chunkFilename(
        outputOptions.chunkFilename
      );
    } else {
      outputOptions.chunkFilename = this.options.chunkFilename;
    }

    // 过滤插件，排除指定插件并添加附加插件
    let plugins = (compiler.options.plugins || []).filter(
      (c) => !this.options.excludedPlugins.includes(c.constructor.name)
    );
    plugins = plugins.concat(this.options.additionalPlugins);

    // 创建子编译器
    const childCompiler = compilation.createChildCompiler(
      PLUGIN_NAME,
      outputOptions
    );

    // 配置子编译器的上下文和文件系统
    childCompiler.context = compiler.context;
    childCompiler.inputFileSystem = compiler.inputFileSystem;
    childCompiler.outputFileSystem = compiler.outputFileSystem;

    // 应用所有插件到子编译器
    if (Array.isArray(plugins)) {
      for (const plugin of plugins) {
        plugin.apply(childCompiler);
      }
    }

    // 处理入口
    let compilerEntries = compiler.options.entry;
    if (typeof compilerEntries === 'function') {
      compilerEntries = await compilerEntries();
    }
    if (typeof compilerEntries === 'string') {
      compilerEntries = { index: compilerEntries };
    }

    // 注册入口点
    Object.keys(compilerEntries).forEach((entry) => {
      const entryFiles = compilerEntries[entry];
      if (Array.isArray(entryFiles)) {
        new MultiEntryPlugin(compiler.context, entryFiles, entry).apply(
          childCompiler
        );
      } else {
        new SingleEntryPlugin(compiler.context, entryFiles, entry).apply(
          childCompiler
        );
      }
    });

    // 应用 JSONP 模板
    new JsonpTemplatePlugin().apply(childCompiler);

    // 应用优化配置
    const optimization = compiler.options.optimization;
    if (optimization) {
      if (optimization.splitChunks) {
        new SplitChunksPlugin(
          Object.assign({}, optimization.splitChunks)
        ).apply(childCompiler);
      }

      if (optimization.runtimeChunk) {
        new RuntimeChunkPlugin(
          Object.assign({}, optimization.runtimeChunk)
        ).apply(childCompiler);
      }
    }

    // 监听附加资源钩子
    compilation.hooks.additionalAssets.tapAsync(
      PLUGIN_NAME,
      (childProcessDone) => {
        // 更新子编译器选项
        this.updateOptions(childCompiler);

        // 运行子编译器
        childCompiler.runAsChild((err, entries, childCompilation) => {
          if (err) {
            return childProcessDone(err);
          }

          if (childCompilation.errors.length > 0) {
            return childProcessDone(childCompilation.errors[0]);
          }

          // 合并资源和块
          this.updateAssets(compilation, childCompilation);
          childProcessDone();
        });
      }
    );
  }
}


/*
代码功能说明
作用：
这是一个 Webpack 插件，用于 Next.js 9.1.1 的构建流程，通过子编译器生成第二个“现代”JavaScript 包，针对支持 ES Modules 的浏览器。

它基于 babel-esm-plugin（https://github.com/prateekbh/babel-esm-plugin），由 Janicklas Ralph 开发。

现代包通常使用 <script type="module">，而传统包使用 <script nomodule>，优化浏览器加载。

主要功能：
子编译器创建：
使用 compilation.createChildCompiler 创建子编译器，生成现代包。

配置输出选项（filename, chunkFilename），支持函数或字符串。

Babel 配置：
通过 getBabelLoader 查找 next-babel-loader，设置 isModern: true。

启用现代化转译（如 ES Modules、现代语法）。

入口处理：
支持单一入口（SingleEntryPlugin）和多入口（MultiEntryPlugin）。

处理动态入口（函数或字符串）。

插件和优化：
应用过滤后的父编译器插件（排除 excludedPlugins）。

添加 additionalPlugins。

应用 JsonpTemplatePlugin, SplitChunksPlugin, RuntimeChunkPlugin。

资源合并：
合并子编译器的资源（assets, namedChunkGroups）。

合并块文件（chunks.files），添加现代独有块。

更新入口点（entrypoints），确保现代块正确关联。

构建执行：
在 compiler.hooks.make 阶段异步运行子编译器。

在 compilation.hooks.additionalAssets 阶段合并资源。

逻辑：
创建子编译器，复制父编译器的上下文和文件系统。

配置现代化输出（filename, chunkFilename）。

动态处理入口，应用优化插件。

合并现代和传统包的资源，确保块和入口一致。

处理错误和子编译器异常。

用途：
在 Next.js 9.1.1 的构建流程中，生成现代 JavaScript 包，优化现代浏览器性能。

支持双份包策略（modern 和 legacy），兼容新旧浏览器。

在 H:\next911fresh\next\build\webpack-config.js 中通过 plugins 配置：
javascript

plugins: [
  new NextEsmPlugin({
    filename: '[name].module.js',
    chunkFilename: '[name].module.js',
    excludedPlugins: ['SomePlugin'],
    additionalPlugins: [new SomePlugin()],
  }),
]


/*** */