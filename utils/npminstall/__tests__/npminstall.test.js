'use strict';

const npminstall = require('..');
const assert = require('assert').strict;

assert.strictEqual(npminstall(), 'Hello from npminstall');
console.info('npminstall tests passed');
