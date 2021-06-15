'use strict';

const socket = io();

/** @type {HTMLFormElement} */
const sendForm = document.querySelector('#send');
/** @type {HTMLInputElement} */
const sendBox = document.querySelector('#send-box');
/** @type {HTMLUListElement} */
const messageList = document.querySelector('#messages');

sendForm.addEventListener('submit', function(event) {
	event.preventDefault();
	if (sendBox.value) {
		console.log('message send: ' + sendBox.value);
		addMessage({ msg: sendBox.value });
		socket.emit('message', { msg: sendBox.value });
		sendBox.value = '';
	}
})

socket.on('message', addMessage);

function addMessage(message) {
	let messageElement = document.createElement('li');
	messageElement.textContent = message.msg;
	messageList.appendChild(messageElement);
	window.scrollTo(0, document.body.scrollHeight);
}