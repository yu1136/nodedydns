/**
 * node dyndns redis module.
 * @module redis
 */

var redis = require('redis'),
    client;

/**
 * Obtain singleton client instance.
 * @static
 * @returns {RedisClient} redis client
 */
function createClient() {
  if (client && client.connected) {
    return client;
  }

  if (process.env.VCAP_SERVICES) {
    var vcapService = JSON.parse(process.env.VCAP_SERVICES);

    client = redis.createClient(
        vcapService['redis-2.2'][0].credentials.port,
        vcapService['redis-2.2'][0].credentials.hostname,
        { 'no_ready_check' : true });
    client.auth(vcapService['redis-2.2'][0].credentials.password,
        function(err, res) {
        }
    );
  } else {
    client = redis.createClient(6379, '127.0.0.1', { 'no_ready_check' : true });
  }

  return client;
}

exports.client = createClient;
exports.createClient = createClient;
 