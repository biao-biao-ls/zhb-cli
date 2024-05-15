"use strict";

const fs = require("fs");
const fse = require("fs-extra");
const semver = require("semver");
const { glob } = require("glob");
const ejs = require("ejs");
const validatePackageName = require("validate-npm-package-name");
const Command = require("@zhb-cli/command");
const log = require("@zhb-cli/log");
const Package = require("@zhb-cli/package");
const { spinnerStart, sleep, execAsync } = require("@zhb-cli/utils");

const getProjectTemplate = require("./getProjectTemplate");

const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";

const TEMPLATE_TYPE_NORMAL = "normal";
const TEMPLATE_TYPE_CUSTOM = "custom";
const WHITE_COMMAND = ["npm", "cnpm"];
const COMPONENT_FILE = ".componentrc";

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
        // 3. 安装模板
        await this.installTemplate();
      }
    } catch (e) {
      console.log(e);
      log.error(e.message);
    }
  }

  async installTemplate() {
    log.verbose("templateInfo", this.templateInfo);
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
      }
      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        // 标准安装
        await this.installNormalTemplate();
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        // 自定义安装
        await this.installCustomTemplate();
      } else {
        throw new Error("无法识别项目模板类型！");
      }
    } else {
      throw new Error("项目模板信息不存在！");
    }
  }

  async installCustomTemplate() {
    // 查询自定义模板的入口文件
    if (await this.templateNpm.exists()) {
      const rootFile = await this.templateNpm.getRootFilePath();
      if (fs.existsSync(rootFile)) {
        log.notice("开始执行自定义模板");
        const templatePath = path.resolve(
          this.templateNpm.cacheFilePath,
          "template"
        );
        const options = {
          templateInfo: this.templateInfo,
          projectInfo: this.projectInfo,
          sourcePath: templatePath,
          targetPath: process.cwd(),
        };
        const code = `require('${rootFile}')(${JSON.stringify(options)})`;
        await execAsync("node", ["-e", code], {
          stdio: "inherit",
          cwd: process.cwd(),
        });
        log.success("自定义模板安装成功");
      } else {
        throw new Error("自定义模板入口文件不存在！");
      }
    }
  }

  async installNormalTemplate() {
    log.verbose("templateNpm", this.templateNpm);
    // 拷贝模板代码至当前目录
    let spinner = await spinnerStart("正在安装模板...");
    await sleep();
    const targetPath = process.cwd();
    try {
      const templatePath = path.resolve(
        this.templateNpm.cacheFilePath,
        "template"
      );
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);
      fse.copySync(templatePath, targetPath);
    } catch (e) {
      throw e;
    } finally {
      spinner.stop(true);
      log.success("模板安装成功");
    }
    const templateIgnore = this.templateInfo.ignore || [];
    const ignore = ["**/node_modules/**", ...templateIgnore];
    try {
      await this.ejsRender({ ignore });
    } catch (err) {
      log.error("ejs渲染失败", err.message);
    }
    // 如果是组件，则生成组件配置文件
    this.createComponentFile(targetPath);
    const { installCommand, startCommand } = this.templateInfo;
    try {
      // 依赖安装
      await this.execCommand(installCommand, "依赖安装失败！");
      // 启动命令执行
      await this.execCommand(startCommand, "启动执行命令失败！");
    } catch (err) {
      console.log(err);
    }
  }

  createComponentFile(targetPath) {
    const templateInfo = this.templateInfo;
    const projectInfo = this.projectInfo;
    if (templateInfo.tag.includes(TYPE_COMPONENT)) {
      const componentData = {
        ...projectInfo,
        buildPath: templateInfo.buildPath || "",
        examplePath: templateInfo.examplePath || "",
        npmName: templateInfo.npmName,
        npmVersion: templateInfo.version,
      };
      const componentFile = path.resolve(targetPath, COMPONENT_FILE);
      fs.writeFileSync(componentFile, JSON.stringify(componentData));
    }
  }

  async execCommand(command, errMsg) {
    let ret;
    if (command) {
      const cmdArray = command.split(" ");
      const cmd = this.checkCommand(cmdArray[0]);
      if (!cmd) {
        throw new Error("命令不存在！命令：" + command);
      }
      const args = cmdArray.slice(1);
      ret = await execAsync(cmd, args, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    }
    if (ret !== 0) {
      throw new Error(errMsg);
    }
    return ret;
  }

  checkCommand(cmd) {
    if (WHITE_COMMAND.includes(cmd)) {
      return cmd;
    }
    return null;
  }

  async ejsRender(options) {
    const dir = process.cwd();
    const projectInfo = this.projectInfo;
    try {
      const files = await glob("**", {
        cwd: dir,
        ignore: options.ignore || "",
        nodir: true,
      });
      for (let file of files) {
        const filePath = path.join(dir, file);
        const result = await ejs.renderFile(filePath, projectInfo, {});
        fse.writeFileSync(filePath, result);
      }
    } catch (err) {
      return Promise.reject(err);
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
    let isProjectNameValid = false;
    if (validatePackageName(this.projectName).validForNewPackages) {
      isProjectNameValid = true;
      projectInfo.projectName = this.projectName;
    }
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
    this.template = this.template.filter((template) =>
      template.tag.includes(type)
    );
    const title = type === TYPE_PROJECT ? "项目" : "组件";

    const projectNamePrompt = {
      type: "input",
      name: "projectName",
      message: `请输入${title}名称`,
      default: "",
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
    };
    const projectPrompt = [];
    if (!isProjectNameValid) {
      projectPrompt.push(projectNamePrompt);
    }
    projectPrompt.push(
      {
        type: "input",
        name: "projectVersion",
        message: `请输入${title}版本号`,
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
        filter: function (v) {
          if (!!semver.valid(v)) {
            return semver.valid(v);
          } else {
            return v;
          }
        },
      },
      {
        type: "list",
        name: "projectTemplate",
        message: `请选择${title}模板`,
        choices: this.createTemplateChoice(),
      }
    );
    if (type === TYPE_PROJECT) {
      // 4. 获取项目基本信息
      const project = await inquirer.prompt(projectPrompt);
      projectInfo = {
        ...projectInfo,
        type,
        ...project,
      };
    }
    if (type === TYPE_COMPONENT) {
      const descriptionPrompt = {
        type: "input",
        name: "componentDescription",
        message: "请输入组件描述信息",
        default: "",
        validate: function (v) {
          const done = this.async();
          setTimeout(function () {
            if (!v) {
              done("请输入组件描述信息");
              return;
            }
            done(null, true);
          }, 0);
        },
      };
      projectPrompt.push(descriptionPrompt);
      // 2. 获取组件的基本信息
      const component = await inquirer.prompt(projectPrompt);
      projectInfo = {
        ...projectInfo,
        type,
        ...component,
      };
    }
    // return 项目的基本信息 （object）
    // 生成classname
    if (projectInfo.projectName) {
      projectInfo.name = projectInfo.projectName;
      projectInfo.className = projectInfo.projectName;
    }
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion;
    }
    if (projectInfo.componentDescription) {
      projectInfo.description = projectInfo.componentDescription;
    }

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
