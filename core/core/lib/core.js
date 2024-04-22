module.exports = core;

const { homedir } = require("os");
const path = require("path");
const semver = require("semver");
const colors = require("colors/safe");
const commander = require("commander");
const log = require("@zhb-cli/log");
const { getNpmSemverVersion } = require("@zhb-cli/get-npm-info");
const init = require("@zhb-cli/init");
const exec = require("@zhb-cli/exec");
const pkg = require("../package.json");
const constant = require("./const");

const userHome = homedir();
const program = new commander.Command();
const defaultRegistry = "tencent";

async function core(argvs) {
  try {
    await prepare();
    registerCommand();
  } catch (e) {
    log.error("", colors.red(e.message));
    if (program.debug) {
      console.log(e);
    }
  }
}

async function prepare() {
  process.env.LOG_LEVEL = log.level;
  process.env.CLI_REGISTRY = defaultRegistry;
  checkPkgVersion();
  checkNodeVersion();
  await checkRoot();
  await checkUserHome();
  await checkEnv();
  await checkGlobalUpdate();
}

function registerCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .description("zhb-cli 脚手架，支持各种类型的前端项目开发，打包部署一体化")
    .version(pkg.version)
    .option("-d, --debug", "是否开启调试模式", false)
    .option(
      "-r, --registry",
      "设置 NPM 镜像(值: npm|yarn|tencent|cnpm|taobao|npmMirror)",
      defaultRegistry
    )
    .option("-tp, --targetPath <targetPath>", "是否指定本地调试文件路径", "");

  program
    .command("init [projectName]")
    .option("-f, --force", "是否强制初始化项目")
    .action(exec);

  program.on("option:targetPath", (targetPath) => {
    process.env.CLI_TARGET_PATH = targetPath;
  });

  program.on("option:debug", () => {
    process.env.LOG_LEVEL = "verbose";
    log.level = process.env.LOG_LEVEL;
  });

  program.on("option:registry", (registry) => {
    process.env.CLI_REGISTRY = registry;
  });

  program.on("command:*", (args) => {
    const avaliableCommands = program.commands.map((cmd) => cmd.name());
    log.error("未知命令：", colors.red(args[0]));
    if (avaliableCommands.length) {
      log.info("可用命令：", colors.green(avaliableCommands.join(", ")));
    }
  });

  program.parse(process.argv);

  if (!program.args.length) {
    program.outputHelp();
  }
}

/**
 * 检查版本号及更新提示
 */
async function checkGlobalUpdate() {
  // 1. 获取当前版本号和模块名
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  // 2. 调用 npm API 获取最新版本号
  const lastVersion = await getNpmSemverVersion(npmName, currentVersion);
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
