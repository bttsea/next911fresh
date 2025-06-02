// 定义一个符号，用于标记标志（flag）函数
const flagSymbol = Symbol('arg flag');

/**
 * 解析命令行参数
 * @param {Object} opts - 参数配置对象，键为选项名称，值为类型函数或别名
 * @param {Object} [options] - 解析选项
 * @param {Array<string>} [options.argv] - 命令行参数数组，默认为 process.argv.slice(2)
 * @param {boolean} [options.permissive=false] - 是否允许未知选项
 * @param {boolean} [options.stopAtPositional=false] - 是否在遇到第一个位置参数后停止解析
 * @returns {Object} 解析结果，包含选项值和位置参数（_ 数组）
 */
function arg(opts, { argv, permissive = false, stopAtPositional = false } = {}) {
  // 验证配置对象
  if (!opts) {
    throw new Error('Argument specification object is required');
  }

  // 初始化结果对象，_ 数组存储位置参数
  const result = { _: [] };

  // 使用提供的 argv 或默认从 process.argv 截取
  argv = argv || process.argv.slice(2);

  // 存储选项别名
  const aliases = {};
  // 存储选项处理函数和标志状态
  const handlers = {};

  // 处理配置对象
  for (const key of Object.keys(opts)) {
    // 验证选项键非空
    if (!key) {
      throw new TypeError('Argument key cannot be an empty string');
    }

    // 验证选项键以 - 开头
    if (key[0] !== '-') {
      throw new TypeError(`Argument key must start with '-' but found: '${key}'`);
    }

    // 验证选项键长度
    if (key.length === 1) {
      throw new TypeError(`Argument key must have a name; singular '-' keys are not allowed: ${key}`);
    }

    // 处理别名
    if (typeof opts[key] === 'string') {
      aliases[key] = opts[key];
      continue;
    }

    let type = opts[key];
    let isFlag = false;

    // 处理数组形式的类型（如 [--foo, String]）
    if (Array.isArray(type) && type.length === 1 && typeof type[0] === 'function') {
      const [fn] = type;
      // 将类型转换为累积函数，处理多值选项
      type = (value, name, prev = []) => {
        prev.push(fn(value, name, prev[prev.length - 1]));
        return prev;
      };
      // 判断是否为标志
      isFlag = fn === Boolean || fn[flagSymbol] === true;
    } else if (typeof type === 'function') {
      // 直接函数类型，判断是否为标志
      isFlag = type === Boolean || type[flagSymbol] === true;
    } else {
      throw new TypeError(`Type missing or not a function or valid array type: ${key}`);
    }

    // 验证短选项（单横杠）只能有一个字符
    if (key[1] !== '-' && key.length > 2) {
      throw new TypeError(`Short argument keys (with a single hyphen) must have only one character: ${key}`);
    }

    // 存储选项的类型和标志状态
    handlers[key] = [type, isFlag];
  }

  // 遍历命令行参数
  for (let i = 0, len = argv.length; i < len; i++) {
    const wholeArg = argv[i];

    // 如果设置了 stopAtPositional 且已有位置参数，停止解析
    if (stopAtPositional && result._.length > 0) {
      result._ = result._.concat(argv.slice(i));
      break;
    }

    // 遇到 -- 停止解析，后续参数作为位置参数
    if (wholeArg === '--') {
      result._ = result._.concat(argv.slice(i + 1));
      break;
    }

    // 处理选项（以 - 开头且长度大于 1）
    if (wholeArg.length > 1 && wholeArg[0] === '-') {
      // 分割短选项（如 -abc 分成 -a -b -c）或保留长选项
      const separatedArguments =
        wholeArg[1] === '-' || wholeArg.length === 2
          ? [wholeArg]
          : wholeArg.slice(1).split('').map((a) => `-${a}`);

      // 处理每个选项
      for (let j = 0; j < separatedArguments.length; j++) {
        const arg = separatedArguments[j];
        // 分割选项名称和值（如 --foo=bar）
        const [originalArgName, argStr] = arg[1] === '-' ? arg.split('=', 2) : [arg, undefined];

        // 解析别名
        let argName = originalArgName;
        while (argName in aliases) {
          argName = aliases[argName];
        }

        // 处理未知选项
        if (!(argName in handlers)) {
          if (permissive) {
            result._.push(arg);
            continue;
          } else {
            const err = new Error(`Unknown or unexpected option: ${originalArgName}`);
            err.code = 'ARG_UNKNOWN_OPTION';
            throw err;
          }
        }

        const [type, isFlag] = handlers[argName];

        // 验证非标志选项不能后接短选项
        if (!isFlag && j + 1 < separatedArguments.length) {
          throw new TypeError(
            `Option requires argument (but was followed by another short argument): ${originalArgName}`
          );
        }

        if (isFlag) {
          // 处理标志选项（无需值，默认为 true）
          result[argName] = type(true, argName, result[argName]);
        } else if (argStr === undefined) {
          // 处理需要值的选项
          if (argv.length < i + 2 || (argv[i + 1].length > 1 && argv[i + 1][0] === '-')) {
            const extended = originalArgName === argName ? '' : ` (alias for ${argName})`;
            throw new Error(`Option requires argument: ${originalArgName}${extended}`);
          }

          // 使用下一个参数作为值
          result[argName] = type(argv[i + 1], argName, result[argName]);
          ++i;
        } else {
          // 使用等号后的值
          result[argName] = type(argStr, argName, result[argName]);
        }
      }
    } else {
      // 非选项参数作为位置参数
      result._.push(wholeArg);
    }
  }

  return result;
}

