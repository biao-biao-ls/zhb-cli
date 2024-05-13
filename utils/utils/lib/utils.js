"use strict";

function getJSType(obj) {
  return Object.prototype.toString.call(obj).slice(8, -1);
}

function isObject(obj) {
  return getJSType(obj) === "Object";
}

async function spinnerStart(text, spinnerType = "dots") {
  const { default: ora, spinners } = await import("ora");
  const spinner = ora({
    text,
    spinner: spinnerType,
  }).start();
  return spinner;
}

function sleep(timeout = 1000) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

function exec(command, args, options) {
  const win32 = process.platform === "win32";

  const cmd = win32 ? "cmd" : command;
  const cmdArgs = win32 ? ["/c"].concat(command, args) : args;

  return require("child_process").spawn(cmd, cmdArgs, options || {});
}

function execAsync(command, args, options) {
  return new Promise((resolve, reject) => {
    const p = exec(command, args, options);
    p.on("error", (e) => {
      reject(e);
    });
    p.on("exit", (c) => {
      resolve(c);
    });
  });
}

module.exports = { isObject, getJSType, spinnerStart, sleep, execAsync };
