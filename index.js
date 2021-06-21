/// <reference types='node' />
/** @typedef {{ content: string, id: number, author: string, timestamp: Date }} Message */
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
const rateLimit = new RateLimiterMemory({ points: 8, duration: 8 });

// Message History handler
const fs = require('fs');
const v8 = require('v8');
/** @type {Array<Message>} */
const messageHistory = v8.deserialize(fs.readFileSync(__dirname + '/messages.bin'));
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
				return void respond({ status: 'messageInvalid' });
        
      let { content, timestamp } = messageData;
			// message is not a string
      if (typeof content !== 'string')
				return void respond({ status: 'messageInvalid' });

			// message is too long
			if (content.length > config.maxMessageLength)
        return void respond({
          status: 'messageInvalid',
          maxLength: config.maxMessageLength
        });
			// message timed out
      if (timestamp - 8000 > Date.now())
				return void respond({
					status: 'messageTimestampInvalid'
				});
      try {
        await rateLimit.consume(socket.handshake.address);
      } catch (rej) {
        return void respond({
          status: 'rateLimit',
          retryAfter: rej.msBeforeNext
        });
      }
			const messageID = messageHistory.length.toString();
			const message = { content, author: 'Anonymous#0000', id: messageID, timestamp: new Date(timestamp) };
			messageHistory.push(message);
      respond({ status: 'success', message });
      console.log('>', content);
      socket.broadcast.emit('chat:message', message);
    }
  );
	socket.on('chat:getinfo', (/** @type {(info: { maxMessageLength: number }) => void} */ cb) => {
		if (typeof cb === 'function') cb({ maxMessageLength: config.maxMessageLength });
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
