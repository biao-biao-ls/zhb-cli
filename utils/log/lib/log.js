"use strict";

const log = require("npmlog");
log.heading = "zhb-cli"; // 前缀
log.headingStyle = { fg: "red", bg: "black" }; // 前缀样式
log.level = process.env.LOG_LEVEL || "info"; // 优先级
log.addLevel("success", 2000, { fg: "green", bold: true }); // 添加自定义

module.exports = log;
