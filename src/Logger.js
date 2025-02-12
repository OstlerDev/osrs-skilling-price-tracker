class Logger {
    constructor(options = {}) {
        this.debugMode = options.debug || false;
        this.logToFile = options.logToFile || false;
        // Could add file logging setup here if needed
    }

    info(message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] INFO: ${message}`);
    }

    error(message, error = null) {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] ERROR: ${message}`);
        if (error && this.debugMode) {
            console.error(error);
        }
    }

    debug(message) {
        if (this.debugMode) {
            const timestamp = new Date().toISOString();
            console.debug(`[${timestamp}] DEBUG: ${message}`);
        }
    }

    warn(message) {
        const timestamp = new Date().toISOString();
        console.warn(`[${timestamp}] WARN: ${message}`);
    }
}

module.exports = Logger; 