// data-manager-context.js

const React = require('react');

// 创建一个 React Context，初始值为 null
const DataManagerContext = React.createContext(null);

// 导出方式支持 CommonJS 和 ESModule
module.exports = DataManagerContext;
module.exports.DataManagerContext = DataManagerContext;
exports.default = DataManagerContext;
