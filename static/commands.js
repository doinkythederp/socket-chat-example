/// <reference path="./index.js" />

var shrugText = '¯\\_(ツ)_/¯';
var flipText = '(╯°□°）╯︵ ┻━┻';
var unflipText = '┬─┬ ノ( ゜-゜ノ)';

var slashCommands = {
	help: {
		desc: 'Lists all slash commands that can be run',
		client: true,
		exec: function(args) {
			let response = 'List of commands:\n\n';
			Object.entries(slashCommands).forEach(function (info) {
				response = response.concat('/', info[0], ' — ', info[1].desc);
				if (info[1].client) {
					response = response.concat(' (Does not affect others)');
				}
				response = response.concat('\n');
			});
			commandResponse(response);
		}
	},
	echo: {
		desc: 'Repeats the text you provide it with',
		client: true,
		exec: function(args) {
			commandResponse(args.join(' ').split('\\n').join('\n'));
		}
	},
	shrug: {
		desc: 'Appends a shrug (' + shrugText + ') to your message',
		client: false,
		exec: function (args) {
			let argsStr = args.join(' ');
			if (argsStr) {
				sendMessage(argsStr + ' ' + shrugText);
			} else {
				sendMessage(shrugText);
			}
		}
	},
	tableflip: {
		desc: 'Appends a tableflip (' + flipText + ') to your message',
		client: false,
		exec: function (args) {
			let argsStr = args.join(' ');
			if (argsStr) {
				sendMessage(argsStr + ' ' + flipText);
			} else {
				sendMessage(flipText);
			}
		}
	},
	unflip: {
		desc: 'Appends an unflip (' + unflipText + ') to your message',
		client: false,
		exec: function (args) {
			let argsStr = args.join(' ');
			if (argsStr) {
				sendMessage(argsStr + ' ' + unflipText);
			} else {
				sendMessage(unflipText);
			}
		}
	}
}