const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Move the Metro server root to the monorepo root so that bundle URLs are
// resolved relative to the workspace root (e.g. /node_modules/expo-router/entry.bundle).
// Without this, hoisted packages produce ../../ traversal URLs that Metro rejects with 404.
config.server = {
  ...config.server,
  unstable_serverRoot: workspaceRoot,
};

// Block root's react-native@0.83.x and react@19.x — incompatible with expo 51.
// react-dom is NOT blocked here (root doesn't have it; mobile has its own copy).
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const rootNM = path.resolve(workspaceRoot, 'node_modules');
config.resolver.blockList = [
  new RegExp(`^${escapeRegExp(path.join(rootNM, 'react-native'))}(/.*)?$`),
  new RegExp(`^${escapeRegExp(path.join(rootNM, 'react'))}(/.*)?$`),
];

// react-native-maps has no web support — return an empty module when bundling for web.
// expo-location also has no web build; guard it the same way.
const WEB_NATIVE_ONLY = ['react-native-maps', 'expo-location'];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    const base = moduleName.split('/')[0];
    if (WEB_NATIVE_ONLY.includes(base)) {
      return { type: 'empty' };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
