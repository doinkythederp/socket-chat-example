/// <reference path='./commands.js' />
/// <reference path='./socket.io.min.js' />
/** @typedef {{ content: string, id: number, author: string, timestamp: string }} Message */
"use strict";

var nextClientID = 0;
var retryAfter = 0;
/**
 * @typedef {{ maxMessageLength: number, maxMessageFetch: number }} ServerConfig
 * @type {ServerConfig}
 */
var config = {};
var messagesLoaded = 0;
var allMessagesLoaded = false;

const socket = io();

/** @type {HTMLFormElement} */
const sendForm = document.querySelector("#send-gui");
/** @type {HTMLInputElement} */
const sendBox = document.querySelector("#send-box");
/** @type {HTMLUListElement} */
const messageList = document.querySelector("#messages");
/** @type {HTMLButtonElement} */
const sendButton = document.querySelector("#message-send");

sendForm.addEventListener("submit", function (event) {
  event.preventDefault();
  if (
    sendBox.value &&
    sendBox.value.length <= 200 &&
    Date.now() >= retryAfter
  ) {
    if (sendBox.value.startsWith("/")) {
      let slashArgs = sendBox.value.substr(1);
      sendBox.value = "";
      return void handleSlashCommand(slashArgs);
    }
    sendMessage(sendBox.value);
    sendBox.value = "";
  }
  sendBox.focus();
});

sendBox.addEventListener("input", function () {
  if (sendBox.value.length > config.maxMessageLength) {
    if (!sendButton.disabled) {
      sendButton.classList.add("is-danger");
      sendButton.disabled = true;
    }
    sendButton.textContent = (config.maxMessageLength - sendBox.value.length).toString();
  } else if (sendButton.disabled) {
    sendButton.classList.remove("is-danger");
    sendButton.disabled = false;
    sendButton.textContent = "Send";
  }
});

window.addEventListener('scroll', function () {
  if (window.pageYOffset <= 25) fetchMessages(25);
});

socket.on("chat:message", function (/** @type {Message} */ message) {
  const messageElement = addMessage(message.content, {
    id: message.id,
    author: message.author
  });
  messageElement.dataset.id = message.id;
  messageElement.dataset.timestamp = message.timestamp;
  messageElement.dataset.author = message.author;
  ++messagesLoaded;
});

socket.on("chat:sysmessage", echo);

/**
 * Adds a message to the client-side message list
 * @param {string} message The content of the message
 * @param {MessageData} data
 * @param {boolean} [noAdd=false] Don't actually add the message, and just return the message element
 * @returns {HTMLLIElement} The message HTML element
 * @typedef {{ clientID?: number, id?: number, type?: 'system' | 'command' | 'command-failed' | 'system-failed' | 'experiment' | 'experiment-failed' | 'pending' | 'none', author: string }} MessageData
 */
function addMessage(message, data = {}, noAdd = false) {
  console.log("Adding message with content: " + message);

  // Create the message li element
  let messageElement = document.createElement("li");
  messageElement.classList.add("message");

  let messageUsernameElement = messageElement.appendChild(
    document.createElement("div")
  );
  messageUsernameElement.classList.add("message-author");

  let messageContentElement = messageElement.appendChild(
    document.createElement("p")
  );
  messageContentElement.classList.add("message-content");

  // Edits the username, and the content coloring, based on type
  {
    messageUsernameElement.textContent = data.author || "";
    let author = messageUsernameElement.innerHTML;

    // System messages have a (>) symbol and are greyed out
    if (data.type && data.type.startsWith("system")) {
      author = "<i class='fas fa-chevron-circle-right'></i> " + author;
      // Don't grey out system messages if failed
      if (!data.type.endsWith("-failed"))
        messageContentElement.classList.add("is-grey");
    }

    // Command messages have a cube symbol
    if (data.type && data.type.startsWith("command"))
      author = "<i class='fas fa-cubes'></i> " + author;

    // Experiment messages have a flask
    if (data.type && data.type.startsWith("experiment"))
      author = "<i class='fas fa-flask'></i> " + author;

    // Failed messages are red
    if (data.type && data.type.endsWith("-failed"))
      messageContentElement.classList.add("is-danger");

    // Add style to author's tag
    let tagSplit = author.split("#");
    if (tagSplit[1])
      tagSplit[1] =
        '<span class="is-grey message-author-tag">#' + tagSplit[1] + "</span>";
    author = tagSplit.join("");

    messageUsernameElement.innerHTML = author;
  }

  // Add content to message
  messageContentElement.textContent = message;

  // Replace newlines with <br> tags
  messageContentElement.innerHTML = messageContentElement.innerHTML
    .split("\n")
    .join("<br/>");

  if (data.type === "pending") {
    if (data.clientID) messageElement.dataset.clientid = data.clientID;
    messageContentElement.classList.add("is-pending");
    setTimeout(function () {
      if (messageContentElement.classList.contains("is-pending")) {
        messageContentElement.classList.remove("is-pending");
        messageContentElement.classList.add("is-danger");
      }
    }, 8000);
  }
  if (!noAdd) {
    messageList.appendChild(messageElement);
    window.scrollTo(0, document.body.scrollHeight);
  }
  return messageElement;
}
/**
 * Echos a message to that chat that only the client can see
 * @param {string} msg The message to add to the chat
 * @param {'system' | 'command' | 'command-failed' | 'system-failed' | 'experiment' | 'experiment-failed' | 'none'} [type="system"] The type of message to add. Modifies the chat color and username icon.
 * @param {string} [name] 
 */
