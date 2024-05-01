"use strict";

const fs = require("fs");
const fse = require("fs-extra");
const semver = require("semver");
const validatePackageName = require("validate-npm-package-name");
const Command = require("@zhb-cli/command");
const log = require("@zhb-cli/log");

const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || "";
    this.options = this._argv[1];
    this.force = !!this.options.force;
    log.verbose("projectName", this.projectName);
    log.verbose("force", this.force);
  }

  async exec() {
    try {
      //  1.准备阶段
      const ret = await this.prepare();
    } catch (e) {
      log.error(e.message);
    }
  }

  async prepare() {
    const { default: inquirer } = await import("inquirer");
    const localPath = process.cwd();
    // 1. 判断当前目录是否为空
    if (!this.isDirEmpty(localPath)) {
      let ifContinue = false;
      if (!this.force) {
        // 询问是否继续创建
        const answer = await inquirer.prompt({
          type: "confirm",
          message: "当前文件夹不为空，是否继续创建项目？",
          name: "ifContinue",
          default: false,
        });
        ifContinue = answer.ifContinue;
      }
      if (!ifContinue) return;
      // 2. 是否启动强制更新
      if (ifContinue || this.force) {
        // 给用户做二次确认
        const { confirmDelete } = await inquirer.prompt({
          type: "confirm",
          message: "是否确认清空当前目录下的文件",
          name: "confirmDelete",
          default: false,
        });
        if (confirmDelete) {
          // 清空当前目录
          fse.emptyDirSync(localPath);
        }
      }
    }
    return await this.getProjectInfo();
  }

  async getProjectInfo() {
    const projectInfo = {};
    const { default: inquirer } = await import("inquirer");
    // 3. 选择创建项目或者组件
    const { type } = await inquirer.prompt({
      type: "list",
      message: "请选择初始化类型",
      name: "type",
      default: TYPE_PROJECT,
      choices: [
        { name: "项目", value: TYPE_PROJECT },
        { name: "组件", value: TYPE_COMPONENT },
      ],
    });
    log.verbose("type", type);

    if (type === TYPE_PROJECT) {
      // 4. 获取项目基本信息
      const o = await inquirer.prompt([
        {
          type: "input",
          name: "projectName",
          message: "请输入项目名称",
          default: "zhb-cli",
          validate(v) {
            const done = this.async();
            // 验证包名是否合法
            const result = validatePackageName(v);
            if (!result.validForNewPackages) {
              console.log();
              done(`Invalid project name: "${v}"`);
              result.errors &&
                result.errors.forEach((err) => {
                  done(err);
                });
              result.warnings &&
                result.warnings.forEach((warn) => {
                  done(warn);
                });
            }
            done(null, true);
          },
          filter(v) {
            return v;
          },
        },
        {
          type: "input",
          name: "projectVersion",
          message: "请输入项目版本号",
          default: "1.0.0",
          validate(v) {
            const done = this.async();
            if (semver.valid(v)) {
              done(null, true);
            } else {
              console.log();
              done("请输入合法版本号");
            }
          },
          filter(v) {
            if (semver.valid(v)) {
              return semver.valid(v);
            } else {
              return v;
            }
          },
        },
      ]);
      console.log(o);
    }
    if (type === TYPE_COMPONENT) {
    }
    // return 项目的基本信息 （object）

    return projectInfo;
  }

  isDirEmpty(localPath) {
    let fileList = fs.readdirSync(localPath);
    // 文件过滤的逻辑
    fileList = fileList.filter((file) => {
      return !file.startsWith(".") && ["node_modules"].indexOf(file) < 0;
    });
    return !fileList || fileList.length <= 0;
  }
}

function init(argv) {
  return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
