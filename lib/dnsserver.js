/**
 * @module dnsserver
 */

var PromiseA = require('bluebird').Promise;
var dns = require('native-dns');

/**
 * Dynamic DNS Server.
 * @constructor
 */
function DynDnsServer(store, option) {
  var self = this;

  if (!option || !option.primaryNameserver) {
    throw new Error("You must supply options, at least { primaryNamserver: 'ns1.example.com' }");
  }

  if (!option.port || option.port < 0) {
    option.port = 53;
  }

  if (!option.host) {
    option.host = '0.0.0.0';
  }

  this.store = store;
  this.option = option;
  this.nameservers = option.nameservers;

  this.tcpserver = dns.createTCPServer();
  this.server = dns.createServer();

  this.server.on('request', function (req, res) {
    self.onMessage(req, res);
  });
  this.server.on('error', this.onError);
  this.server.on('socketError', this.onSocketError);

  this.tcpserver.on('request', function(req, res) {
    self.onMessage(req, res);
  });
  this.tcpserver.on('error', this.onError);
  this.tcpserver.on('socketError', this.onSocketError);
}
exports.DynDnsServer = DynDnsServer;

DynDnsServer.prototype.start = function(cb) {
  var self = this;

  return new PromiseA(function (resolve, reject) {
    var count = 0;

    function onListening(err) {
      //console.log('dns listening', self.option.port, self.option.host);
      count += 1;
      if (count > 1) {
        if (cb) { cb(err); }
        if (err) { reject(err); } else { resolve(); }
      }
    }

    self.server.on('listening', onListening);
    self.tcpserver.on('listening', onListening);

    self.server.serve(self.option.port, self.option.host);
    self.tcpserver.serve(self.option.port, self.option.host);
  });
};

DynDnsServer.prototype.stop = function(clbk) {
  var self = this;
  var count = 0;

  function onClose() {
    count += 1;
    if (count > 1) {
      clbk();
    }
  }

  self.server.on('close', onClose);
  self.tcpserver.on('close', onClose);

  self.server.close();
  self.tcpserver.close();
};

DynDnsServer.prototype.onMessage = function (request, response) {
  var self = this;

  //console.log('\n\n');
  //console.log('request', request.question);
  //console.log('type', dns.consts.QTYPE_TO_NAME[request.question[0].type]);
  //console.log('class',dns.consts.QCLASS_TO_NAME[request.question[0].class]);

  // This is THE authority
  response.header.aa = 1;

  function getSOA() {
    var name = request.question[0].name;
    var soa = {
      "name": name,
      "ttl": "7200",
      "primary": self.option.primaryNameserver,
      "admin": "hostmaster." + name,
      // YYYYmmddss
      // http://mxtoolbox.com/problem/dns/DNS-SOA-Serial-Number-Format
      "serial": "2015062300",
      "refresh": "10800",
      "retry": "3600",
      // 14 days
      // http://mxtoolbox.com/problem/dns/DNS-SOA-Expire-Value
      "expiration": "1209600",
      "minimum": "1800"
    };

    return soa;
  }

  if ('SOA' === dns.consts.QTYPE_TO_NAME[request && request.question[0].type]) {
    // See example of
    // dig soa google.com @ns1.google.com

    // TODO auto-increment serial number as epoch timestamp (in seconds) of last record update for that domain
    if (false && /^ns\d\./.test(name)) {
      /*
      soa.ttl = 60;

      response.authority.push(dns.NS({
        name: request.question[0].name
      , data: ns.name
      , ttl: 60 * 60
      }));
      */
    } else {
      response.answer.push(dns.SOA(getSOA()));

      self.nameservers.forEach(function (ns) {
        response.authority.push(dns.NS({
          name: request.question[0].name
        , data: ns.name
        , ttl: 60 * 60
        }));

        response.additional.push(dns.A({
          name: ns.name
        , address: ns.ipv4
        , ttl: 60 * 60
        }));
      });

      response.send();
    }
    return;
  }

  if ('NAPTR' === dns.consts.QTYPE_TO_NAME[request && request.question[0].type]) {

    // See example of
    // dig naptr google.com @ns1.google.com

    response.authority.push(dns.SOA(getSOA()));
    /*
    response.authority.push(dns.NAPTR({
      "flags": "aa qr rd"
    }));
    */
    response.send();
    return;
  }

  if ('NS' === dns.consts.QTYPE_TO_NAME[request && request.question[0].type]) {

    // See example of
    // dig ns google.com @ns1.google.com

    //console.log(Object.keys(response));
    //console.log('response.header');
    //console.log(response.header);
    //console.log('response.authority');
    //console.log(response.authority);

    response.header.aa = 1;

    self.nameservers.forEach(function (ns) {
      response.answer.push(dns.NS({
        name: request.question[0].name
      , data: ns.name
      , ttl: 60 * 60
      }));
      response.additional.push(dns.A({
        name: ns.name
      , address: ns.ipv4
      , ttl: 60 * 60
      }));
    });

    response.send();
    return;
  }

  if ('A' === dns.consts.QTYPE_TO_NAME[request && request.question[0].type]) {
    if (/^local(host)?\./.test(request.question[0].name)) {
      response.header.aa = 1;

      (function () {
        var type = dns.consts.QTYPE_TO_NAME[request.question[0].type];
        var name = request.question[0].name;
        var value = '127.0.0.1';
        var priority = 10;
        //var klass = dns.consts.QCLASS_TO_NAME[request.question[0].class];

        response.answer.push(
          dns[type]({
            name: name
          , address: '127.0.0.1'
          , ttl: 43200 // 12 hours
          , data: [value]
          , exchange: value
          , priority: priority || 10
          })
        );
      }());

      response.send();
      return;
    }
  }

  self.store.getAnswerList(request && request.question.map(function (q) {
    return {
      name: q.name
    , type: dns.consts.QTYPE_TO_NAME[q.type]
    , class: dns.consts.QCLASS_TO_NAME[q.class]
    };
  })).then(function (answer) {
    //console.log('answer', answer);
    response.header.aa = 1;
    response.answer = answer.map(function (a) {
      var answer = {
        name: a.name
      , address: a.values[0]
      , data: a.values
      , exchange: a.values[0]
      , priority: a.priority || 10
      , ttl: a.ttl || 600
      };

      if ('CNAME' === a.type) {
        answer.data = answer.data[0];
      }

      return dns[a.type](answer);
    });

    response.send();
  });
};

DynDnsServer.prototype.onError = function (err, buff, req, res) {
  // I don't know the actual API here
  console.error('[onError]');
  console.error(arguments);
  console.error(err && err.stack || err || "Unknown Error");
  if (res && res.send) {
    res.send();
  }
  if (req && req.send) {
    req.send();
  }
  if (buff && buff.send) {
    buff.send();
  }
};

DynDnsServer.prototype.onSocketError = function (err, socket) {
  // I don't know the actual API here
  console.error('[onSocketError]');
  console.error(arguments);
  console.error(err && err.stack || err || "Unknown Error");
  if (socket && socket.destroy) {
    // ??
    socket.destroy();
  }
};
