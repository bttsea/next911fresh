"use strict";

exports.__esModule = true;
exports.DataManager = void 0;
class DataManager {
  constructor(data) {
    this.data = void 0;
    this.data = new Map(data);
  }
  getData() {
    return this.data;
  }
  get(key) {
    return this.data.get(key);
  }
  set(key, value) {
    this.data.set(key, value);
  }
  overwrite(data) {
    this.data = new Map(data);
  }
}
exports.DataManager = DataManager;