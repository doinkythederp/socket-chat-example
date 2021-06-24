module.exports = {
	rateLimit: { points: 5, duration: 8 },
	/** @this {import('../../index.js').EventHandlerThis} */
	async exec(
		/** @type {{ content: string, timestamp: string }} */
		messageData,
		/** @type {(response: { status: 'success' | 'messageTimestampInvalid' } | { status: 'rateLimit', retryAfter: number } | { status: 'messageInvalid', maxLength?: number }) => void} */
		respond
	) {
		if (typeof messageData !== 'object')
			return void (typeof respond === 'function'
				? respond({ status: 'messageInvalid' })
				: 0);

		let { content, timestamp } = messageData;
		// message is not a string
		if (typeof content !== 'string')
			return void (typeof respond === 'function'
				? respond({ status: 'messageInvalid' })
				: 0);

		// message is too long
		if (content.length > this.config.maxMessageLength)
			return void (typeof respond === 'function'
				? respond({
						status: 'messageInvalid',
						maxLength: this.config.maxMessageLength
					})
				: 0);
		// message timed out
		if (timestamp - 8000 > Date.now())
			return void (typeof respond === 'function'
				? respond({
						status: 'messageTimestampInvalid'
					})
				: 0);
		try {
			await this.rateLimit.consume(this.socket.handshake.address);
		} catch (rej) {
			return void (typeof respond === 'function'
				? respond({
						status: 'rateLimit',
						retryAfter: rej.msBeforeNext
					})
				: 0);
		}
		const messageID = this.database.messages.length.toString();
		const message = {
			content,
			author: 'Anonymous#0000',
			id: messageID,
			timestamp: new Date(timestamp)
		};
		this.database.messages.unshift(message);
		if (typeof respond === 'function')
			respond({ status: 'success', message });
		console.log('>', content);
		this.socket.broadcast.emit('chat:message', message);
	}
}