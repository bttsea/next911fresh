// head-manager-context.js

const React = require('react');

// 创建一个 React Context，初始值为 null
const HeadManagerContext = React.createContext(null);

// 导出方式支持 CommonJS 和 ESModule
module.exports = HeadManagerContext;
module.exports.HeadManagerContext = HeadManagerContext;
exports.default = HeadManagerContext;
