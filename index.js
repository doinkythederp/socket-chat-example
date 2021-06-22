/// <reference types='node' />
/** @typedef {{ content: string, id: number, author: string, timestamp: Date }} Message */
/** @typedef {{ version: 1, messages: Message[] }} MessageHistory */
'use strict';

// Config file
const config = require('./config.json');

// Express App
const express = require('express');
const app = express();

// HTTP server
const http = require('http');
const server = http.createServer(app);

// Socket.io server
const { Server: ioServer } = require('socket.io');
const io = new ioServer(server);

// Socket.io ratelimit
const { RateLimiterMemory } = require('rate-limiter-flexible');
const sendRateLimit = new RateLimiterMemory({ points: 8, duration: 12 });
const fetchRateLimit = new RateLimiterMemory({ points: 3, duration: 3 });

// Message History handler
const fs = require('fs');
const v8 = require('v8');
/** @type {MessageHistory} */
const messageHistory = readMessageHistory(__dirname + '/messages.bin');
const messageHistoryInterval = setInterval(() => {
	fs.writeFileSync(__dirname + '/messages.bin', v8.serialize(messageHistory));
}, 5000);

/** @type {Set<import('socket.io').Socket>} */
var sockets = new Set();

app.use(express.static(__dirname + '/static'));

io.on('connection', (socket) => {
  sockets.add(socket);
  console.log('New Connection!');
  socket.on('disconnect', (reason) => {
    sockets.delete(socket);
    console.log('User disconnected:', reason);
  });
  socket.on(
    'chat:send',
    async function (
      /** @type {{ content: string, timestamp: string }} */
      messageData,
      /** @type {(response: { status: 'success' | 'messageTimestampInvalid' } | { status: 'rateLimit', retryAfter: number } | { status: 'messageInvalid', maxLength?: number }) => void} */
      respond
    ) {
      if (typeof messageData !== 'object')
				return void(typeof respond === 'function' ? respond({ status: 'messageInvalid' }) : 0);

      let { content, timestamp } = messageData;
			// message is not a string
      if (typeof content !== 'string')
				return void(typeof respond === 'function' ? respond({ status: 'messageInvalid' }) : 0);

			// message is too long
			if (content.length > config.maxMessageLength)
        return void(typeof respond === 'function' ? respond({
          status: 'messageInvalid',
          maxLength: config.maxMessageLength
        }) : 0);
			// message timed out
      if (timestamp - 8000 > Date.now())
				return void(typeof respond === 'function' ? respond({
					status: 'messageTimestampInvalid'
				}) : 0);
      try {
        await sendRateLimit.consume(socket.handshake.address);
      } catch (rej) {
        return void(typeof respond === 'function' ? respond({
          status: 'rateLimit',
          retryAfter: rej.msBeforeNext
        }) : 0);
      }
			const messageID = messageHistory.messages.length.toString();
			const message = { content, author: 'Anonymous#0000', id: messageID, timestamp: new Date(timestamp) };
			messageHistory.messages.unshift(message);
      if (typeof respond === 'function') respond({ status: 'success', message });
      console.log('>', content);
      socket.broadcast.emit('chat:message', message);
    }
  );
	socket.on('chat:getinfo', (/** @type {(info: { maxMessageLength: number }) => void} */ cb) => {
		if (typeof cb === 'function') cb(config);
	});
  socket.on('chat:fetchmessages', async function (
      request,
      /** @type {(response: { status: 'success', messages: Message[], allLoaded: boolean } | { status: 'rateLimit', retryAfter: number } | { status: 'requestInvalid', maxNumber?: number }) => void} */
      respond
    ) {
      if (typeof respond !== 'function') return;

      try {
        await fetchRateLimit.consume(socket.handshake.address);
      } catch (rej) {
        return void respond({
          status: 'rateLimit',
          retryAfter: rej.msBeforeNext
        });
      }

      if (!Array.isArray(request))
        return void respond({ status: 'requestInvalid' });

      if (request[1] - request[0] < 0 || request[1] - request[0] > config.maxMessageFetch)
        return void respond({ status: 'requestInvalid', maxNumber: config.maxMessageFetch });
      
      let messages;
      try {
        messages = messageHistory.messages.slice(request[0], request[1]);
      } catch {
        return void respond({ status: 'requestInvalid' });
      }
      respond({ status: 'success', messages, allLoaded: request[1] - 1 >= messageHistory.messages.length })
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log(
    `Listening on http://${require('os').hostname() || 'localhost'}:${
      process.env.PORT || 3000
    }`
  );
});

process.once('SIGINT', stop).on('SIGQUIT', stop);

async function stop() {
  console.log();
  console.log('Disconnecting sessions...');
  sockets.forEach((socket) => void socket.disconnect(true));
  console.log('Stopping server...');
  server.close((err) => {
    if (err) throw err;
		console.log('Saving message history...');
		clearInterval(messageHistoryInterval);
		fs.writeFileSync(__dirname + '/messages.bin', v8.serialize(messageHistory));
    console.log('Done!');
		process.exitCode = 0;
  });
}
/** @param {string} path */
function readMessageHistory(path) {
  // latest message history version
  const CURRENT_VERSION = 1;

  /** @type {Message[] | { version: 1, messages: Message[] }} */
  let decoded = v8.deserialize(fs.readFileSync(path));

  // detect message history version
  let version;
  if (Array.isArray(decoded)) version = 0;
  else version = decoded.version;

  // convert to latest version
  if (version === 0) {
    decoded = { version: 1, messages: decoded.reverse() };
  }

  console.log('Loaded message history with format v' + version + (version !== CURRENT_VERSION ? ' (Converted to v' + CURRENT_VERSION + ')' : ''))
  return decoded;
}