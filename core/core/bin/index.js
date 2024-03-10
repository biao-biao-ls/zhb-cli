#!/usr/bin/env node

const importLocal = require('import-local')
const log = require('@zhb-cli/log')
const pkg = require('../package.json')

if (importLocal(__filename)) {
    log.info('cli', '正在使用 zhb-cli 本地版本')
} else {
    require('@zhb-cli/commander')(pkg)
    // require('../lib/core.js')(process.argv.slice(2))
}
 