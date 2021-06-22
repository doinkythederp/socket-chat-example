/// <reference path="./index.js" />

var shrugText = "¯\\_(ツ)_/¯";
var flipText = "(╯°□°）╯︵ ┻━┻";
var unflipText = "┬─┬ ノ( ゜-゜ノ)";

var experimentsEnabled = false;

/**
 * @typedef {{desc: string, exec: (args: string[]) => void, clientOnlyMessage?: boolean, experimental?: boolean, hidden?: boolean}} SlashCommand
 * @type {{ [commandName: string]: SlashCommand }}
 */
var slashCommands = {
	//#region Basic Commands
  help: {
    desc: "Lists all slash commands that can be run",
    exec: function (args) {
      let response = "List of commands:\n\n";
      Object.entries(slashCommands).forEach(function (info) {
        if (info[1].hidden || (info[1].experimental && !experimentsEnabled))
          return;
        response = response.concat("/", info[0], " — ", info[1].desc);
        if (info[1].experimental) {
          response = response.concat(" [Experimental!]");
        }
        response = response.concat("\n");
      });
      echo(response, "command");
    }
  },
  echo: {
    desc: "Displays the text you provide it with",
    exec: function (args) {
      echo(args.join(" ").split("\\n").join("\n"), "command");
    }
  },
  experiments: {
    desc: "Enables experimental commands",
    hidden: true,
    exec: function (args) {
      let keyword;
      if (experimentsEnabled) {
        (experimentsEnabled = false), (keyword = "disabled");
      } else {
        (experimentsEnabled = true), (keyword = "enabled");
      }
      echo("Experimental commands are now " + keyword + ".", "command");
    }
  },
	//#endregion
	//#region Emote Commands
  shrug: {
    desc: "Appends a shrug (" + shrugText + ") to your message",
    exec: function (args) {
      let argsStr = args.join(" ");
      if (argsStr) {
        sendMessage(argsStr + " " + shrugText);
      } else {
        sendMessage(shrugText);
      }
    }
  },
  tableflip: {
    desc: "Appends a tableflip (" + flipText + ") to your message",
    exec: function (args) {
      let argsStr = args.join(" ");
      if (argsStr) {
        sendMessage(argsStr + " " + flipText);
      } else {
        sendMessage(flipText);
      }
    }
  },
  unflip: {
    desc: "Appends an unflip (" + unflipText + ") to your message",
    exec: function (args) {
      let argsStr = args.join(" ");
      if (argsStr) {
        sendMessage(argsStr + " " + unflipText);
      } else {
        sendMessage(unflipText);
      }
    }
  },
	//#endregion
	//#region Experimental Commands
	fetch: {
		desc: "Fetches previously sent messages from the server",
		experimental: true,
		exec: function (args) {
			const num = Number(args[0]);
			if (!num) return void echo("How many messages?", "experiment");
			if (num > config.maxMessageFetch) return void echo("Too many messages! The maximum you can fetch at once is currently " + config.maxMessageFetch + ".", "experiment");
			fetchMessages(num, function (res) {
				if (res.status !== "success") return void echo("Failed: " + res.status, "experiment-failed");
			})
		}
	}
	//#endregion
};
