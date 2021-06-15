/// <reference types="node" />
'use strict';

const express = require('express');
const app = express();

const http = require('http');
const server = http.createServer(app);

const { Server: ioServer } = require('socket.io');
const io = new ioServer(server);

const { RateLimiterMemory } = require('rate-limiter-flexible');
const rateLimit = new RateLimiterMemory({ points: 8, duration: 8 });

/** @type {Set<import('socket.io').Socket>} */
var sockets = new Set();

app.use(express.static(__dirname + '/static'));

io.on('connection', socket => {
	sockets.add(socket);
	console.log('New Connection!');
	socket.on('disconnect', reason => {
		sockets.delete(socket);
		console.log('User disconnected:', reason);
	});
	socket.on('message', async ( /** @type {{ msg: string }} */ { msg, nonce }) => {
		if (typeof msg !== 'string' || msg.length > 200) return;
		try {
			await rateLimit.consume(socket.handshake.address);
		} catch(rej) {
			return void socket.emit('rate-limit', { 'retry-ms': rej.msBeforeNext, nonce });
		}
		socket.emit('sent', nonce);
		console.log('>', msg);
		socket.broadcast.emit('message', { msg });
	});
});

server.listen(process.env.PORT || 3000, () => {
	console.log(`Listening on http://${require('os').hostname() || 'localhost'}:${process.env.PORT || 3000}`)
});

process.once('SIGINT', stop).on('SIGQUIT', stop);

async function stop() {
	console.log('Disconnecting sessions...');
	sockets.forEach(socket => void socket.disconnect(true));
	console.log('Stopping server...');
	server.close(err => {
		if (err) throw err;
		console.log('Done!');
	})
}