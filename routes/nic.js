/**
 * @module routes/nic
 */

var dns = require('native-dns')
  , url = require('url')
  ;

exports.create = function (store) {
  var api = {}
    ;

  /**
   * Update a domain.
   *
   * Request query should have `hostname` and `myip`. Those values are stored into DomainStore.
   * If these values are invalid, it returns `nochg`.
   *
   * @param req {Request} HTTP request
   * @param res {Response} HTTP request
   */
  api.update = function (req, res) {
    var query
      , domain
      , updates
      , update
      , err
      ;

    query = url.parse(req.url, true).query;
    if (query.key || query.name || query.hostname) {
      update = query;
      updates = [query];
    }
    if (Array.isArray(req.body)) {
      update = null;
      updates = req.body;
    }

    if (!updates || !updates.length) {
      console.error(query);
      console.error(req.body);
      res.send({ error: { message:
        'usage: POST [{ "name": "example.com", "value": "127.0.0.1", "ttl": 300, "type": "A" }]'
      } });
      return;
    }
	if(!update.skey || update.skey != "fnyg2015"){
		console.error(query);
      console.error(req.body);
      res.send({ error: { message:
        'usage: POST [{ "name": "example.com", "value": "127.0.0.1", "ttl": 300, "type": "A" }]'
      } });
      return;
	}
    if (!updates.every(function (update, i) {
      if (!update.type) {
        update.type = 'A';
      }
      update.host = update.host || update.key || update.name || update.hostname;

      // TODO BUG XXX must test if address is ipv4 or ipv6
      // (my comcast connection is ipv6)
      update.answer = update.answer || update.value || update.address || update.ip || update.myip
        || req.connection.remoteAddress
        ;
      update.answers = Array.isArray(update.answers) && update.answers || [update.answer];
      if (update.ttl) {
        update.ttl = parseInt(update.ttl, 10);
      }
      if (!update.ttl) {
        update.ttl = 71;
      }
      // TODO update.priority


      if (!dns.consts.NAME_TO_QTYPE[update.type.toString().toUpperCase()]) {
        err = { error: { message: "unrecognized type '" + update.type + "'" } };
        return false;
      }

      if (!update.answer) {
        err = { error: { message: "missing key (hostname) and or value (ip)" } };
        return false;
      }

      domain = {
        host : update.host
      , name : update.host
      , type: update.type || 'A' //dns.consts.NAME_TO_QTYPE[update.type || 'A'],
      , values : update.answers
      , answers : update.answers
      , ttl : update.ttl
      , priority: update.priority
      };
      updates[i] = {
        type: domain.type
      , host: domain.host
      , answers: domain.answers
      , ttl: domain.ttl
      , priority: domain.priority
      };

      store.registerAnswer(domain, function (err) {
        if (err) {
          // TODO should differentiate between bad user data and server failure
          res.status(500).send({ error: { message: err.message || err.toString() } });
        } else {
        }
      });

      return true;
    })) {
      res.status(500).send(err);
      return;
    }

    res.send(update || updates);
  };

  return api;
  //return PromiseA.resolve(api);
};
