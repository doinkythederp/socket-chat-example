/// <reference types="node" />
'use strict';
console.log(require('os').hostname());
const express = require('express');
const app = express();

app.get('/', (req, res) => {
	res.send('<h1>Hello world!</h1>');
});

/** @type {import('http').Server} */
const server = app.listen(process.env.PORT || 3000, () => {
	console.log(`Listening on http://${process.env.HOSTNAME || 'localhost'}:${process.env.PORT || 3000}`)
});