// 导入 Babel 类型模块
import * as BabelTypes from '@babel/types'

/**
 * Babel 插件：处理 JSX 语法，自动注入 JSX Pragma（如 React.createElement）
 * @param {Object} param - 包含 types 的对象
 * @returns {Object} Babel 插件对象
 */
export default function ({ types: t }) {
  ///=== 函数参数使用了对象解构赋值 { types: t }，这表示函数期望接收一个对象参数，其中有一个 types 属性，
  // ///=== 并将其重命名为 t。


  return {
    // 继承 JSX 语法插件
    inherits: require('babel-plugin-syntax-jsx'),
    visitor: {
      /**
       * 处理 JSXElement 节点
       * @param {Object} path - Babel 遍历路径
       * @param {Object} state - 插件状态
       */
      JSXElement(path, state) {
        // 标记存在 JSX
        state.set('jsx', true)
      },

      /**
       * 处理 JSXFragment 节点
       * @param {Object} path - Babel 遍历路径
       * @param {Object} state - 插件状态
       */
      JSXFragment(path, state) {
        // 标记存在 JSX（Fragment 也视为 JSX）
        state.set('jsx', true)
      },

      /**
       * 在 Program 节点退出时执行
       * @param {Object} path - Babel 遍历路径
       * @param {Object} state - 插件状态
       */
      Program: {
        exit(path, state) {
          // 如果没有 JSX，直接返回
          if (!state.get('jsx')) return

          // 获取 pragma 标识符（如 __jsx）
          const pragma = t.identifier(state.opts.pragma)
          let importAs = pragma

          // 检查是否已有导入（如 React），避免重复导入
          const existingBinding =
            state.opts.reuseImport !== false &&
            state.opts.importAs &&
            path.scope.getBinding(state.opts.importAs)

          // 如果需要定义属性（如 React.createElement）
          if (state.opts.property) {
            if (state.opts.importAs) {
              importAs = t.identifier(state.opts.importAs)
            } else {
              // 生成唯一的 pragma 标识符
              importAs = path.scope.generateUidIdentifier('pragma')
            }

            // 创建变量声明：var _jsx = _pragma.createElement;
            const mapping = t.variableDeclaration('var', [
              t.variableDeclarator(
                pragma,
                t.memberExpression(importAs, t.identifier(state.opts.property))
              ),
            ])


            ///===转换后的 JavaScript 代码将 TypeScript 类型检查（如 t.isVariableDeclarator, t.isCallExpression, t.isIdentifier）
            // 替换为直接的属性检查（如 node.type === 'VariableDeclarator'）。


            // 如果已有 require('react') 的绑定，确保插入在之后
            if (
              existingBinding &&
              existingBinding.path.node.type === 'VariableDeclarator' &&
              existingBinding.path.node.init &&
              existingBinding.path.node.init.type === 'CallExpression' &&
            ///    existingBinding.path.node.init.callee.type === 'Identifier' && // 添加此检查
              existingBinding.path.node.init.callee.name === 'require'
            ) {
              existingBinding.path.parentPath.insertAfter(mapping)
            } else {
              // 否则插入到程序开头
              path.unshiftContainer('body', mapping)
            }
          }

          // 如果没有现有绑定，添加导入语句
          if (!existingBinding) {
            let importSpecifiers
            if (state.opts.import) {
              // 导入特定成员：import { $import as _pragma } from '$module'
              importSpecifiers = [
                t.importSpecifier(importAs, t.identifier(state.opts.import)),
              ]
            } else if (state.opts.importNamespace) {
              // 导入命名空间：import * as _pragma from '$module'
              importSpecifiers = [t.importNamespaceSpecifier(importAs)]
            } else {
              // 默认导入：import _pragma from '$module'
              importSpecifiers = [t.importDefaultSpecifier(importAs)]
            }

            // 创建导入声明
            const importDeclaration = t.importDeclaration(
              importSpecifiers,
              t.stringLiteral(state.opts.module || 'react')
            )

            // 插入到程序开头
            path.unshiftContainer('body', importDeclaration)
          }
        },
      },
    },
  }
}


/*
代码功能说明
作用：这是一个 Babel 插件，用于处理 JSX 语法，自动注入 JSX Pragma（如 React.createElement），避免手动导入 React。

主要功能：
检测 JSXElement 和 JSXFragment 节点，标记代码中存在 JSX。

在 Program 退出时，检查是否需要注入 Pragma：
如果存在 JSX，生成变量声明（如 var __jsx = React.createElement）。

如果没有现有导入（如 React），添加导入语句（如 import React from 'react'）。

支持自定义选项：
pragma：指定 Pragma 名称（如 __jsx）。
module：指定导入模块（如 react）。
importAs：指定导入别名。
import：指定命名导入。
importNamespace：使用命名空间导入。
property：指定 Pragma 属性（如 createElement）。
reuseImport：是否复用现有导入。

逻辑：
使用 visitor 遍历 JSXElement 和 JSXFragment 节点，设置 jsx 标志。
在 Program.exit 中，根据 state.opts 和 existingBinding 决定是否添加导入和变量声明。
确保导入插入位置正确（在 require('react') 之后或程序开头）。

用途：
简化 Next.js 项目中的 JSX 使用，无需手动导入 React。
确保 JSX 语法正确编译为 createElement 调用。

/**** */