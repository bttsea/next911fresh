/**
 * 定义 Next.js 项目路径常量和配置
 */

// 引入模块
import { join } from 'path';

// 项目根目录（通常为 next 源码目录）
const NEXT_PROJECT_ROOT = join(__dirname, '..', '..');

// 项目分发目录（构建输出目录）
const NEXT_PROJECT_ROOT_DIST = join(NEXT_PROJECT_ROOT, 'dist');

// 项目 node_modules 目录
const NEXT_PROJECT_ROOT_NODE_MODULES = join(NEXT_PROJECT_ROOT, 'node_modules');

// 客户端分发目录（包含客户端构建输出）
const NEXT_PROJECT_ROOT_DIST_CLIENT = join(NEXT_PROJECT_ROOT_DIST, 'client');

// 服务器分发目录（包含服务器构建输出）
const NEXT_PROJECT_ROOT_DIST_SERVER = join(NEXT_PROJECT_ROOT_DIST, 'server');

// API 路由正则表达式，匹配以 /api 开头的路径
const API_ROUTE = /^\/api(?:\/|$)/;

// 页面目录别名（避免 Windows 路径数字问题）
const PAGES_DIR_ALIAS = 'private-next-pages';

// .next 目录别名（避免路径冲突）
const DOT_NEXT_ALIAS = 'private-dot-next';

// 公共目录冲突错误消息
const PUBLIC_DIR_MIDDLEWARE_CONFLICT = `不能在 public 目录中包含 '_next' 文件夹，这与内部 '/_next' 路由冲突。参见 https://err.sh/zeit/next.js/public-next-folder-conflict`;

// SPR 和 getInitialProps 冲突错误消息
const SPR_GET_INITIAL_PROPS_CONFLICT = `不能同时使用 getInitialProps 和 unstable_getStaticProps。要使用 SPR，请移除 getInitialProps`;

// 导出模块，支持 CommonJS 和 ES Module
module.exports = {
  NEXT_PROJECT_ROOT,
  NEXT_PROJECT_ROOT_DIST,
  NEXT_PROJECT_ROOT_NODE_MODULES,
  NEXT_PROJECT_ROOT_DIST_CLIENT,
  NEXT_PROJECT_ROOT_DIST_SERVER,
  API_ROUTE,
  PAGES_DIR_ALIAS,
  DOT_NEXT_ALIAS,
  PUBLIC_DIR_MIDDLEWARE_CONFLICT,
  SPR_GET_INITIAL_PROPS_CONFLICT,
};