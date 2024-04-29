"use strict";

const fs = require("fs");
const Command = require("@zhb-cli/command");
const log = require("@zhb-cli/log");

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || "";
    this.options = this._argv[1];
    this.force = !!this.options.force;
    log.verbose("projectName", this.projectName);
    log.verbose("force", this.force);
  }

  exec() {
    try {
      //  1.准备阶段
      this.prepare();
    } catch (e) {
      log.error(e.message);
    }
  }

  prepare() {
    // 1. 判断当前目录是否为空
    if (!his.isCwdEmpty()) {
      // 询问是否继续创建
    }

    // 2. 是否启动强制更新
    // 3. 选择创建项目或者组件
    // 4. 获取项目基本信息
  }

  isCwdEmpty() {
    const localPath = process.cwd();
    let fileList = fs.readdirSync(localPath);
    // 文件过滤的逻辑
    fileList = fileList.filter(file => {
      return !file.startsWith('.') && ['node_modules'].indexOf(file) < 0
    })
    return !fileList || fileList.length <= 0
  }
}

function init(argv) {
  return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
