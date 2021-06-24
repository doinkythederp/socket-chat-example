
module.exports = {
  rateLimit: { points: 3, duration: 3 },
	/** @this {import('../../index.js').EventHandlerThis} */
	async exec(
		request,
		/** @type {(response: { status: 'success', messages: import('./databaseManager.js').Message[], allLoaded: boolean } | { status: 'rateLimit', retryAfter: number } | { status: 'requestInvalid', maxNumber?: number }) => void} */
		respond
	) {
		if (typeof respond !== 'function') return;

		try {
			await this.rateLimit.consume(this.socket.handshake.address);
		} catch (rej) {
			return void respond({
				status: 'rateLimit',
				retryAfter: rej.msBeforeNext
			});
		}

		if (!Array.isArray(request))
			return void respond({ status: 'requestInvalid' });

		if (
			request[1] - request[0] < 0 ||
			request[1] - request[0] > config.maxMessageFetch
		)
			return void respond({
				status: 'requestInvalid',
				maxNumber: config.maxMessageFetch
			});

		let messages;
		try {
			messages = this.database.messages.slice(request[0], request[1]);
		} catch {
			return void respond({ status: 'requestInvalid' });
		}
		respond({
			status: 'success',
			messages,
			allLoaded: request[1] - 1 >= this.database.messages.length
		});
	}
};
