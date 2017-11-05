"use strict";

var exchanges = {};
var queues = {};

function connect(url, options, connCallback) {
  if (!connCallback) {
    options = {};
    connCallback = options;
  }
  var createChannel = function (channelCallback) {

    var channel = {
      assertQueue: function (queue, qOptions, qCallback) {
        qCallback = qCallback || function () { };
        setIfUndef(queues, queue, { messages: [], subscribers: [], options: qOptions });
        qCallback();
      },

      assertExchange: function (exchange, type, exchOptions, exchCallback) {
        if (typeof (exchOptions) === "function") {
          exchCallback = exchOptions;
          exchOptions = {};
        }
        setIfUndef(exchanges, exchange, { bindings: [], options: exchOptions, type: type });
        return exchCallback && exchCallback();
      },

      bindQueue: function (queue, exchange, key, args, bindCallback) {
        bindCallback = bindCallback || function () { };
        if (!exchanges[exchange]) return bindCallback("Bind to non-existing exchange " + exchange);
        var re = "^" + key.replace(".", "\\.").replace("#", "(\\w|\\.)+").replace("*", "\\w+") + "$";
        exchanges[exchange].bindings.push({ regex: new RegExp(re), queueName: queue });
        bindCallback();
      },

      publish: function (exchange, routingKey, content, props, pubCallback) {
        pubCallback = pubCallback || function () { };
        if (!exchanges[exchange]) return pubCallback("Publish to non-existing exchange " + exchange);
        var bindings = exchanges[exchange].bindings;
        var matchingBindings = bindings.filter(function (b) { return b.regex.test(routingKey); });
        matchingBindings.forEach(function (binding) {
          var subscribers = queues[binding.queueName] ? queues[binding.queueName].subscribers : [];
          subscribers.forEach(function (sub) {
            var message = { fields: { routingKey: routingKey }, properties: props, content: content };
            sub(message);
          });
        });
        return pubCallback && pubCallback();
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
      close: function (callback) {
        callback = callback || function () { };

        return callback();
      }
    };
    channelCallback(null, channel);
  };

  var connection = {
    createChannel: createChannel,
    createConfirmChannel: createChannel,
    on: function () { },
    close: function (callback) {
      callback = callback || function () { };
      return callback();
    }
  };

  connCallback(null, connection);

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
