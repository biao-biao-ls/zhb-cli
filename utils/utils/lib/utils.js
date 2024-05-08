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

module.exports = { isObject, getJSType, spinnerStart, sleep };
