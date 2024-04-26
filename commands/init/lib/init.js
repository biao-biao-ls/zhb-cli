"use strict";

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
    console.log('init的业务逻辑');
  }
}

function init(argv) {
  return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
