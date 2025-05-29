 
// 该文件基于 https://github.com/jamiebuilds/react-loadable/blob/master/src/babel.js
// 修改以支持 `next/dynamic` 导入
// 将 `webpack` 和 `modules` 放入 `loadableGenerated` 以兼容 next/dynamic 的 `modules` 键
// 支持 `dynamic(import('something'))` 和 `dynamic(import('something'), options)`

 

/**
 * Babel 插件：处理 next/dynamic 动态导入，生成 loadableGenerated 属性
 * @param {Object} param - 包含 types 的对象
 * @returns {Object} Babel 插件对象
 */
export default function ({ types: t }) {
  return {
    visitor: {
      /**
       * 处理 ImportDeclaration 节点
       * @param {Object} path - Babel 遍历路径
       */
      ImportDeclaration(path) {
        // 检查是否为 next/dynamic 导入
        let source = path.node.source.value
        if (source !== 'next/dynamic') return// 只处理引入 'next/dynamic' 的 import 语句

        // 查找默认导入说明符   即：import dynamic from 'next/dynamic' 中的 dynamic）
        let defaultSpecifier = path.get('specifiers').find((specifier) => {
          return specifier.isImportDefaultSpecifier()
        })

        if (!defaultSpecifier) return

        // 获取绑定名称和绑定对象  
        const bindingName = defaultSpecifier.node.local.name
        const binding = path.scope.getBinding(bindingName)

        if (!binding) return

        // 遍历引用路径  // 遍历 dynamic 被调用的地方
        binding.referencePaths.forEach((refPath) => {
          let callExpression = refPath.parentPath

          // 处理 dynamic.Map 的情况
          if (
            callExpression.isMemberExpression() &&
            callExpression.node.computed === false
          ) {
            const property = callExpression.get('property')
            if (!Array.isArray(property) && property.isIdentifier({ name: 'Map' })) {
              callExpression = callExpression.parentPath
            }
          }

          // 确保是调用表达式
          if (!callExpression.isCallExpression()) return

          // 检查参数数量
          let args = callExpression.get('arguments')
          if (args.length > 2) {
            throw callExpression.buildCodeFrameError(
              'next/dynamic 仅接受最多 2 个参数'
            )
          }

          if (!args[0]) return

          let loader
          let options

          // 处理参数：loader 或 options
          if (args[0].isObjectExpression()) {
            options = args[0]
          } else {
            if (!args[1]) {
              callExpression.node.arguments.push(t.objectExpression([]))
            }
            args = callExpression.get('arguments')
            loader = args[0]
            options = args[1]
          }

          if (!options.isObjectExpression()) return

          // 获取选项属性
          let properties = options.get('properties')
          let propertiesMap = {}

          properties.forEach((property) => {
            const key = property.get('key')
            propertiesMap[key.node.name] = property
          })

          // 如果已有 loadableGenerated，跳过
          if (propertiesMap.loadableGenerated) return

          // 获取 loader 或 modules
          if (propertiesMap.loader) {
            loader = propertiesMap.loader.get('value')
          }

          if (propertiesMap.modules) {
            loader = propertiesMap.modules.get('value')
          }

          if (!loader || Array.isArray(loader)) return

          // 收集动态导入
          const dynamicImports = []

          loader.traverse({  // 遍历 loader 中的 import(...) 调用
            Import(path) {
              const args = path.parentPath.get('arguments')
              if (!Array.isArray(args)) return
              const node = args[0].node
              dynamicImports.push(node)
            },
          })

          if (!dynamicImports.length) return

          // 添加 loadableGenerated 属性  // 插入 loadableGenerated 字段，包括 webpack 和 modules 信息
          options.node.properties.push(
            t.objectProperty(
              t.identifier('loadableGenerated'),
              t.objectExpression([
                t.objectProperty(
                  t.identifier('webpack'),
                  t.arrowFunctionExpression(
                    [],
                    t.arrayExpression(
                      dynamicImports.map((dynamicImport) => {
                        return t.callExpression(
                          t.memberExpression(
                            t.identifier('require'),
                            t.identifier('resolveWeak')
                          ),
                          [dynamicImport]
                        )
                      })
                    )
                  )
                ),
                t.objectProperty(
                  t.identifier('modules'),
                  t.arrayExpression(dynamicImports)
                ),
              ])
            )
          )

          // 将 dynamic(import(...)) 转为 dynamic(() => import(...)) 以保持兼容性
          // 将 dynamic(import('something')) 转换为 dynamic(() => import('something'))
          if (loader.isCallExpression()) {
            const arrowFunction = t.arrowFunctionExpression([], loader.node)
            loader.replaceWith(arrowFunction)
          }
        })
      },
    },
  }
}


/*
代码功能说明
作用：这是一个 Babel 插件，处理 Next.js 中的 next/dynamic 动态导入，生成 loadableGenerated 属性以支持 React Loadable 的模块加载，并确保向后兼容性。

主要功能：
检测 import dynamic from 'next/dynamic' 语句。

分析 dynamic() 调用，提取 loader（动态导入，如 import('something')）和 options（配置对象）。

收集动态导入的模块路径。

在 options 中添加 loadableGenerated 属性，包含：
webpack：生成 require.resolveWeak 的调用，用于 Webpack 模块解析。

modules：动态导入的模块路径数组。

将 dynamic(import('something')) 转换为 dynamic(() => import('something'))，兼容 Next.js 7 以下版本。

验证 dynamic() 调用的参数数量（最多 2 个）。

逻辑：
使用 visitor 遍历 ImportDeclaration 节点，检查 next/dynamic 导入。

跟踪 dynamic 的引用路径，分析调用表达式。

遍历 loader 中的 Import 节点，收集动态导入路径。

修改 AST，添加 loadableGenerated 属性并转换 loader。

用途：
支持 Next.js 的动态组件加载（如 next/dynamic）。

优化 Webpack 的模块分包（通过 require.resolveWeak）。

提供向后兼容性，处理旧版 dynamic 语法。


/*** */