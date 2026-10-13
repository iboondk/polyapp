const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
// The @polyapp/api-client dependency is a file: link to the built client in the monorepo.
// Metro must watch that folder so changes to the built dist are picked up.
const apiClientRoot = path.resolve(__dirname, '../../packages/api-client');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [apiClientRoot];

module.exports = config;
