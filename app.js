var httpserver = require('./lib/httpserver');

exports.create = function (server, store, host, port, publicDir, options) {
  var app = httpserver.create(store, {
    host: host
  , port: port
  , publicDir: publicDir
  , keypath: options.keypath
  , tokenDbPath: options.tokenDbPath
  });

  return app;
};
