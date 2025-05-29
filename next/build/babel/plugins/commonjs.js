// 导入 Babel 核心模块
import commonjsPlugin from '@babel/plugin-transform-modules-commonjs'

/**
 * Babel 插件：将 next/<something> 导入重写为 next-server/<something>
 * @param {...any} args - 插件参数
 * @returns {Object} Babel 插件对象
 */
export default function NextToNextServer(...args) {
  // 初始化 CommonJS 转换插件
  const commonjs = commonjsPlugin(...args)

  return {
    visitor: {
      Program: {
        /**
         * 在 Program 节点退出时执行
         * @param {Object} path - Babel 遍历路径
         * @param {Object} state - 插件状态
         */
        exit(path, state) {
          let foundModuleExports = false

          // 遍历 AST 检查是否存在 module.exports
          path.traverse({
            MemberExpression(path) {
              if (path.node.object.name !== 'module') return
              if (path.node.property.name !== 'exports') return
              foundModuleExports = true
            },
          })

          // 如果没有找到 module.exports，直接返回
          if (!foundModuleExports) {
            return
          }

          // 调用 CommonJS 插件的 Program.exit 方法
          commonjs.visitor.Program.exit.call(this, path, state)
        },
      },
    },
  }
}

/*
代码功能说明
作用：这是一个 Babel 插件，用于在 Next.js 构建过程中将 next/<something> 导入重写为 next-server/<something>，
并确保 CommonJS 模块转换仅在存在 module.exports 时应用。

主要功能：
检查 AST（抽象语法树）中的 Program 节点，检测是否存在 module.exports。

如果存在 module.exports，调用 @babel/plugin-transform-modules-commonjs 的 Program.exit 方法，执行 CommonJS 转换。

如果不存在 module.exports，跳过转换。

逻辑：
使用 path.traverse 遍历 AST，查找 MemberExpression 节点，检查 module.exports。
仅当 foundModuleExports 为 true 时，应用 CommonJS 转换。


/***** */


/*
import { PluginObj } from '@babel/core'
import { NodePath } from '@babel/traverse'
import { Program } from '@babel/types'
import commonjsPlugin from '@babel/plugin-transform-modules-commonjs'
// Rewrite imports using next/<something> to next-server/<something>
export default function NextToNextServer(...args: any): PluginObj {
  const commonjs = commonjsPlugin(...args)
  return {
    visitor: {
      Program: {
        exit(path: NodePath<Program>, state) {
          let foundModuleExports = false
          path.traverse({
            MemberExpression(path: any) {
              if (path.node.object.name !== 'module') return
              if (path.node.property.name !== 'exports') return
              foundModuleExports = true
            },
          })

          if (!foundModuleExports) {
            return
          }

          commonjs.visitor.Program.exit.call(this, path, state)
        },
      },
    },
  }
}
/***** */