"use strict";

var exchanges = {};
var queues = {};
var channel = {
  assertQueue: function (queue, qOptions) {
    setIfUndef(queues, queue, { messages: [], subscribers: [], options: qOptions });

    return Promise.resolve();
  },

  assertExchange: function (exchange, type, exchOptions) {
    exchOptions = exchOptions || {};
    setIfUndef(exchanges, exchange, { bindings: [], options: exchOptions, type: type });

    return Promise.resolve();
  },

  bindQueue: function (queue, exchange, key, args) {
    if (!exchanges[exchange])
      return Promise.reject("Bind to non-existing exchange " + exchange);

    var re = "^" + key.replace(".", "\\.").replace("#", "(\\w|\\.)+").replace("*", "\\w+") + "$";
    exchanges[exchange].bindings.push({ regex: new RegExp(re), queueName: queue });

    return Promise.resolve();
  },

  publish: function (exchange, routingKey, content, props) {
    if (!exchanges[exchange])
      return Promise.reject("Publish to non-existing exchange " + exchange);

    var bindings = exchanges[exchange].bindings;
    var matchingBindings = bindings.filter(function (b) { return b.regex.test(routingKey); });

    matchingBindings.forEach(function (binding) {
      var subscribers = queues[binding.queueName] ? queues[binding.queueName].subscribers : [];
      subscribers.forEach(function (sub) {
        var message = { fields: { routingKey: routingKey }, properties: props, content: content };
        sub(message);
      });
    });

    return Promise.resolve();
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
  on: function () { }
};
function createChannel() {
  return Promise.resolve(channel);
};
function connect(url, options) {
  var connection = {
    createChannel: createChannel,
    createConfirmChannel: createChannel,
    on: function () { }
  };

  return Promise.resolve(connection);
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
