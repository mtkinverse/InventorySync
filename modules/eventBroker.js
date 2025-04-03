class EventBroker { // Uisng class just to store memory internally, in the class
    constructor() {
        this.subscribers = {};
    }

    publish(event, data) {
        if (this.subscribers[event]) {
            this.subscribers[event].forEach(handler => handler(data));
        }
    }

    emit(event, data) {
        this.publish(event, data);
    }

    subscribe(event, handler) {
        if (!this.subscribers[event]) {
            this.subscribers[event] = [];
        }
        this.subscribers[event].push(handler);
    }

    unsubscribe(event, handler) {
        if (this.subscribers[event]) {
            const index = this.subscribers[event].indexOf(handler);
            if (index > -1) {
                this.subscribers[event].splice(index, 1);
            }
        }
    }
}

module.exports = new EventBroker();
