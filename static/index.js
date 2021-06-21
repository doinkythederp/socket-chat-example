/// <reference path='./commands.js' />
/// <reference path='./socket.io.min.js' />
/** @typedef {{ content: string, id: number, author: string, timestamp: string }} Message */
'use strict';

var nextClientID = 0;
var retryAfter = 0;
var maxMessageLength = Infinity;

const socket = io();

/** @type {HTMLFormElement} */
const sendForm = document.querySelector('#send-gui');
/** @type {HTMLInputElement} */
const sendBox = document.querySelector('#send-box');
/** @type {HTMLUListElement} */
const messageList = document.querySelector('#messages');
/** @type {HTMLButtonElement} */
const sendButton = document.querySelector('#message-send');

sendForm.addEventListener('submit', function (event) {
  event.preventDefault();
  if (
    sendBox.value &&
    sendBox.value.length <= 200 &&
    Date.now() >= retryAfter
  ) {
    if (sendBox.value.startsWith('/')) {
      let slashArgs = sendBox.value.substr(1);
      sendBox.value = '';
      return void handleSlashCommand(slashArgs);
    }
    sendMessage(sendBox.value);
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

socket.on('message', function (/** @type {Message} */ message) {
  const messageElement = addMessage(message.content, { id: message.id, author: message.author });
  messageElement.dataset.id = message.id;
  messageElement.dataset.timestamp = message.timestamp;
  messageElement.dataset.author = message.author;
});

socket.on('system', system);

/**
 * Adds a message to the client-side message list
 * @param {string} message The content of the message
 * @param {MessageData} data
 * @typedef {{ clientID?: number, id?: number, type: 'system' | 'command' | 'command-failed' | 'system-failed' | 'user', author: string }} MessageData
 */
function addMessage(message, data = {}) {
  console.log('Adding message with content: ' + message);

  // Create the message li element
  let messageElement = document.createElement('li');
	messageElement.classList.add('message');

  let messageUsernameElement = messageElement.appendChild(
    document.createElement('div')
  );
  messageUsernameElement.classList.add('message-author');

  let messageContentElement = messageElement.appendChild(
    document.createElement('p')
  );
  messageContentElement.classList.add('message-content');

  // Edits the username, and the content coloring, based on type
  {
		messageUsernameElement.textContent = data.author || '';
		let author = messageUsernameElement.innerHTML;

		// System messages have a (>) symbol and are greyed out
		if (data.type && data.type.startsWith('system')) {
			author = '<i class=\'fas fa-chevron-circle-right\'></i> ' + author;
			// Don't grey out system messages if failed
			if (!data.type.endsWith('-failed'))
				messageContentElement.classList.add('is-pending');
		}

		// Command messages have a cube symbol
		if (data.type && data.type.startsWith('command'))
			author = '<i class=\'fas fa-cubes\'></i> ' + author;
	
		// Failed messages are red
		if (data.type && data.type.endsWith('-failed'))
			messageContentElement.classList.add('is-invalid');
	
		// Add style to author's tag
		let tagSplit = author.split('#');
		if (tagSplit[1]) tagSplit[1] = '<span class="is-grey message-author-tag">#' + tagSplit[1] + '</span>';
		author = tagSplit.join('');

		messageUsernameElement.innerHTML = author;
	}

	// Add content to message
	messageContentElement.textContent = message;

	// Replace newlines with <br> tags
  messageContentElement.innerHTML = messageContentElement.innerHTML.split('\n').join('<br/>');

  if (data.type === 'user') {
    if (data.clientID) messageElement.dataset.clientid = data.clientID;
    messageContentElement.classList.add('is-pending');
    setTimeout(function () {
      if (messageContentElement.classList.contains('is-pending')) {
        messageContentElement.classList.remove('is-pending');
        messageContentElement.classList.add('is-invalid');
      }
    }, 8000);
  }
  messageList.appendChild(messageElement);
  window.scrollTo(0, document.body.scrollHeight);
  return messageElement;
}

function system(msg, name = 'System') {
  addMessage(msg, { type: 'system', author: name });
}

function commandResponse(msg, failed = false, name = 'Slash Command') {
  if (!failed) {
    addMessage(msg, { type: 'command', author: name });
  } else {
    addMessage(msg, { type: 'command-failed', author: name });
  }
}

function sendMessage(message) {
  const id = nextClientID.toString();
  ++nextClientID;
  const messageElement = addMessage(message, { clientID: id, type: 'user', author: 'Anonymous#0000' });
  socket.emit(
    'message',
    { content: message, timestamp: new Date() },
    /** @param {{ status: 'success' | 'messageTimestampInvalid' } | { status: 'rateLimit', retryAfter: number } | { status: 'messageInvalid', maxLength?: number }} res */
    function (res) {
			let messageContentElement = messageElement.querySelector('.message-content');
      messageContentElement.classList.remove('is-pending');
      if (
        res.status === 'messageInvalid' ||
        res.status === 'messageTimestampInvalid'
      ) {
        messageContentElement.classList.add('is-invalid');
        if ('maxLength' in res) {
          maxMessageLength = res.maxLength;
          console.log('Message error: message too long');
        } else {
          console.log('Message error: content invalid');
        }
      }
      if (res.status === 'rateLimit') {
        console.log(
          'Message with client ID ' +
            id +
            ' was ratelimited! Blocking messages for now.'
        );
        retryAfter = Date.now() + data['retry-ms'];
        messageContentElement.classList.add('is-invalid');
        system('You\'re sending messages too fast! Please slow down.');
      }
    }
  );
}

/** @param {string} message */
function handleSlashCommand(message) {
  let args = message.trim().split(' ');
  let command = args.shift().toLowerCase();
  const cmdExports = slashCommands[command];
  if (!cmdExports)
    return void commandResponse(
      'Invalid slash command; say \'/help\' for a list of commands.',
      true
    );
  cmdExports.exec(args);
}

{
  socket.emit('info', (/** @type {{ maxMessageLength: number }} */ info) => {
    maxMessageLength = info.maxMessageLength;
    sendBox.disabled = false;
  });
  system('Welcome! There are ' + '(?)' + ' other(s) online.');
  system('Todo:');
  system('Add connected/disconnected notifications');
  system('Add username/nick support');
  system('Add typing notifications');
  system('Add channels? (maybe)');
}
