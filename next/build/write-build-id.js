// 导入文件系统模块 
import fs from 'fs'
// 导入 util 的 promisify 方法，用于将回调函数转换为 Promise
import { promisify } from 'util'
// 导入路径拼接模块
import { join } from 'path'
// 导入 Next.js 服务器常量，包含构建 ID 文件名
import { BUILD_ID_FILE } from '../next-server/lib/constants'

// 将 fs.writeFile 方法转换为 Promise 版本
const writeFile = promisify(fs.writeFile)

/**
 * 写入构建 ID 到指定文件
 * @param {string} distDir 输出目录路径
 * @param {string} buildId 构建 ID
 * @returns {Promise<void>} 无返回值
 */
export async function writeBuildId(distDir, buildId) {
  // 拼接构建 ID 文件路径
  const buildIdPath = join(distDir, BUILD_ID_FILE)
  // 将构建 ID 写入文件
  await writeFile(buildIdPath, buildId, 'utf8')
}