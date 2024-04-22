"use strict";

const axios = require("axios");
const semver = require("semver");
const registies = require("./registies.json");
const log = require('@zhb-cli/log')

/**
 * 根据包名，获取远程该包的信息
 * @param {*} npmName
 * @returns
 */
async function getNpmInfo(npmName) {
  if (!npmName) {
    return null;
  }
  const { default: urlJoin } = await import("url-join");
  const url = urlJoin(getDefaultRegistry(), npmName);
  try {
    const res = await axios.get(url);
    if (res.status === 200) {
      return res.data;
    } else {
      return null;
    }
  } catch (err) {
    return Promise.reject(err);
  }
}

function getDefaultRegistry() {
  const registry = registies[process.env.CLI_REGISTRY] || registies["npm"];
  log.info('使用 npm 镜像', registry)
  return registry
}

/**
 * 根据包名，获取远程该包名的所有版本号
 * @param {*} npmName
 * @returns
 */
async function getNpmVersions(npmName) {
  try {
    const info = await getNpmInfo(npmName);
    if (!info) {
      return Promise.reject(
        new Error("An error occurred while obtaining NPM information")
      );
    }
    return Object.keys(info.versions);
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * 获取大于基础版本的所有版本号
 * @param {*} baseVersion
 * @param {*} versions
 * @returns
 */
function getSemverVersions(baseVersion = "0.0.0", versions = []) {
  return versions.filter((version) =>
    semver.satisfies(version, `>${baseVersion}`)
  );
}

/**
 * 获取远程大于基础版本号的最新版本号
 * @param {*} npmName
 * @param {*} baseVersion
 * @returns
 */
async function getNpmSemverVersion(npmName, baseVersion = "0.0.0") {
  try {
    const versions = await getNpmVersions(npmName);
    const semverVersions = getSemverVersions(baseVersion, versions);
    // 倒叙排序
    semverVersions.sort((v1, v2) => {
      if (semver.eq(v1, v2)) return 0;
      return semver.gt(v1, v2) ? -1 : 1;
    });
    return semverVersions[0] || baseVersion;
  } catch (err) {
    return Promise.reject(err);
  }
}

async function getNpmLatestVersion(npmName) {
  const version = await getNpmSemverVersion(npmName)
  if (version !== '0.0.0') {
    return version
  } else {
    return null
  }
}

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNpmSemverVersion,
  getDefaultRegistry,
  getNpmLatestVersion
};
