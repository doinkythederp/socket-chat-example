'use strict';

const socket = io();

/** @type {HTMLFormElement} */
const sendForm = document.querySelector('#send');
/** @type {HTMLInputElement} */
const sendBox = document.querySelector('#send-box');
/** @type {HTMLUListElement} */
const messageList = document.querySelector('#messages');
/** @type {HTMLButtonElement} */
const sendButton = document.querySelector('#send-button');

sendForm.addEventListener('submit', function(event) {
	event.preventDefault();
	if (sendBox.value && sendBox.value.length <= 200) {
		addMessage({ msg: sendBox.value });
		socket.emit('message', { msg: sendBox.value });
		sendBox.value = '';
	}
});

sendBox.addEventListener('input', () => {
	if (sendBox.value.length > 200) {
		if (!sendButton.disabled) {
			sendButton.classList.add('is-invalid');
			sendButton.disabled = true;
		}
		sendButton.textContent = (200 - sendBox.value.length).toString();
	} else if (sendButton.disabled) {
		sendButton.classList.remove('is-invalid');
		sendButton.disabled = false;
		sendButton.textContent = 'Send';
	}
})

socket.on('message', addMessage);

function addMessage(message) {
	console.log('message add: ' + sendBox.value);
	let messageElement = document.createElement('li');
	messageElement.textContent = message.msg;
	messageList.appendChild(messageElement);
	window.scrollTo(0, document.body.scrollHeight);
}