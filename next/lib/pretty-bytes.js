/**
 * @copyright (c) 2017-present Next.js contributors
 * MIT License
 * 格式化字节大小为人类可读的字符串（如 '1 kB', '2.5 MB'）
 * 基于 https://github.com/vercel/next.js 修改，适配 Next.js 日志输出
 */

// 字节单位数组
const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

/**
 * 使用 Number.toLocaleString 格式化数字
 * @param {number} number - 要格式化的数字
 * @param {string|boolean} [locale] - 本地化选项（字符串如 'de'，或 true 使用系统默认）
 * @returns {string|number} 格式化后的字符串或原始数字
 */
function toLocaleString(number, locale) {
  let result = number;
  if (typeof locale === 'string') {
    result = number.toLocaleString(locale);
  } else if (locale === true) {
    result = number.toLocaleString();
  }
  return result;
}

/**
 * 格式化字节大小
 * @param {number} number - 字节数
 * @param {Object} [options] - 配置选项
 * @param {boolean} [options.signed] - 是否添加符号（+ 或 -）
 * @param {string|boolean} [options.locale] - 本地化选项（字符串如 'de'，或 true 使用系统默认）
 * @returns {string} 格式化后的字符串（如 '1 kB', '-2.5 MB'）
 * @throws {TypeError} 如果输入不是有限数字
 */
function prettyBytes(number, options) {
  if (!Number.isFinite(number)) {
    throw new TypeError(`期望一个有限数字，得到 ${typeof number}: ${number}`);
  }

  options = Object.assign({}, options);

  if (options.signed && number === 0) {
    return ' 0 B';
  }

  const isNegative = number < 0;
  const prefix = isNegative ? '-' : options.signed ? '+' : '';

  if (isNegative) {
    number = -number;
  }

  if (number < 1) {
    const numberString = toLocaleString(number, options.locale);
    return prefix + numberString + ' B';
  }

  const exponent = Math.min(
    Math.floor(Math.log10(number) / 3),
    UNITS.length - 1
  );

  number = Number((number / Math.pow(1000, exponent)).toPrecision(3));
  const numberString = toLocaleString(number, options.locale);

  const unit = UNITS[exponent];

  return prefix + numberString + ' ' + unit;
}

// 导出模块，支持 CommonJS 和 ES Module
module.exports = prettyBytes;


/*
测试格式化： 

const prettyBytes = require('./pretty-bytes');
console.log(prettyBytes(0)); // '0 B'
console.log(prettyBytes(123456789)); // '123 MB'
console.log(prettyBytes(-500, { signed: true })); // '-500 B'
console.log(prettyBytes(1000.5, { locale: true })); // '1 kB'（系统默认格式）

/***** */