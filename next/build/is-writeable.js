// 导入文件系统模块 
import fs from 'fs'
// 导入 util 的 promisify 方法，用于将回调函数转换为 Promise
import { promisify } from 'util'

// 将 fs.access 方法转换为 Promise 版本
const access = promisify(fs.access)

/**
 * 检查指定目录是否可写
 * @param {string} directory 目录路径
 * @returns {Promise<boolean>} 返回是否可写的 Promise，true 表示可写，false 表示不可写
 */
export async function isWriteable(directory) {
  try {
    // 检查目录是否具有写权限
    await access(directory, (fs.constants || fs).W_OK)
    return true
  } catch (err) {
    // 如果访问失败（例如无权限或目录不存在），返回 false
    return false
  }
}

/*
代码功能说明
作用：该文件提供了一个函数，用于检查指定目录是否具有写权限，通常用于确保构建过程可以写入输出文件。

参数：
directory：要检查的目录路径（字符串）。


/**** */