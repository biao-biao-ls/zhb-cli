const request = require('@zhb-cli/request');

module.exports = function() {
  return request({
    url: '/project/template',
  });
};
