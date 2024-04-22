"use strict";

const path = require("path");
const os = require("os");
const npminstall = require("npminstall");

module.exports = async function () {
  const userHome = os.homedir();
  const rootPath = path.resolve(userHome, ".zhb-cli");
  await npminstall({
    root: rootPath,
    storeDir: path.resolve(rootPath, "node_modules"),
    registry: "https://registry.npmjs.org",
    pkgs: [{ name: "foo", version: "~1.0.0" }],
  });
};
