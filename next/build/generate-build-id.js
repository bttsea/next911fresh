/** 
 * 生成构建 ID
 * @param {Function} generate 用于生成构建 ID 的函数，返回字符串或 null
 * @param {Function} fallback 回退生成构建 ID 的函数，返回字符串
 * @returns {Promise<string>} 最终的构建 ID
 */
export async function generateBuildId(generate, fallback) {
  // 调用生成函数获取构建 ID
  let buildId = await generate()
  // 如果生成函数未返回有效的构建 ID，则使用回退函数
  if (buildId === null) {
    // 循环生成，直到获取有效 ID 且不包含 'ad'（避免广告拦截器误判）
    while (!buildId || /ad/i.test(buildId)) {
      buildId = fallback()
    }
  }

  // 确保生成结果是字符串
  if (typeof buildId !== 'string') {
    throw new Error(
      'generateBuildId 未返回字符串。详情见：https://err.sh/zeit/next.js/generatebuildid-not-a-string'
    )
  }

  // 返回修剪后的构建 ID
  return buildId.trim()
}

/*
代码功能说明
作用：该文件提供了一个函数，用于生成 Next.js 构建过程中的唯一构建 ID（buildId），用于标识生产构建。

参数：
generate：用户自定义的构建 ID 生成函数，返回字符串或 null。

fallback：回退生成函数，当 generate 返回 null 或无效 ID 时使用。


/**** */