"use strict";

const path = require("path");
const cp = require('child_process')
const log = require("@zhb-cli/log");
const Package = require("@zhb-cli/package");

const SETTINGS = {
  init: "@zhb-cli/core",
};

const CACHE_DIR = "dependencies";

async function exec(...args) {
  const [projectName, cmdOptions, command] = args;
  const cmdName = command.name();
  const packageName = SETTINGS[cmdName];
  const packageVersion = "latest";
  let targetPath = process.env.CLI_TARGET_PATH;
  const homePath = process.env.CLI_HOME_PATH;
  let storeDir = "";
  let pkg;

  if (!targetPath) {
    // 生成缓存路径
    targetPath = path.resolve(homePath, CACHE_DIR);
    storeDir = path.resolve(targetPath, "node_modules");
    log.verbose("targetPath", targetPath);
    log.verbose("storeDir", storeDir);

    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
      storeDir,
    });
    const isExists = await pkg.exists();
    if (isExists) {
      // 更新 pkg
      await pkg.update();
    } else {
      // 安装 pkg
      await pkg.install();
    }
  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
    });
  }
  const rootFilePath = await pkg.getRootFilePath();
  if (rootFilePath) {
    try {
      // 在当前进程中调用
      // require(rootFilePath)(args);
      // 在 node 子进程中调用
      const cmd = args[args.length - 1]
      const o = Object.create(null)
      Object.keys(cmd).forEach(key => {
        if (cmd.hasOwnProperty(key) && !key.startsWith('_') && key !== 'parent') {
          o[key] = cmd[key]
        }
      })
      args[args.length - 1] = o
      const code = `require("${rootFilePath}")(${JSON.stringify(args)})`
      const child = cp.spawn('node', ['-e', code], {
        cwd: process.cwd(),
        stdio: 'inherit'
      })
      child.on('error', e => {
        log.error(e.message)
        process.exit(1)
      })
      child.on('exit', e => {
        log.verbose('命令执行成功: ' + e)
        process.exit(e)
      })
    } catch (e) {
      log.error(e.message)
    }
  }
}

module.exports = exec;
