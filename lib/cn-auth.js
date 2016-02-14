'use strict';

var PromiseA = require('bluebird').Promise;
var path = require('path');
var jwt = PromiseA.promisifyAll(require('jsonwebtoken'));
var key;

function cnMatch(pat, sub) {
  var bare = pat.replace(/^\*\./, '');
  var dot = '.' + bare;
  var index;

  if ('*' === pat) {
    return true;
  }

  if (bare === sub) {
    return true;
  }

  // 'foo.example.com'.lastIndexOf('.example.com') + '.example.com'.length
  // === 'foo.example.com'.length;
  index = sub.lastIndexOf(dot);
  return sub.length === index + dot.length;
}

function create(keypath, tokenDbPath) {
  if (!keypath || !tokenDbPath) {
    throw new Error('badness');
  }
  function loadKey(filepath, doCreate) {
    if (key) {
      return PromiseA.resolve(key);
    }

    var fs = PromiseA.promisifyAll(require('fs'));
    var ursa = require('ursa');

    function create() {
      if (!doCreate) {
        return PromiseA.reject(new Error("cert doesn't exist"));
      }

      var key = ursa.generatePrivateKey(1024, 65537);
      var pem = key.toPrivatePem();

      return fs.writeFileAsync(filepath, pem, 'ascii').then(function () {
        return key;
      });
    }

    // exists is inverted
    return fs.existsAsync(filepath).then(function () {
      // failure case
      return create();
    }, function () {
      // success case
      return fs.readFileAsync(filepath, 'ascii').then(function (pem) {
        try {
          // the only reason to create this object is to test it's RSA correctness
          return ursa.createPrivateKey(pem/*, password, encoding*/);
        } catch(e) {
          return create();
        }
      });
    });
  }
  function loadOrCreate(filepath) {
    return loadKey(filepath, true);
  }

  function sign(domainname) {
    var Storage = require('dom-storage');
        // in-file, doesn't call `String(val)` on values (default)
    var localStorage = new Storage(tokenDbPath, { strict: false, ws: '  ' });

    var tok = localStorage.getItem(domainname);
    if (tok) {
      console.log('tok');
      console.log(tok);
      return PromiseA.resolve(tok);
    }

    return loadOrCreate(keypath).then(function (key) {
      var pem = key.toPrivatePem();
      var tok = jwt.sign({ cn: domainname }, pem, { algorithm: 'RS256' });

      localStorage.setItem(domainname, tok);
      // jwt

      console.log('jwt.decode(tok)');
      console.log(jwt.decode(tok));

      console.log('tok');
      console.log(tok);

      return tok;
    });
  }

  function verify(domainname, token) {
    var cn = token.cn;

    if (!cnMatch(cn, domainname)) {
      return PromiseA.reject(new Error("invalid domain '" + domainname
        + "' for cn pattern '" + cn + "'"));
    }

    return PromiseA.resolve(true);
  }

  function verifyJwt(token) {
    return loadKey(keypath).then(function (key) {
      return jwt.verifyAsync(token, key.toPublicPem()/*, { ignoreExpiration: true }*/).then(function (decoded) {
        return decoded;
      });
    });
  }

  return {
    sign: sign
  , verify: verify
  , verifyJwt: verifyJwt
  , cnMatch: cnMatch
  , loadKey: function () {
      return loadKey(keypath);
    }
  };
}

module.exports.create = create;
module.exports.cnMatch = cnMatch;

if (require.main === module) {
  if (!process.argv[2]) {
    throw new Error("Usage: node cn-auth '*.example.com'");
  }

  var cnAuth = create(
    path.join(__dirname, '..', 'etc', 'nsx.redirect-www.org.key.pem')
  , path.join(__dirname, '..', 'var', './cn-auth.json')
  );
  cnAuth.sign(process.argv[2]).then(function (tok) {
    return cnAuth.verifyJwt(tok).then(function (decoded) {
      return cnAuth.verify(process.argv[3], decoded).then(function (result) {
        console.log('result');
        console.log(result);
        return result;
      });
    }, function (err) {
      console.error('No Dice, sucker!');
      console.error(err.message);
    });
  });
}