/**
 * 标记一个函数为标志函数
 * @param {Function} fn - 要标记的函数
 * @returns {Function} 标记后的函数
 */
arg.flag = (fn) => {
  fn[flagSymbol] = true;
  return fn;
};

// 工具类型：计数标志，记录选项出现的次数
arg.COUNT = arg.flag((v, name, existingCount) => (existingCount || 0) + 1);

// 导出 arg 函数
module.exports = arg;



/*
代码功能说明
作用：
arg 是一个轻量级的命令行参数解析库，用于处理 Node.js 应用的命令行输入。

支持短选项（-v）、长选项（--verbose）、别名、标志、值选项和位置参数。

在 Next.js 9.1.1 中，可能用于解析 next CLI 命令的参数（如 next build --config custom.config.js）。

主要功能：
配置验证：
验证选项键（opts）格式，确保以 - 开头，非空，且短选项长度为 2。

支持别名（--verbose: --v）和类型函数（如 String, Boolean）。

参数解析：
解析 argv（命令行参数），支持：
标志选项（如 --verbose）。

值选项（如 --port 3000 或 --port=3000）。

短选项组合（如 -abc）。

位置参数（如 file.txt）。

处理 -- 分隔符，停止选项解析。

支持 stopAtPositional 和 permissive 模式。

标志支持：
使用 arg.flag 标记函数为标志，自动处理 Boolean 类型。

提供 arg.COUNT 工具，计数选项出现次数。

错误处理：
抛出详细错误（如未知选项、缺少值），包括错误码（ARG_UNKNOWN_OPTION）。

逻辑：
初始化结果对象（result），存储选项值和位置参数（_.push）。

构建别名（aliases）和处理函数（handlers）映射。

遍历 argv，按选项类型（标志或值）处理，解析别名和值。

支持短选项展开、等号赋值和位置参数收集。

用途：
在 Next.js 9.1.1 的 CLI 中，解析命令行参数（如 next dev --port 4000）。

示例：
javascript

const arg = require('arg');
const args = arg({
  '--port': Number, // --port <value>
  '-v': arg.COUNT, // -v, -vv, -vvv
  '--verbose': '-v', // 别名
});
console.log(args); // { _: [], '--port': 4000, '-v': 3 }


/**** */