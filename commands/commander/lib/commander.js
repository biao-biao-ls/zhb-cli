"use strict";

const commander = require("commander");

module.exports = (pkg) => {
  const { program } = commander;

  // 主程序设置
  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .version(pkg.version)
    .option("-d, --debug", "是否开启调试模式", false)
    .option("-e, --env <envName>", "修改环境变量");

  // console.log(program._optionValues);
  // console.log(program._version);

  // 注册主程序的子命令
  program
    .command("clone <source> [destination]")
    .description("clone a repository")
    .option("-f, --force", "是否强制克隆")
    .action((source, destination, cmdObj) => {
      console.log(`zhb-cli clone ${source} ${destination}`, cmdObj);
    });

  // 创建子程序
  const service = new commander.Command("service");
  service.usage("<command> [options]").description("service child command");
  
  // 注册子程序的子命令
  service
    .command("start [port]")
    .description("start service by port")
    .action((port) => {
      console.log(`do service start`, port);
    });

  service
    .command("stop")
    .alias("s")
    .description("stop service")
    .action((port) => {
      console.log(`do service stop`);
    });

  program.addCommand(service);

  // 调用其它命令行工具
  program
    .command("install [name]", "install package", {
      executableFile: "lerna",
      // hidden: true,
      // isDefault: true
    })
    .alias("i");

  // 兜底任何没有注册过的命令
  // program
  //   .arguments("[command] [options]")
  //   .description(
  //     "zhb-cli 脚手架，提升效率，快速开发多种类型的前端项目，管理，发布，一体化",
  //     {
  //       command: "command to run",
  //       options: "options for command",
  //     }
  //   )
  //   .action((command, options) => {
  //     if (command) {
  //       console.log(`未注册命令 ${command}`, options);
  //     } else {
  //       program.outputHelp();
  //     }
  //   });

  // 自定义 help 信息
  // program.helpInformation = (context) => {
  //   return 'your help information\n'
  // }
  // 内置的 option help 自定义 help 信息
  program.on('--help', () => {
    // console.log('your help information');
  })

  // 自定义的 option 实现 debug 模式 
  program.on('option:debug', () => {
    process.env.LOG_LEVEL = 'verbose'
  })

  // 监听未知命令
  program.on('command:*', (cmds) => {
    console.error(`未知命令：${cmds[0]}`);
    const avaliableCommands = program.commands.map(cmd => cmd.name())
    console.log(`可用命令：${avaliableCommands.join(',')}`);
  })

  program.parse(process.argv);
};
