// 导入颜色高亮库，用于终端输出
import chalk from 'chalk'

// 定义日志前缀，带有颜色和样式
const prefixes = {
  wait: chalk`[ {cyan wait} ] `,
  error: chalk`[ {red error} ]`,
  warn: chalk`[ {yellow warn} ] `,
  ready: chalk`[ {green ready} ]`,
  info: chalk`[ {cyan {dim info}} ] `,
  event: chalk`[ {magenta event} ]`,
}

/**
 * 输出等待日志
 * @param {...messages} messages 可变的消息参数
 */
export function wait(...messages) {
  console.log(prefixes.wait, ...messages)
}

/**
 * 输出错误日志
 * @param {...messages} messages 可变的消息参数
 */
export function error(...messages) {
  console.log(prefixes.error, ...messages)
}

/**
 * 输出警告日志
 * @param {...messages} messages 可变的消息参数
 */
export function warn(...messages) {
  console.log(prefixes.warn, ...messages)
}

/**
 * 输出就绪日志
 * @param {...messages} messages 可变的消息参数
 */
export function ready(...messages) {
  console.log(prefixes.ready, ...messages)
}

/**
 * 输出信息日志
 * @param {...messages} messages 可变的消息参数
 */
export function info(...messages) {
  console.log(prefixes.info, ...messages)
}

/**
 * 输出事件日志
 * @param {...messages} messages 可变的消息参数
 */
export function event(...messages) {
  console.log(prefixes.event, ...messages)
}


/*
主要功能：
定义了六种日志前缀（wait, error, warn, ready, info, event），使用 chalk 添加颜色和样式。

提供了对应的日志函数，接受任意数量的消息参数并打印到终端。

/***** */