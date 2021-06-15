/// <reference types="node" />
'use strict';

const express = require('express');
const app = express();

app.get('/', (req, res) => {
	res.sendFile('./index.html', { root: process.cwd() });
});

/** @type {import('http').Server} */
const server = app.listen(process.env.PORT || 3000, () => {
	console.log(`Listening on http://${require('os').hostname() || 'localhost'}:${process.env.PORT || 3000}`)
});