// data-manager.js

class DataManager {
  constructor(data) {
    // 初始化数据为 Map
    this.data = new Map(data);
  }

  // 获取整个数据 Map
  getData() {
    return this.data;
  }

  // 获取指定 key 的值
  get(key) {
    return this.data.get(key);
  }

  // 设置一个键值对
  set(key, value) {
    this.data.set(key, value);
  }

  // 使用新的数据替换当前数据
  overwrite(data) {
    this.data = new Map(data);
  }
}

// 兼容 ESM 和 CommonJS 的导出方式
module.exports = DataManager;
module.exports.DataManager = DataManager;
export default DataManager;



/*
使用方式：
在 CommonJS（require）中使用：
const DataManager = require('./data-manager');
const manager = new DataManager();


在 ESModule（import）中使用：
import DataManager from './data-manager.js';
const manager = new DataManager();
/***** */