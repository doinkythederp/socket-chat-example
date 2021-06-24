/** @typedef {{ content: string, id: number, author: string, timestamp: Date }} Message */
/** @typedef {{ id: number, username: string, tag: string, timestamp: Date }} User */
/** @typedef {{ version: 2, messages: Message[], users: User[] }} Database */
const v8 = require('v8');
const fs = require('fs');
module.exports = function loadDatabase(path) {
    // latest message history version
    const CURRENT_VERSION = 1;

    /** @type {Message[] | { version: 1, messages: Message[] }} */
    let decoded = v8.deserialize(fs.readFileSync(path));

    // detect message history version
    let version;
    if (Array.isArray(decoded)) version = 0;
    else version = decoded.version;

    // convert to latest version
    if (version === 0) {
      decoded = { version: 1, messages: decoded.reverse() };
    }
    /*
    if (version === 1) {
      decoded = {
        version: 2,
        messages: decoded.messages.map((message) => ((message.author = '-1'), message)),
        users: [
          {
            id: -2,
            username: 'Discarp',
            tag: '0000',
            timestamp: new Date(1624390617829)
          },
          {
            // ID is so that even if the user changes their username, we still know which messages are theirs
            id: -1,
            username: 'Anonymous',
            tag: '0000',
            timestamp: new Date(1624390617829)
          }
        ]
      };
    }
    */

    console.log(
      'Loaded database has format v' +
        version +
        (version !== CURRENT_VERSION
          ? ' (Converted to v' + CURRENT_VERSION + ')'
          : '')
    );

    const dbSaver = setInterval(() => {
      fs.writeFileSync(path, v8.serialize(decoded));
    }, 5000);

    return {
      database: decoded,
      stopDatabaseSave: () => {
        clearInterval(dbSaver);
        fs.writeFileSync(path, v8.serialize(decoded));
      }
    };
  }