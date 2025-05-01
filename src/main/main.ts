import { app as ElectronApp, Menu, Tray, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { Logger } from '../Logger';
import { PriceHistoryManager } from '../PriceHistoryManager';
import { ItemRegistry } from '../ItemRegistry';
import { EnchantingMonitor } from '../EnchantingMonitor';
import { BOLT_CONFIGS } from '../shared/constants';
import { BoltType, EnhancedProfitData } from '../shared/types';
import { IPC_CHANNELS } from '../shared/ipc';
import fs from 'fs';

// Hide dock icon on macOS
if (process.platform === 'darwin') {
    ElectronApp.dock.hide();
}

const logger = new Logger();

type IconTypes = {
    DEFAULT: string;
    PROFITHIGH: string;
    PROFITMEDIUM: string;
    PROFITLOW: string;
    LOSS: string;
    LIMIT: string;
    ERROR: string;
    NOTIFICATION: string;
};

const ICONS: IconTypes = {
    DEFAULT: 'icon-default.png',
    PROFITHIGH: 'icon-profit-high.png',
    PROFITMEDIUM: 'icon-profit-medium.png',
    PROFITLOW: 'icon-profit-low.png',
    LOSS: 'icon-loss.png',
    LIMIT: 'icon-limit.png',
    ERROR: 'icon-error.png',
    NOTIFICATION: 'icon-notification.png'
};

const INTERVALS = {
    CHECK: 60000,           // 1 minute
    NOTIFICATION: 300000,   // 5 minutes
    LIMIT: 4 * 60 * 60 * 1000  // 4 hours
} as const;

interface PurchaseLimit {
    limitReached: boolean;
    resetTime: number | null;
}

class MenuBarApp {
    private tray: Tray | null = null;
    private popupWindow: BrowserWindow | null = null;
    private logger: Logger;
    private rubyBoltMonitor: EnchantingMonitor;
    private diamondBoltMonitor: EnchantingMonitor;
    private purchaseLimits: {
        ruby: PurchaseLimit;
        diamond: PurchaseLimit;
    };
    private limitsFilePath: string;

    constructor() {
        this.logger = new Logger();
        this.rubyBoltMonitor = new EnchantingMonitor(BOLT_CONFIGS.ruby, this.logger);
        this.diamondBoltMonitor = new EnchantingMonitor(BOLT_CONFIGS.diamond, this.logger);
        this.limitsFilePath = path.join(ElectronApp.getPath('userData'), 'purchase-limits.json');
        this.purchaseLimits = this.loadPurchaseLimits();
    }

    private loadPurchaseLimits(): { ruby: PurchaseLimit; diamond: PurchaseLimit } {
        try {
            if (fs.existsSync(this.limitsFilePath)) {
                const data = JSON.parse(fs.readFileSync(this.limitsFilePath, 'utf8'));
                // Clean up expired limits
                if (data.ruby?.resetTime && data.ruby.resetTime < Date.now()) {
                    data.ruby = { limitReached: false, resetTime: null };
                }
                if (data.diamond?.resetTime && data.diamond.resetTime < Date.now()) {
                    data.diamond = { limitReached: false, resetTime: null };
                }
                return data;
            }
        } catch (error) {
            this.logger.error('Failed to load purchase limits:', error);
        }
        return {
            ruby: { limitReached: false, resetTime: null },
            diamond: { limitReached: false, resetTime: null }
        };
    }

    private savePurchaseLimits(): void {
        try {
            fs.writeFileSync(this.limitsFilePath, JSON.stringify(this.purchaseLimits));
        } catch (error) {
            this.logger.error('Failed to save purchase limits:', error);
        }
    }

    async start() {
        await ElectronApp.whenReady();
        this.createTray();
        this.setupIPCListeners();
        this.startPriceChecking();
    }

    private createTray() {
        const icon = path.join(__dirname, '../../assets', ICONS.DEFAULT);
        this.tray = new Tray(icon);
        
        const contextMenu = Menu.buildFromTemplate([
            { 
                label: 'Quit', 
                click: () => {
                    ElectronApp.quit();
                }
            }
        ]);
        
        // Handle left click for popup window
        this.tray.on('click', (event, bounds) => {
            const contextMenu = Menu.buildFromTemplate([]);
            this.tray?.popUpContextMenu(contextMenu);
            if (this.popupWindow && this.popupWindow.isVisible()) {
                this.popupWindow.hide();
            } else {
                this.showPopupWindow();
            }
        });

        // Handle right click for menu
        this.tray.on('right-click', () => {
            const contextMenu = Menu.buildFromTemplate([
                { 
                    label: 'Quit', 
                    click: () => ElectronApp.quit() 
                }
            ]);
            this.tray?.popUpContextMenu(contextMenu);
        });

        // Hide window when clicking outside
        if (this.popupWindow) {
            this.popupWindow.on('blur', () => {
                this.popupWindow?.hide();
            });
        }
    }

    private createPopupWindow() {
        const preloadPath = ElectronApp.isPackaged
            ? path.join(__dirname, '../preload/index.js')
            : path.join(__dirname, '../../dist/preload/index.js');

        this.popupWindow = new BrowserWindow({
            width: 700,
            height: 825,
            show: false,
            frame: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false,
                preload: preloadPath
            }
        });

        if (process.env.NODE_ENV === 'development') {
            this.popupWindow.loadURL('http://localhost:5173');
            this.popupWindow.webContents.openDevTools();
        } else {
            this.popupWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
        }

        this.popupWindow.on('blur', () => {
            this.popupWindow?.hide();
        });
    }

    private setupIPCListeners() {
        ipcMain.on(IPC_CHANNELS.SET_PURCHASE_LIMIT, (_event, boltType: BoltType) => {
            this.setPurchaseLimit(boltType);
        });

        ipcMain.on(IPC_CHANNELS.CLEAR_PURCHASE_LIMIT, (_event, boltType: BoltType) => {
            this.clearPurchaseLimit(boltType);
        });
    }

    private setPurchaseLimit(boltType: BoltType) {
        this.purchaseLimits[boltType] = {
            limitReached: true,
            resetTime: Date.now() + INTERVALS.LIMIT
        };
        this.savePurchaseLimits();
        this.updatePopupWindow();
    }

    private clearPurchaseLimit(boltType: BoltType) {
        this.purchaseLimits[boltType] = {
            limitReached: false,
            resetTime: null
        };
        this.savePurchaseLimits();
        this.updatePopupWindow();
    }

    private async showPopupWindow() {
        if (!this.popupWindow) {
            this.createPopupWindow();
        }

        const trayBounds = this.tray?.getBounds();
        const windowBounds = this.popupWindow?.getBounds();

        if (trayBounds && windowBounds && this.popupWindow) {
            const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
            const y = Math.round(trayBounds.y + trayBounds.height);

            this.popupWindow.setPosition(x, y);
            this.popupWindow.show();
            await this.updatePopupWindow();
        }
    }

    private async updatePopupWindow() {
        if (!this.popupWindow) {
            await this.createPopupWindow();
            // this.popupWindow?.hide();
        }

        try {
            this.popupWindow?.webContents.send('updating-prices');

            const [rubyProfit, diamondProfit] = await Promise.all([
                this.rubyBoltMonitor.calculateCurrentProfit(),
                this.diamondBoltMonitor.calculateCurrentProfit()
            ]);

            // Add limit information to profit data
            if (rubyProfit) {
                rubyProfit.limitReached = this.purchaseLimits.ruby.limitReached;
                rubyProfit.resetTime = this.purchaseLimits.ruby.resetTime;
            }

            if (diamondProfit) {
                diamondProfit.limitReached = this.purchaseLimits.diamond.limitReached;
                diamondProfit.resetTime = this.purchaseLimits.diamond.resetTime;
            }

            this.popupWindow?.webContents.send('update-profits', {
                rubyProfit,
                diamondProfit,
                lastUpdateTime: Date.now()
            });

            this.updateTrayIcon(rubyProfit, diamondProfit);
        } catch (error: any) {
            this.logger.error('Error updating popup window:', error);
            if (this.popupWindow && !this.popupWindow.isDestroyed()) {
                this.popupWindow.webContents.send('error', error.message);
            }
        }
    }

    private startPriceChecking() {
        this.updatePopupWindow();
        setInterval(() => this.updatePopupWindow(), INTERVALS.CHECK);
    }

    private updateTrayIcon(rubyProfit: EnhancedProfitData | null, diamondProfit: EnhancedProfitData | null) {
        // Use median profit for icon selection
        const rubyProfitPerItem = rubyProfit?.medianProfit.profitPerItem ?? 0;
        const diamondProfitPerItem = diamondProfit?.medianProfit.profitPerItem ?? 0;
        const maxProfit = Math.max(this.purchaseLimits.ruby.limitReached ? 0 : rubyProfitPerItem, this.purchaseLimits.diamond.limitReached ? 0 : diamondProfitPerItem);

        let icon = ICONS.DEFAULT;
        if (maxProfit >= 75) {
            icon = ICONS.PROFITHIGH;
        } else if (maxProfit >= 25) {
            icon = ICONS.PROFITMEDIUM;
        } else if (maxProfit > 0) {
            icon = ICONS.PROFITLOW;
        } else {
            icon = ICONS.LOSS;
        }

        if (this.tray) {
            this.tray.setImage(path.join(__dirname, '../../assets', icon));
        }
    }
}

async function initializeMonitors() {
    const rubyMonitor = new EnchantingMonitor(BOLT_CONFIGS.ruby, logger);
    const diamondMonitor = new EnchantingMonitor(BOLT_CONFIGS.diamond, logger);
    
    await Promise.all([
        rubyMonitor.initialize(),
        diamondMonitor.initialize()
    ]);
    
    return { rubyMonitor, diamondMonitor };
}

// Start the app
const app = new MenuBarApp();
app.start().catch(error => {
    console.error('Failed to start app:', error);
}); 