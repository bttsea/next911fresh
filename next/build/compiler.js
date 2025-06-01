// 导入 Webpack 模块 
import webpack from 'webpack'

/**
 * 生成编译统计结果
 * @param {Object} result 编译结果对象，包含 errors 和 warnings 数组
 * @param {Object} stat Webpack 统计对象
 * @returns {Object} 更新后的编译结果
 */
function generateStats(result, stat) {
  // 从 Webpack 统计对象中提取错误和警告
  const { errors, warnings } = stat.toJson({
    all: false,
    warnings: true,
    errors: true,
  })
  // 将错误添加到结果对象
  if (errors.length > 0) {
    result.errors.push(...errors)
  }
  // 将警告添加到结果对象
  if (warnings.length > 0) {
    result.warnings.push(...warnings)
  }

  return result
}

/**
 * 运行 Webpack 编译器
 * @param {Object|Object[]} config Webpack 配置对象或配置对象数组
 * @returns {Promise<Object>} 编译结果的 Promise，包含 errors 和 warnings
 */
export function runCompiler(config) {
  return new Promise((resolve, reject) => {
    // 创建 Webpack 编译器实例，支持单个配置或配置数组
    const compiler = webpack(config)
    // 运行编译
    compiler.run((err, statsOrMultiStats) => {
      if (err) {
        // 如果发生错误，直接拒绝 Promise
        return reject(err)
      }

      // 处理多配置统计结果
      if (statsOrMultiStats.stats) {
        const result = statsOrMultiStats.stats.reduce(
          generateStats,
          { errors: [], warnings: [] }
        )
        return resolve(result)
      }

      // 处理单配置统计结果
      const result = generateStats(
        { errors: [], warnings: [] },
        statsOrMultiStats
      )
      return resolve(result)
    })
  })
}


/*
代码功能说明
作用：该文件提供了运行 Webpack 编译的工具函数，用于 Next.js 构建过程中的编译任务。

主要函数：
generateStats：从 Webpack 统计对象中提取错误和警告，合并到结果对象中。

runCompiler：创建 Webpack 编译器实例，运行编译，支持单个配置或配置数组，返回包含错误和警告的编译结果。

输入与输出：
输入：Webpack 配置对象（config）或配置对象数组。

输出：Promise 解析为包含 errors 和 warnings 数组的对象。

错误处理：
如果编译过程中发生错误（如配置错误），通过 reject 返回。

错误和警告通过 stats.toJson 提取，分别存储在结果的 errors 和 warnings 数组中。

/**** */