function echo(msg, type = "system", name) {
  if (!name) {
    switch (type) {
      case "command":
      case "command-failed":
        name = "Slash Command";
        break;
      
      case "system":
      case "system-failed":
        name = "System";
        break;

      case "experiment":
      case "experiment-failed":
        name = "Experiment";
        break;
    
      default:
        name = "Discarp#0000";
        break;
    }
  }
  addMessage(msg, { type: type, author: name });
}

function sendMessage(message) {
  const id = nextClientID.toString();
  ++nextClientID;
  const messageElement = addMessage(message, {
    clientID: id,
    type: "pending",
    author: "Anonymous#0000"
  });
  socket.emit(
    "chat:send",
    { content: message, timestamp: new Date() },
    /** @param {{ status: 'success' | 'messageTimestampdanger' } | { status: 'rateLimit', retryAfter: number } | { status: 'messagedanger', maxLength?: number }} res */
    function (res) {
      let messageContentElement =
        messageElement.querySelector(".message-content");
      messageContentElement.classList.remove("is-pending");
      if (
        res.status === "messagedanger" ||
        res.status === "messageTimestampdanger"
      ) {
        messageContentElement.classList.add("is-danger");
        if ("maxLength" in res) {
          config.maxMessageLength = res.maxLength;
          console.log("Message error: message too long");
        } else {
          console.log("Message error: content danger");
        }
      }
      if (res.status === "rateLimit") {
        console.log(
          "Message with client ID " +
            id +
            " was ratelimited! Blocking messages for now."
        );
        retryAfter = Date.now() + res.retryAfter;
        messageContentElement.classList.add("is-danger");
        echo("You're sending messages too fast! Please slow down.");
      }
      if (res.status === "success") {
        ++messagesLoaded;
      }
    }
  );
}

/** @param {string} message */
function handleSlashCommand(message) {
  let args = message.trim().split(" ");
  let command = args.shift().toLowerCase();
  const cmdExports = slashCommands[command];
  if (!cmdExports || (cmdExports.experimental && !experimentsEnabled))
    return void echo(
      "Invalid slash command; say '/help' for a list of commands.",
      "command-failed"
    );
  cmdExports.exec(args);
}
/**
 * Loads more messages onto the screen
 * @param {number} num The amount to load - must be less than 25
 * @param {(res: MessageFetchResponse) => void} [callback]
 * @typedef {{ status: 'success', messages: Message[], allLoaded: boolean } | { status: 'rateLimit' | 'messageCountdanger' }} MessageFetchResponse
 */
function fetchMessages(num, callback) {
  if (!num) return;
  if (allMessagesLoaded) return;
  console.log('Requesting ' + num + ' more messages')
  socket.emit(
    "chat:fetchmessages",
    /** @type {[number, number]} */
    [messagesLoaded, messagesLoaded + num],
    function (/** @type {MessageFetchResponse} */ res) {
      if (res.allLoaded) allMessagesLoaded = true;
      if (res.status === "success") {
        /** @type {HTMLLIElement} */
        let firstElem;
        // calculates Y to scroll to
        //let scroll = document.documentElement.scrollHeight - window.innerHeight;
        for (let message of res.messages) {
          const messageElement = addMessage(
            message.content,
            { id: message.id, author: message.author },
            // messages are added using a different method than addMessage
            true
          );
          
          messageElement.dataset.id = message.id;
          messageElement.dataset.timestamp = message.timestamp;
          messageElement.dataset.author = message.author;

          // messages are recieved newest first.
          // in the HTML, older items should be first.
          messageList.prepend(messageElement);
          if (!firstElem) firstElem = messageElement;
          ++messagesLoaded;
        }
        firstElem.scrollIntoView({block: "start", inline: "nearest"});
      }
      if (callback) callback(res);
    }
  );
}

{
  socket.emit(
    "chat:getinfo",
    function (/** @type {ServerConfig} */ info) {
      config = info;
      sendBox.disabled = false;
      sendBox.focus();
    }
  );
  fetchMessages(25);
  echo("Welcome! There are " + "?" + " other(s) online.");
  echo("Add message history!", "system", "Todo List");
  echo("Add connected/disconnected notifications", "system", "Todo List");
  echo("Add username/nick support", "system", "Todo List");
  echo("Add typing notifications", "system", "Todo List");
  echo("Add channels? (maybe)", "system", "Todo List");
}