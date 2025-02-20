import { contextBridge, ipcRenderer } from 'electron';
import { BoltType, ProfitData } from '../shared/types';
import { IPC_CHANNELS } from '../shared/ipc';

console.log('Preload script starting...');

try {
    contextBridge.exposeInMainWorld('electron', {
        setLimit: (type: BoltType) => ipcRenderer.send(IPC_CHANNELS.SET_PURCHASE_LIMIT, type),
        clearLimit: (type: BoltType) => ipcRenderer.send(IPC_CHANNELS.CLEAR_PURCHASE_LIMIT, type),
        onProfitUpdate: (callback: (data: { 
            rubyProfit: ProfitData | null; 
            diamondProfit: ProfitData | null; 
            lastUpdateTime: number 
        }) => void) => {
            ipcRenderer.on('update-profits', (_event, data) => callback(data));
        },
        onUpdatingPrices: (callback: () => void) => {
            ipcRenderer.on('updating-prices', () => callback());
        },
        onError: (callback: (error: string) => void) => {
            ipcRenderer.on('error', (_event, error) => callback(error));
        },
        removeListeners: () => {
            ipcRenderer.removeAllListeners('update-profits');
            ipcRenderer.removeAllListeners('updating-prices');
            ipcRenderer.removeAllListeners('error');
        }
    });
    console.log('Successfully exposed electron API');
} catch (error) {
    console.error('Failed to expose electron API:', error);
}

// Add another debug log
console.log('Preload script finished, electron API exposed:', !!window.electron); 