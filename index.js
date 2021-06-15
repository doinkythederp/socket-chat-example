/// <reference types="node" />
'use strict';

const express = require('express');
const app = express();

const http = require('http');
const server = http.createServer(app);

const { Server: ioServer } = require('socket.io');
const io = new ioServer(server);

app.use(express.static(__dirname + '/static'));

io.on('connection', socket => {
	console.log('New Connection!');
	socket.on('disconnect', reason => {
		console.log('User disconnected:', reason);
	})
});

server.listen(process.env.PORT || 3000, () => {
	console.log(`Listening on http://${require('os').hostname() || 'localhost'}:${process.env.PORT || 3000}`)
});

process.on('SIGINT', stop);

async function stop() {
	console.log('Stopping!');
	await Promise.all([
		asPromise(io.close),
		asPromise(server.close)
	]);
	console.log('Done!');

}
/** @param {(callback: (err?: any, out?: any) => void) => void} func */
function asPromise(func) {
	return new Promise((res, rej) => void func((err, out) => void(err ? rej(err) : res(out))));
}