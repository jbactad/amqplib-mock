"use strict";
var Bluebird = require('bluebird');
var exchanges = {};
var queues = {};
var channel = {
  assertQueue: function (queue, qOptions) {
    return new Bluebird(function (resolve) {
      setIfUndef(queues, queue, { messages: [], subscribers: [], options: qOptions });
      return resolve();
    });
  },

  assertExchange: function (exchange, type, exchOptions) {
    return new Bluebird(function (resolve) {
      exchOptions = exchOptions || {};
      setIfUndef(exchanges, exchange, { bindings: [], options: exchOptions, type: type });

      return resolve();
    });
  },

  bindQueue: function (queue, exchange, key, args) {
    return new Bluebird(function (resolve, reject) {
      if (!exchanges[exchange])
        return reject("Bind to non-existing exchange " + exchange);

      var re = "^" + key.replace(".", "\\.").replace("#", "(\\w|\\.)+").replace("*", "\\w+") + "$";
      exchanges[exchange].bindings.push({ regex: new RegExp(re), queueName: queue });

      return resolve();
    });
  },

  publish: function (exchange, routingKey, content, props) {
    return new Bluebird(function (resolve, reject) {
      if (!exchanges[exchange])
        return reject("Publish to non-existing exchange " + exchange);

      var bindings = exchanges[exchange].bindings;
      var matchingBindings = bindings.filter(function (b) { return b.regex.test(routingKey); });

      matchingBindings.forEach(function (binding) {
        var subscribers = queues[binding.queueName] ? queues[binding.queueName].subscribers : [];
        subscribers.forEach(function (sub) {
          var message = { fields: { routingKey: routingKey }, properties: props, content: content };
          sub(message);
        });
      });

      return resolve();
    })
  },

  consume: function (queue, handler) {
    queues[queue].subscribers.push(handler);
  },

  deleteQueue: function (queue) {
    setImmediate(function () {
      delete queues[queue];
    });
  },

  ack: function () { },
  nack: function () { },
  prefetch: function () { },
  on: function () { },
  close: function () {
    return Bluebird.resolve();
  }
};
function createChannel() {
  return new Bluebird(function (resolve) {
    return resolve(channel);
  });
};
function connect(url, options) {
  return new Bluebird(function (resolve) {

    var connection = {
      createChannel: createChannel,
      createConfirmChannel: createChannel,
      on: function () { },
      close: function () {
        return Bluebird.resolve();
      }
    };

    return resolve(connection);
  });
}

function resetMock() {
  queues = {};
  exchanges = {};
}

module.exports = { connect: connect, resetMock: resetMock };

function setIfUndef(object, prop, value) {
  if (!object[prop]) {
    object[prop] = value;
  }
}
