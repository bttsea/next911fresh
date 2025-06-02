const alphabet = 'ModuleSymbhasOwnPr-0123456789ABCDEFGHIJKLNQRTUVWXYZ_cfgijkpqtvxz' 

function nanoid(size = 21) { ///=== 不依赖任何库的 NanoID 简化实现（Node.js / 浏览器通用）
  let id = ''
  const randomBytes = getRandomBytes(size)
  for (let i = 0; i < size; i++) {
    id += alphabet[randomBytes[i] & 63] // & 63 相当于对 alphabet.length=64 做取模
  }

      console.log('---------------------nanoid: ' + id);
  return id
}

// 兼容 Node.js 和浏览器的随机字节生成
function getRandomBytes(size) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // 浏览器环境
    const array = new Uint8Array(size)
    crypto.getRandomValues(array)
    return array
  } else {
    // Node.js 环境
    const crypto = require('crypto')
    return crypto.randomBytes(size)
  }
}

// 示例
/////console.log(nanoid())      // eg: "HNg09zQybKrXYFhdfR8Yp"
////console.log(nanoid(10))    // eg: "W5M3N7Kyph"


// 导出 createStore 函数
module.exports = nanoid;

 