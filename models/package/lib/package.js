"use strict";

const path = require("path");
const npminstall = require("npminstall");
const fse = require('fs-extra')
const semver = require("semver");
const { isObject } = require("@zhb-cli/utils");
const formatPath = require("@zhb-cli/format-path");
const {
  getDefaultRegistry,
  getNpmLatestVersion,
} = require("@zhb-cli/get-npm-info");

class Package {
  constructor(options = {}) {
    if (!isObject(options)) {
      throw new Error("Package Constructor 参数必须为 Object 类型");
    }
    // pkg 目标路径
    this.targetPath = options.targetPath;
    // 缓存package的路径
    this.storeDir = options.storeDir;
    // pkg 名称
    this.packageName = options.packageName;
    // pkg 版本号
    this.packageVersion = options.packageVersion;
  }
  async prepare() {
    const { pathExistsSync } = await import("path-exists");
    if (this.storeDir && !pathExistsSync(this.storeDir)) {
      fse.ensureDirSync(this.storeDir)
    }
    if (this.packageVersion === "latest") {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    }
  }

  get cacheFilePath() {
    return path.resolve(this.storeDir, this.packageName);
  }

  // 判断pkg是否存在
  async exists() {
    const { pathExistsSync } = await import("path-exists");
    if (this.storeDir) {
      await this.prepare();
      return pathExistsSync(this.cacheFilePath)
    } else {
      return pathExistsSync(this.targetPath);
    }
  }
  // 安装 pkg
  async install() {
    await this.prepare();
    const registry = getDefaultRegistry();
    await npminstall({
      root: this.targetPath,
      // storeDir: path.resolve(this.targetPath, "node_modules"),
      storeDir: this.storeDir,
      registry,
      pkgs: [{ name: this.packageName, version: this.packageVersion }],
    });
  }
  // 更新 pkg
  async update() {
    this.packageVersion = await getNpmLatestVersion(this.packageName);
    const cachePkg = require(path.join(this.cacheFilePath, 'package.json'))
    if (semver.gt(this.packageVersion, cachePkg.version)) {
      await this.install()
    }
  }
  // 获取入口文件路径
  async getRootFilePath() {
    let filePath = this.targetPath
    if (this.storeDir) {
      filePath = this.cacheFilePath
    }
    const { packageDirectorySync } = await import("pkg-dir");
    // 获取 package.json 所在目录
    const dir = packageDirectorySync({ cwd: filePath});
    if (dir) {
      // 读取 package.json
      const pkgFile = require(path.join(dir, "package.json"));
      // 寻找 main
      if (pkgFile && pkgFile.main) {
        // 路径兼容 （macOS/Windows）
        return formatPath(path.resolve(dir, pkgFile.main));
      }
    }
    return null;
  }
}

module.exports = Package;
