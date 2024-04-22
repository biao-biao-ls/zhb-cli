"use strict";

module.exports = init;

function init(projectName, options) {
  console.log(projectName, options, process.env.CLI_TARGET_PATH);
}
