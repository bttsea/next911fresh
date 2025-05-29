// 导入 Babel 类型模块
import * as BabelTypes from '@babel/types'

// 定义客户端文件丢弃标识符
export const dropBundleIdentifier = '__NEXT_DROP_CLIENT_FILE__'
// 跟踪 SPR（静态页面再生）状态
export const sprStatus = { used: false }

// 支持的页面配置键
const configKeys = new Set(['amp'])
// 页面组件变量名
const pageComponentVar = '__NEXT_COMP'
// 预渲染标识符（需短以避免压缩问题）
const prerenderId = '__NEXT_SPR'
// 导出名称
const EXPORT_NAME_GET_STATIC_PROPS = 'unstable_getStaticProps'
const EXPORT_NAME_GET_STATIC_PARAMS = 'unstable_getStaticParams'

/**
 * 替换程序路径为包含丢弃标识符的变量声明
 * @param {Object} path - Babel 遍历路径
 * @param {Object} t - Babel 类型对象
 */
function replaceBundle(path, t) {
  path.parentPath.replaceWith(
    t.program(
      [
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('config'),
            t.assignmentExpression(
              '=',
              t.identifier(dropBundleIdentifier),
              t.stringLiteral(`${dropBundleIdentifier} ${Date.now()}`)
            )
          ),
        ]),
      ],
      []
    )
  )
}

/**
 * Babel 插件：处理页面配置，优化客户端 bundle
 * @param {Object} param - 包含 types 的对象
 * @returns {Object} Babel 插件对象
 */
export default function nextPageConfig({ types: t }) {
  return {
    visitor: {
      /**
       * 在 Program 节点进入时执行
       * @param {Object} path - Babel 遍历路径
       * @param {Object} state - 插件状态
       */
      Program: {
        enter(path, state) {
          path.traverse(
            {
              /**
               * 处理 ExportNamedDeclaration 节点
               * @param {Object} path - Babel 遍历路径
               * @param {Object} state - 插件状态
               */
              ExportNamedDeclaration(path, state) {
                if (state.bundleDropped || !path.node.declaration) {
                  return
                }
                const { declarations, id } = path.node.declaration
                const config = {}

                // 删除客户端 bundle 中的 SSR 导出
                if (
                  id &&
                  (id.name === EXPORT_NAME_GET_STATIC_PROPS ||
                    id.name === EXPORT_NAME_GET_STATIC_PARAMS)
                ) {
                  if (id.name === EXPORT_NAME_GET_STATIC_PROPS) {
                    state.isPrerender = true
                    sprStatus.used = true
                  }
                  path.remove()
                  return
                }

                if (!declarations) {
                  return
                }
                for (const declaration of declarations) {
                  if (declaration.id.name !== 'config') {
                    continue
                  }

                  // 验证配置为对象
                  if (declaration.init.type !== 'ObjectExpression') {
                    const pageName =
                      (state.filename || '').split(state.cwd || '').pop() ||
                      'unknown'
                    throw new Error(
                      `无效的页面配置导出。应为对象，但得到 ${declaration.init.type}，文件：${pageName}. 参见：https://nextjs.org/docs/messages/invalid-error`
                    )
                  }

                  // 解析配置项
                  for (const prop of declaration.init.properties) {
                    const name = prop.key.name
                    if (name in configKeys) {
                      config[name] = prop.value;
                    }
                  }
                }

                // 如果启用 AMP，替换为丢弃标识
                if (config.amp === true) {
                  replaceBundle(path, t)
                  state.bundleDropped = true
                  return
                }
              },
            },   state)
        },
      },

      /**
       * 处理 ExportDefaultDeclaration 节点
       * @param {Object} path - Babel 遍历路径
       * @param {Object} state - 插件状态
       */
      ExportDefaultDeclaration(path, state) {
        if (!state.isPrerender) {
          return
        }

        // 克隆默认导出的声明
        const prev = t.cloneDeep(path.node.default);

        // 处理类声明的赋值
        let prevType = prev.node.type
        if (prevType.endsWith('Declaration')) {
          prevType = prevType.replace(/Declaration$/, 'Expression')
        }

        // 插入变量声明和 SPR 标记
        path.insertBefore([
          t.variableDeclaration('const', [
            t.variableDeclarator(t.identifier(pageComponentVar), prev),
          ]),
          t.assignmentExpression(
            '=',
            t.memberExpression(
              t.identifier(pageComponentVar),
              t.identifier(prerenderId)
            ),
            t.booleanLiteral(true)
          ),
        ])

        // 更新默认导出为组件变量
        path.node.declaration = t.identifier(pageComponentVar)
      },
    },
  }

}


/*
代码功能说明
作用：
这是一个 Babel 插件，用于处理 Next.js 页面配置，优化客户端 bundle，特别是在静态页面再生（SPR）和 AMP 页面场景中。

它解析页面中的 config 导出，删除服务端渲染（SSR）相关导出（如 unstable_getStaticProps），并为 SPR 页面添加标识。

主要功能：
Program 遍历：
检测 export { config } 和 SSR 导出（如 unstable_getStaticProps, unstable_getStaticParams）。
解析 config 对象，提取支持的键（如 amp）。
如果 config.amp === true，替换客户端 bundle 为丢弃标识（__NEXT_DROP_CLIENT_FILE__）。
删除 SSR 导出，标记 SPR 页面（state.isPrerender 和 sprStatus.used）。
验证 config 为对象，否则抛出错误。

ExportDefaultDeclaration 处理：
如果页面是 SPR（state.isPrerender），将默认导出的组件存储到变量 __NEXT_COMP。
添加 __NEXT_COMP.__NEXT_SPR = true 标记。
更新默认导出为 __NEXT_COMP。

逻辑：
使用 visitor 遍历 Program 和 ExportNamedDeclaration 节点，处理配置和 SSR 导出。
使用 ExportDefaultDeclaration 为 SPR 页面注入标记。
通过 replaceBundle 替换 AMP 页面的 AST，优化客户端输出。

用途：
优化客户端 bundle，移除不必要的 SSR 逻辑。
支持 SPR（通过 unstable_getStaticProps），标记预渲染页面。
处理 AMP 页面，丢弃客户端 bundle。

/***/