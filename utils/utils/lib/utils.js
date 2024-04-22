"use strict";

function getJSType(obj) {
  return Object.prototype.toString.call(obj).slice(8, -1);
}

function isObject(obj) {
  return getJSType(obj) === "Object";
}

module.exports = { isObject, getJSType };
