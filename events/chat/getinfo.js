module.exports = {
	rateLimit: { points: 5, duration: 8 },
	/** @this {import('../../index.js').EventHandlerThis} */
	exec(
		/** @type {(info: typeof config) => void} */ cb
		) {
		if (typeof cb === 'function') cb(this.config);
	}
}