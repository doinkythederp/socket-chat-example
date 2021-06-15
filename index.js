/// <reference types="node" />
'use strict';

const express = require('express');
const app = express();

const http = require('http');
const server = http.createServer(app);

const { Server: ioServer } = require('socket.io');
const io = new ioServer(server);
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
	socket.on('message', ( /** @type {{ msg: string }} */ { msg }) => {
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