/**
 * @module routes/index
 */

var store;

/**
 * Set domain store.
 * @param domainstore
 */
function setDomainStore(domainstore) {
  store = domainstore;
}
exports.setDomainStore = setDomainStore;

/**
 * Render index page.
 * @param req {Request} HTTP request
 * @param res {Response} HTTP request
 */
exports.index = function(req, res) {
  res.render('index', {
    title: 'node-dyndns',
    home: 'http://www.bitbucket.org/ntakimura/node-dyndns',
    description: 'node-dynsns manageents Dynamic DNS by Node.js.'
  });
};

/**
 * Render domain page.
 * @param req {Request} HTTP request
 * @param res {Response} HTTP request
 */
exports.domain = function(req, res) {

  store.getAnswerList(undefined, function(err, answers) {

    res.render('domain', {
      title: 'node-dyndns - Domain',
      domains: answers,
    });

  });

};

