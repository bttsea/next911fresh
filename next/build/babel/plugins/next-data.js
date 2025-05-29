// 导入 Babel 类型模块
import * as BabelTypes from '@babel/types'

/**
 * Babel 插件：处理 next/data 模块的 createHook 导入，添加 key 属性
 * @param {Object} param - 包含 types 的对象
 * @returns {Object} Babel 插件对象
 */
export default function ({ types: t }) {
  return {
    visitor: {
      /**
       * 处理 ImportDeclaration 节点
       * @param {Object} path - Babel 遍历路径
       * @param {Object} state - 插件状态
       */
      ImportDeclaration(path, state) {
        // 检查是否为 next/data 导入
        const source = path.node.source.value
        if (source !== 'next/data') return

        // 查找 createHook 导入说明符
        const createHookSpecifier = path.get('specifiers').find((specifier) => {
          return (
            specifier.isImportSpecifier() &&
            specifier.node.imported.name === 'createHook'
          )
        })

        if (!createHookSpecifier) return

        // 获取绑定名称和绑定对象
        const bindingName = createHookSpecifier.node.local.name
        const binding = path.scope.getBinding(bindingName)

        if (!binding) return

        // 遍历 createHook 的引用路径
        binding.referencePaths.forEach((refPath) => {
          let callExpression = refPath.parentPath

          // 确保是调用表达式
          if (!callExpression.isCallExpression()) return

          // 获取参数
          let args = callExpression.get('arguments')

          // 验证第一个参数是否存在
          if (!args[0]) {
            throw callExpression.buildCodeFrameError(
              'createHook 的第一个参数应为函数'
            )
          }

          // 如果没有第二个参数，添加空对象
          if (!args[1]) {
            callExpression.node.arguments.push(t.objectExpression([]))
          }

          // 重新获取参数（因可能修改）
          args = callExpression.get('arguments')

          // 在第二个参数（选项对象）中添加 key 属性
          args[1].node.properties.push(
            t.objectProperty(
              t.identifier('key'),
              t.stringLiteral(state.opts.key)
            )
          )
        })
      },
    },
  }
}


/*   非常少见且实验性   非常少见且实验性   非常少见且实验性   非常少见且实验性   非常少见且实验性  
import { createHook } from 'next/data' 是 Next.js 中一个非常少见且实验性的 API（目前大多版本中并没有正式文档化说明），大多数项目不需要也不会使用它。




代码功能说明
作用：
这是一个 Babel 插件，用于处理 Next.js 中 import { createHook } from 'next/data' 的导入，为 createHook 函数调用的选项对象添加 key 属性。

next/data 可能是 Next.js 内部模块（在 Next.js 9.1.1 中未公开），createHook 可能与数据获取或钩子机制相关。

主要功能：
检测 import { createHook } from 'next/data' 语句。

找到 createHook 的绑定并跟踪其引用。

对于 createHook 的调用（如 createHook(func, options)）：
验证第一个参数（func）是否存在，否则抛出错误。

如果没有第二个参数（options），添加空对象 {}。

在 options 对象中添加 key 属性，值为 state.opts.key（插件选项）。

逻辑：
使用 visitor 遍历 ImportDeclaration 节点，检查 next/data 导入。

通过 path.scope.getBinding 获取 createHook 的绑定，遍历其引用路径。

修改 createHook 调用的 AST，确保选项对象包含 key 属性。

用途：
可能用于 Next.js 的数据获取机制（如 getInitialProps 或实验性数据钩子），为 createHook 调用注入唯一标识（key）。

确保 createHook 的调用符合预期格式，优化运行时行为。

/***** */