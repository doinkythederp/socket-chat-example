'use strict';

var nextNonce = 0;
var retryAfter = 0;

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
	if (sendBox.value && sendBox.value.length <= 200 && Date.now() >= retryAfter) {
		const nonce = nextNonce.toString();
		++nextNonce;
		addMessage({ msg: sendBox.value }, nonce);
		socket.emit('message', { msg: sendBox.value, nonce: nonce, timestamp: Date.now() });
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
});

socket.on('message', addMessage);
socket.on('rate-limit', function(data) {
	console.log('Message with identifier ' + data.nonce + ' was ratelimited! Blocking messages for now.');
	retryAfter = Date.now() + data['retry-ms'];
	let messageElement = document.querySelector('li[data-nonce="' + data.nonce + '"]');
	messageElement.classList.remove('is-pending');
	messageElement.classList.add('is-invalid');
	system("You're sending messages too fast! Please slow down.");
});
socket.on('sent', function(nonce) {
	console.log('Message with identifier ' + nonce + ' has been confirmed as sent.');
	let messageElement = document.querySelector('li[data-nonce="' + nonce + '"]');
	messageElement.classList.remove('is-pending');
});
socket.on('system', system);

function addMessage(message, nonce) {
	console.log('Adding message with content: ' + sendBox.value);
	/** @type {HTMLLIElement} */
	let messageElement = document.createElement('li');
	messageElement.textContent = message.msg;
	if (nonce === 'system') {
		messageElement.innerHTML = '<i class="fas fa-chevron-circle-right"></i> ' + messageElement.innerHTML;
		messageElement.classList.add('is-pending');
	}
	if (nonce && nonce !== 'system') {
		console.log('Message with identifier ' + nonce + ' is pending.');
		messageElement.dataset.nonce = nonce;
		messageElement.classList.add('is-pending');
		setTimeout(function() {
			if (messageElement.classList.contains('is-pending')) {
				messageElement.classList.remove('is-pending');
				messageElement.classList.add('is-invalid');
			}
		}, 8000)
	}
	messageList.appendChild(messageElement);
	window.scrollTo(0, document.body.scrollHeight);
}

function system(msg) {
	addMessage({ msg: msg }, 'system');
}

{
	system('Welcome! There are ' + '(?)' + ' other(s) online.');
	system('Todo:');
	system('Add connected/disconnected notifications');
	system('Add username/nick support');
	system('Add typing notifications');
	system('Add channels? (maybe)');
}