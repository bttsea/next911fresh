// 导入 Babel 类型模块
import * as BabelTypes from '@babel/types'

// 匹配任意钩子函数（以 use 开头并跟大写字母）
const isHook = /^use[A-Z]/

// 匹配 React 内置钩子函数
const isBuiltInHook = /^use(Callback|Context|DebugValue|Effect|ImperativeHandle|LayoutEffect|Memo|Reducer|Ref|State)$/

/**
 * Babel 插件：优化 React 钩子函数的数组解构为对象解构
 * @param {Object} param - 包含 types 的对象
 * @returns {Object} Babel 插件对象
 */
export default function ({ types: t }) {
  // 定义访问者逻辑
  const visitor = {
    /**
     * 处理 CallExpression 节点
     * @param {Object} path - Babel 遍历路径
     * @param {Object} state - 插件状态
     */
    CallExpression(path, state) {
      const onlyBuiltIns = state.opts.onlyBuiltIns

      // 获取支持钩子函数的库列表
      const libs =
        state.opts.lib &&
        (state.opts.lib === true
          ? ['react', 'preact/hooks']
          : [].concat(state.opts.lib))

      // 仅处理变量声明中的函数调用
      if (path.parent.type !== 'VariableDeclarator') return

      // 仅处理返回值为数组解构的函数调用
      if (path.parent.id.type !== 'ArrayPattern') return

      // 获取钩子函数名称
      const hookName = path.node.callee.name

      // 如果指定了库，验证钩子函数来源
      if (libs) {
        const binding = path.scope.getBinding(hookName)
        // 非导入的钩子函数，跳过
        if (!binding || binding.kind !== 'module') return

        const specifier = binding.path.parent.source.value
        // 非指定库的导入，跳过
        if (!libs.some((lib) => lib === specifier)) return
      }

      // 验证函数名称是否为钩子函数
      if (!(onlyBuiltIns ? isBuiltInHook : isHook).test(hookName)) return

      // 将数组解构转换为对象解构
      path.parent.id = t.objectPattern(
        path.parent.id.elements.reduce((patterns, element, i) => {
          if (element === null) {
            return patterns
          }

          return patterns.concat(
            t.objectProperty(t.numericLiteral(i), element)
          )
        }, [])
      )
    },
  }

  return {
    // 插件名称
    name: 'optimize-hook-destructuring',
    visitor: {
      /**
       * 在 Program 节点处理
       * @param {Object} path - Babel 遍历路径
       * @param {Object} state - 插件状态
       */
      Program(path, state) {
        // 在 preset-env 破坏解构赋值前运行
        path.traverse(visitor, state)
      },
    },
  }
}

/*
代码功能说明
作用：
这是一个 Babel 插件，用于优化 React 钩子函数（如 useState, useEffect）的数组解构赋值，将其转换为对象解构赋值，以提高代码可压缩性和性能。
例如，将 const [state, setState] = useState(0) 转换为 const {0: state, 1: setState} = useState(0)。

主要功能：
检测钩子函数调用（通过 isHook 或 isBuiltInHook 正则匹配）。
验证调用是否在变量声明中，且返回值使用数组解构。
如果指定了 state.opts.lib（如 ['react', 'preact/hooks']），确保钩子函数来自指定库。
将数组解构（[a, b]）转换为对象解构（{0: a, 1: b}）。
在 Program 节点提前运行，防止 preset-env 破坏解构赋值。

逻辑：
使用 visitor 遍历 CallExpression 节点，检查钩子函数调用。
通过 path.scope.getBinding 验证钩子函数的导入来源（仅限模块导入）。
使用 t.objectPattern 重写解构赋值，保留原始变量名。
通过 state.opts.onlyBuiltIns 控制是否仅优化内置钩子。

用途：
优化客户端 bundle，减少解构赋值的运行时开销。
提高代码在压缩工具（如 Terser）中的压缩效率，因为对象解构更易于优化。
支持 React 和 Preact 的钩子函数，兼容 Next.js 的组件。

/**** */