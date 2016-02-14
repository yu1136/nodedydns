/**
 * @module domainstore
 */

var PromiseA = require('bluebird').Promise
  , fs = PromiseA.promisifyAll(require('fs'))
  , path = require('path')
  ;

/**
 * Domain Store.
 * @constructor
 */
function DomainStore(options) {
  if (!options) {
    options = {};
  }
  if (!options.filepath) {
    throw new Error("missing filepath to json file for DomainStore");
  }

  var self = this;

  self.answers = [];
  self.additionals = [];

  self._spacer = '  ';
  self._replacer = null;
  self._filename = options.filepath;
  self._load();
}
exports.DomainStore = DomainStore;

DomainStore.prototype._save = function (cb) {
  var self = this
    , data = JSON.stringify({ answers: self.answers, additionals: self.additionals }, self._replacer, self._spacer)
    ;

  return fs.writeFileAsync(self._filename, data, 'utf8').then(function () {
    if (cb) { cb(); }
  });
};
DomainStore.prototype._load = function (cb) {
  var self = this
    ;

  return fs.readFileAsync(self._filename, 'utf8').then(function (str) {
    var data = JSON.parse(str);

    self.answers = data.answers || [];
    self.additionals = data.additionals || [];

    if (cb) { cb(); }
  }).error(function () {
    throw new Error(self._filename + " could not be read. Please create it: `echo \"{}\" > " + self._filename + "'");
  });
};

/**
 * Register a  answer.
 */
DomainStore.prototype.registerAnswer = function(answer, cb) {
  var self = this
    , record
    ;
  
  self.answers.some(function (a) {
    if (a.type === answer.type && a.name === answer.name) {
      record = a;
      return true;
    } else if (a.id && a.id === answer.id) {
      record = a;
      return true;
    }
  });

  if (!record) {
    record = {};
    self.answers.push(record);
  }

  record.name = answer.name;
  record.values = answer.values;
  record.type = answer.type;
  record.ttl = answer.ttl;

  return self._save(cb);
};

/**
 * Unregister a  answer.
 */
DomainStore.prototype.unregisterAnswer = function(answer, cb) {
  var self = this
    , i
    ;

  for (i = 0; i < self.answers.length; i++) {
    if (self.answers[i].name === answer.key &&
        self.answers[i].values[0] === answer.value) {
      break;
    }
  }

  if (i < self.answers.length) {
    self.answers.splice(i, 1);
  }
  
  return self._save(cb);
};

/*
DomainStore.prototype.clear = function(cb) {
  var self = this;
  
  self.answers = [];
  self.additionals = [];

  return self._save(cb);
};
*/

/**
 * Obtain  Answer list.
 */
DomainStore.prototype.getAnswerList = function(questions, cb) {
  var self = this,
      answer = [];

  function isInRequest(domain) {
    return questions.some(function (question) {
      if (domain.name === question.name && domain.type === question.type) {
        return true;
      }
    });
  }
  
  self.answers.forEach(function(domain) {
    if (!questions || isInRequest(domain)) {
      answer.push(domain);
    }
  });
  
  return PromiseA.resolve(answer).then(function () {
    if (cb) { cb(null, answer); }

    return answer;
  });
};

/**
 * Obtain  Additional list.
 */
DomainStore.prototype.getAdditionalList = function(request, cb) {
  var self = this;
  
  return PromiseA.resolve(self.additionals).then(function () {
    if (cb) { cb(null, self.additionals); }

    return self.additionals;
  });
};
