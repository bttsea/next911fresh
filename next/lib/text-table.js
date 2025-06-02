/**
 * 生成格式化的 ASCII 文本表格
 * @param {Array<Array<string>>} rows_ - 二维数组，每行包含单元格内容
 * @param {Object} [opts] - 配置选项
 * @param {string} [opts.hsep='  '] - 列间分隔符
 * @param {Array<string>} [opts.align] - 每列的对齐方式（'l' 左, 'r' 右, 'c' 居中, '.' 点对齐）
 * @param {Function} [opts.stringLength] - 自定义字符串长度计算函数，默认使用 String.length
 * @returns {string} 格式化的表格字符串，行间以换行符连接
 */
module.exports = function (rows_, opts) {
  // 初始化配置，设置默认值
  if (!opts) opts = {};
  // 列间分隔符，默认为两个空格
  var hsep = opts.hsep === undefined ? '  ' : opts.hsep;
  // 每列的对齐方式，默认为空数组（左对齐）
  var align = opts.align || [];
  // 字符串长度计算函数，默认为 String.length
  var stringLength = opts.stringLength || function (s) { return String(s).length; };

  // 计算每列中小数点的位置，用于点对齐
  var dotsizes = reduce(rows_, function (acc, row) {
    forEach(row, function (c, ix) {
      var n = dotindex(c); // 获取小数点索引
      if (!acc[ix] || n > acc[ix]) acc[ix] = n; // 更新最大小数点位置
    });
    return acc;
  }, []);

  // 处理点对齐，补齐空格
  var rows = map(rows_, function (row) {
    return map(row, function (c_, ix) {
      var c = String(c_); // 转换为字符串
      if (align[ix] === '.') {
        var index = dotindex(c); // 小数点索引
        // 计算补齐空格数：最大小数点位置 + 点后长度 - 当前长度
        var size = dotsizes[ix] + (/\./.test(c) ? 1 : 2) - (stringLength(c) - index);
        return c + Array(size).join(' '); // 补齐空格
      } else {
        return c; // 非点对齐直接返回
      }
    });
  });

  // 计算每列的最大宽度
  var sizes = reduce(rows, function (acc, row) {
    forEach(row, function (c, ix) {
      var n = stringLength(c); // 获取单元格宽度
      if (!acc[ix] || n > acc[ix]) acc[ix] = n; // 更新最大宽度
    });
    return acc;
  }, []);

  // 格式化每行，应用对齐和填充
  return map(rows, function (row) {
    return map(row, function (c, ix) {
      var n = (sizes[ix] - stringLength(c)) || 0; // 需要补齐的空格数
      var s = Array(Math.max(n + 1, 1)).join(' '); // 生成空格字符串
      if (align[ix] === 'r' || align[ix] === '.') {
        // 右对齐或点对齐：空格在前
        return s + c;
      }
      if (align[ix] === 'c') {
        // 居中对齐：左右均匀补空格
        return (
          Array(Math.ceil(n / 2 + 1)).join(' ') +
          c +
          Array(Math.floor(n / 2 + 1)).join(' ')
        );
      }
      // 左对齐（默认）：空格在后
      return c + s;
    })
      .join(hsep) // 使用分隔符连接单元格
      .replace(/\s+$/, ''); // 移除行尾多余空格
  }).join('\n'); // 使用换行符连接行
};

/**
 * 获取字符串中小数点的位置
 * @param {string} c - 输入字符串
 * @returns {number} 小数点索引，无小数点则返回字符串长度
 */
function dotindex(c) {
  var m = /\.[^.]*$/.exec(c); // 匹配最后一个小数点及其后的内容
  return m ? m.index + 1 : c.length; // 返回小数点位置或字符串长度
}

/**
 * 数组归约（reduce）函数，兼容无原生 reduce 的环境
 * @param {Array} xs - 输入数组
 * @param {Function} f - 归约函数
 * @param {*} init - 初始值
 * @returns {*} 归约结果
 */
function reduce(xs, f, init) {
  if (xs.reduce) return xs.reduce(f, init); // 使用原生 reduce
  var i = 0;
  var acc = arguments.length >= 3 ? init : xs[i++]; // 初始化累加器
  for (; i < xs.length; i++) {
    f(acc, xs[i], i); // 手动归约
  }
  return acc;
}

/**
 * 数组遍历（forEach）函数，兼容无原生 forEach 的环境
 * @param {Array} xs - 输入数组
 * @param {Function} f - 遍历函数
 */
function forEach(xs, f) {
  if (xs.forEach) return xs.forEach(f); // 使用原生 forEach
  for (var i = 0; i < xs.length; i++) {
    f.call(xs, xs[i], i); // 手动遍历
  }
}

/**
 * 数组映射（map）函数，兼容无原生 map 的环境
 * @param {Array} xs - 输入数组
 * @param {Function} f - 映射函数
 * @returns {Array} 映射结果
 */
function map(xs, f) {
  if (xs.map) return xs.map(f); // 使用原生 map
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f.call(xs, xs[i], i)); // 手动映射
  }
  return res;
}


/*
代码功能说明
作用：
text-table 是一个轻量级模块，用于生成格式化的 ASCII 文本表格，适合 CLI 输出。

在 Next.js 9.1.1 中，可能用于格式化 CLI 日志（如 next build 的模块统计）或调试信息。

主要功能：
表格生成：
输入二维数组（rows_），输出字符串表格。

支持自定义列间距（hsep）、对齐方式（align）和字符串长度计算（stringLength）。

对齐方式：
左对齐（默认）：内容靠左，空格补右。

右对齐（r）：空格补左，内容靠右。

居中对齐（c）：左右均匀补空格。

点对齐（.）：基于小数点对齐，补齐空格。

宽度计算：
计算每列最大宽度（sizes），确保对齐。

单独处理小数点位置（dotsizes），支持点对齐。

兼容性：
提供 reduce, forEach, map 的回退实现，兼容旧环境（如无原生数组方法）。

逻辑：
初始化配置，设置默认值。

计算小数点位置（dotsizes），处理点对齐。

格式化行，补齐空格以对齐。

计算每列宽度（sizes），应用对齐规则。

连接单元格（hsep）和行（\n），移除多余空格。

用途：
在 Next.js 9.1.1 的 CLI 中，格式化输出（如构建统计、页面清单）。

示例：
javascript

const table = require('text-table');
console.log(
  table(
    [
      ['Name', 'Age'],
      ['Alice', '25.0'],
      ['Bob', '30.5'],
    ],
    { align: ['l', '.'], hsep: ' | ' }
  )
);
// 输出：
// Name  | Age
// Alice | 25.0
// Bob   | 30.5

/**** */