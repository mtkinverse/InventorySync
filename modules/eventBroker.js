class EventBroker {
    constructor() {
        this.subscribers = {}; // Stores event handlers
    }

    async publish(event, data) {
        if (this.subscribers[event]) {
            for (const handler of this.subscribers[event]) {
                await handler(data); // Ensures async execution
                // this.unsubscribe(event, handler);
            }
        }
    }

    async emit(event, data) {
        return this.publish(event, data);
    }

    on(event, handler) {
        this.subscribe(event, handler);
    }

    subscribe(event, handler) {
        if (!this.subscribers[event]) {
            this.subscribers[event] = [];
        }
        this.subscribers[event].push(handler);
    }

    unsubscribe(event, handler) {
        if (this.subscribers[event]) {
            this.subscribers[event] = this.subscribers[event].filter(h => h !== handler);
        }
    }
}

module.exports = new EventBroker();
