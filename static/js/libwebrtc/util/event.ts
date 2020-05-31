export default abstract class event {
	protected events = new Map<string, ((...args) => void)[]>();

	/**
	 * Register events
	 * @param event Event name
	 * @param callback
	 */
	register(event: string, callback: (...args) => void) {
		if (this.events.has(event)) {
			this.events.get(event).push(callback);
			return;
		}
		this.events.set(event, [callback]);
	}

	/**
	 * Trigger a event
	 * @param event Which event to raise
	 * @param args
	 */
	trigger(event: string, ...args) {
		let callbacks = this.events.get(event);
		if (!callbacks || callbacks.length === 0) return;
		callbacks.forEach(callback =>
			setTimeout(() => callback.apply(null, args), 0)
		);
	}

	removeEvent(event: string, callback) {
		let observers = this.events.get(event);
		if (!observers || observers.length === 0) return;
		observers.splice(observers.indexOf(callback), 1);
	}

	removeAllEvents(event?: string) {
		if (!event) {
			this.events.clear();
			return;
		}
		if (!this.events.has(event)) return false;
		let observers = this.events.get(event);
		return observers.splice(0, observers.length).length > 0;
	}
}
