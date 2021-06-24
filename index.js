/// <reference types='node' />
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

// Database handler
const fs = require('fs');
const loadDatabase = require('./loadDatabase.js');
/** @type {Database} */
const { database, stopDatabaseSave } = loadDatabase(__dirname + '/database.bin');

/** @type {Set<import('socket.io').Socket>} */
var sockets = new Set();
/** @type {{ [eventName: string]: {exec: Function, rateLimit: RateLimiterMemory?} }} */
var events = new Map();

app.use(express.static(__dirname + '/static'));
/** @typedef {(this: { socket: import('socket.io').Socket, database: import('./loadDatabase.js').Database, rateLimit?: RateLimiterMemory, events: typeof events, config: typeof config }, args?: unknown, callback?: unknown) => void} EventHandler */
/** @typedef {{ socket: import('socket.io').Socket, database: import('./loadDatabase.js').Database, rateLimit?: RateLimiterMemory, events: typeof events, config: typeof config }} EventHandlerThis */
fs.readdirSync(__dirname + '/events').forEach((category) => {
  fs.readdirSync(__dirname + '/events/' + category).forEach((eventFile) => {
    /** @type {{ rateLimit?: { points: number, duration: number}, exec: EventHandler }} */
    const handler = require('./events/' + category + '/' + eventFile);
    /** @type {RateLimiterMemory?} */
    let rateLimit = null;
    if (handler.rateLimit) rateLimit = new RateLimiterMemory(handler.rateLimit);
    events[`${category}:${eventFile.split('.')[0]}`] = {
      exec(socket, ...args) {
        handler.exec.apply({ rateLimit, events, socket, config, database }, args);
      },
      rateLimit
    };
  });
});

io.on('connection', (socket) => {
  sockets.add(socket);
  console.log('New Connection!');
  socket.on('disconnect', (reason) => {
    sockets.delete(socket);
    console.log('User disconnected:', reason);
  });

  Object.entries(events).forEach(([name, { exec }]) => {
    socket.on(name, exec.bind(null, socket));
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
    stopDatabaseSave();
    console.log('Done!');
    process.exitCode = 0;
  });
}
