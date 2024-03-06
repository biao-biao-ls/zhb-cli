module.exports = core;

const path = require("path");
const semver = require("semver");
const colors = require("colors/safe");
const userHome = require("user-home");
const log = require("@zhb-cli/log");
const { getNpmSemverVersion } = require("@zhb-cli/get-npm-info");
const pkg = require("../package.json");
const constant = require("./const");

async function core(argvs) {
  try {
    checkPkgVersion();
    checkNodeVersion();
    await checkRoot();
    await checkUserHome();
    checkInputArgs(argvs);
    await checkEnv();
    await checkGlobalUpdate();
  } catch (e) {
    log.error("", colors.red(e.message));
  }
}

/**
 * 检查版本号及更新提示
 */
async function checkGlobalUpdate() {
  // 1. 获取当前版本号和模块名
  const currentVersion = "1.0.0";
  const npmName = pkg.name;
  // 2. 调用 npm API 获取最新版本号
  const lastVersion = await getNpmSemverVersion(
    npmName,
    currentVersion,
    "tencent" // :todo 根据环境变量，取 npm 源
  );
  // 3. 提示用户更新到该版本
  if (lastVersion && semver.gt(lastVersion, currentVersion)) {
    log.warn(
      colors.yellow(
        `更新提示：请手动更新 ${npmName}, 当前版本: ${currentVersion}, 最新版本：${lastVersion}
        更新命令: npm install -g ${npmName}`
      )
    );
  }
}

/**
 * 检查环境变量
 * @returns {{cliHome: string, home: *|{}}}
 */
async function checkEnv() {
  const dotenv = require("dotenv");
  const { pathExistsSync } = await import("path-exists");
  const dotenvPath = path.resolve(userHome, ".env");
  if (pathExistsSync(dotenvPath)) {
    dotenv.config({ path: dotenvPath });
  }
  createDefaultConfig();
}

/**
 * 根据环境变量生成系统配置
 */
function createDefaultConfig() {
  const cliConfig = {
    home: userHome,
    cliHome: path.join(
      userHome,
      process.env.CLI_HOME || constant.DEFAULT_CLI_HOME
    ),
  };
  process.env.CLI_HOME_PATH = cliConfig.cliHome;
}

/**
 * 入参检查
 * @param argvs
 */
function checkInputArgs(argvs) {
  const minimist = require("minimist");
  const args = minimist(argvs);
  checkArgs(args);
}

/**
 * 设置 debug 模式
 * @param args
 */
function checkArgs(args) {
  if (args.debug) {
    process.env.LOG_LEVEL = "verbose";
  } else {
    process.env.LOG_LEVEL = "info";
  }
  log.level = process.env.LOG_LEVEL;
}

/**
 * 检查用户主目录是否存在
 * @returns {Promise<void>}
 */
async function checkUserHome() {
  const { pathExistsSync } = await import("path-exists");
  if (!userHome || !pathExistsSync(userHome)) {
    throw new Error("当前登录用户主目录不存在");
  }
}

/**
 * root 权限降级
 * @returns {Promise<void>}
 */
async function checkRoot() {
  const rootCheck = await import("root-check");
  rootCheck.default();
}

/**
 * 检查 Node 版本号
 */
function checkNodeVersion() {
  //   第一步，获取当前Node版本号
  const currentVersion = process.version;
  //   第二步，比对最低版本号
  const lowestVersion = constant.LOWEST_VERSION;
  if (!semver.gte(currentVersion, lowestVersion)) {
    throw new Error(`zhb-cli 需要安装 V${lowestVersion} 以上版本的 Node.js`);
  }
}

/**
 * 检查 pkg 版本号
 */
function checkPkgVersion() {
  log.info("pkg version", pkg.version);
}
