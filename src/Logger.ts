import { appendFile } from 'fs/promises';
import { join } from 'path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMessage {
    level: LogLevel;
    message: string;
    timestamp: string;
    data?: any;
}

export class Logger {
    private logFile: string;
    private debugMode: boolean;

    constructor(logFile: string = 'app.log', debugMode: boolean = false) {
        this.logFile = join(process.cwd(), logFile);
        this.debugMode = debugMode;
    }

    private formatMessage(level: LogLevel, message: string, data?: any): LogMessage {
        return {
            level,
            message,
            timestamp: new Date().toISOString(),
            data: data || undefined
        };
    }

    private async writeToFile(logMessage: LogMessage): Promise<void> {
        const formattedMessage = `[${logMessage.timestamp}] ${logMessage.level.toUpperCase()}: ${logMessage.message}${
            logMessage.data ? `\nData: ${JSON.stringify(logMessage.data, null, 2)}` : ''
        }\n`;

        try {
            await appendFile(this.logFile, formattedMessage);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    private log(level: LogLevel, message: string, data?: any): void {
        const logMessage = this.formatMessage(level, message, data);

        // Always log errors and non-debug messages
        if (level === 'error' || !this.debugMode) {
            console.log(`${logMessage.level.toUpperCase()}: ${logMessage.message}`);
            if (logMessage.data) {
                console.log('Data:', logMessage.data);
            }
        }

        // Write to file asynchronously
        this.writeToFile(logMessage).catch(error => {
            console.error('Failed to write log:', error);
        });
    }

    debug(message: string, data?: any): void {
        if (this.debugMode) {
            this.log('debug', message, data);
        }
    }

    info(message: string, data?: any): void {
        this.log('info', message, data);
    }

    warn(message: string, data?: any): void {
        this.log('warn', message, data);
    }

    error(message: string, data?: any): void {
        this.log('error', message, data);
    }

    setDebugMode(enabled: boolean): void {
        this.debugMode = enabled;
    }
} 