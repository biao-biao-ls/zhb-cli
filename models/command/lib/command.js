"use strict";

const semver = require("semver");
const log = require("@zhb-cli/log");

const LOWEST_VERSION = "12.0.0";

class Command {
  constructor(argv) {
    if (!argv) {
      throw new Error("参数不能为空！");
    }
    if (!Array.isArray(argv)) {
      throw new Error("参数必须为数组！");
    }
    if (Array.isArray(!argv.length)) {
      throw new Error("参数列表不能为空！");
    }
    this._argv = argv;
    const runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve();

      chain = chain.then(() => {
        // 检查 nodejs 版本
        this.checkNodeVersion();
      });

      chain = chain.then(() => {
        // 参数的初始化操作
        this.initArgs();
      });
      chain = chain.then(() => {
        this.init()
      });
      chain = chain.then(() => {
        this.exec()
      });
      chain.catch((err) => {
        log.error(err.message);
      });
    });
  }

  init() {
    throw new Error("init 必须实现");
  }

  exec() {
    throw new Error("exec 必须实现");
  }

  initArgs() {
    this._cmd = this._argv[this._argv.length - 1];
    this._argv = this._argv.slice(0, -1)
  }

  /**
   * 检查 Node 版本号
   */
  checkNodeVersion() {
    //   第一步，获取当前Node版本号
    const currentVersion = process.version;
    //   第二步，比对最低版本号
    const lowestVersion = LOWEST_VERSION;
    if (!semver.gte(currentVersion, lowestVersion)) {
      throw new Error(`zhb-cli 需要安装 V${lowestVersion} 以上版本的 Node.js`);
    }
  }
}

module.exports = Command;
