"use strict";

const fs = require("fs");
const fse = require("fs-extra");
const semver = require("semver");
const validatePackageName = require("validate-npm-package-name");
const Command = require("@zhb-cli/command");
const log = require("@zhb-cli/log");
const Package = require("@zhb-cli/package");
const { spinnerStart, sleep } = require("@zhb-cli/utils");

const getProjectTemplate = require("./getProjectTemplate");

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
      const projectInfo = await this.prepare();
      if (projectInfo) {
        // 2. 下载模板
        log.verbose("projectInfo", projectInfo);
        this.projectInfo = projectInfo;
        await this.downloadTemplate();
        // 3.
      }
    } catch (e) {
      console.log(e);
      log.error(e.message);
    }
  }

  async downloadTemplate() {
    // 1. 通过项目模板API获取项目模板信息
    // 1.1 通过egg.js 搭建一套后端系统
    // 1.2 通过 npm 存储项目模板
    // 1.3 将项目模板信息存储道 mongodb数据库中
    // 1.4 通过 egg.js 获取 mongodb 中的数据并且通过 API 返回
    // 0. 判断项目模板是否存在
    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.template.find(
      (item) => item.npmName === projectTemplate
    );
    const targetPath = path.resolve(process.env.CLI_HOME_PATH, "template");
    const storeDir = path.resolve(targetPath, "node_modules");
    const { npmName, version } = templateInfo;
    this.templateInfo = templateInfo;
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    });
    if (!(await templateNpm.exists())) {
      const spinner = await spinnerStart("正在下载模板...");
      await sleep();
      try {
        await templateNpm.install();
      } catch (e) {
        throw e;
      } finally {
        spinner.stop();
        if (await templateNpm.exists()) {
          log.success("下载模板成功");
          this.templateNpm = templateNpm;
        }
      }
    } else {
      const spinner = await spinnerStart("正在更新模板...");
      await sleep();
      try {
        await templateNpm.update();
      } catch (e) {
        throw e;
      } finally {
        spinner.stop();
        if (await templateNpm.exists()) {
          log.success("更新模板成功");
          this.templateNpm = templateNpm;
        }
      }
    }
  }

  async prepare() {
    // 0. 判断项目模板是否存在
    const template = await getProjectTemplate();
    if (!template || template.length === 0) {
      throw new Error("项目模板不存在");
    }
    this.template = template;

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
    let projectInfo = {};
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
      const project = await inquirer.prompt([
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
        {
          type: "list",
          name: "projectTemplate",
          message: `请选择项目模板`,
          choices: this.createTemplateChoice(),
        },
      ]);
      projectInfo = {
        type,
        ...project,
      };
    }
    if (type === TYPE_COMPONENT) {
    }
    // return 项目的基本信息 （object）

    return projectInfo;
  }

  createTemplateChoice() {
    return this.template.map((item) => ({
      value: item.npmName,
      name: item.name,
    }));
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
