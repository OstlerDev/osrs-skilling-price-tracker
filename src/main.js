const { app, Menu, Tray, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const notifier = require('node-notifier');
const Logger = require('./Logger');
const PriceHistoryManager = require('./PriceHistoryManager');
const EnchantingMonitor = require('./EnchantingMonitor');
const fs = require('fs');

// Constants
const ICONS = {
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
};

const RUNE_NAMES = {
    564: 'Cosmic Rune',
    565: 'Blood Rune',
    563: 'Law Rune'
};

const BOLT_CONFIGS = {
    ruby: {
        baseItemId: 21967,      // Ruby Dragon Bolts
        enchantedItemId: 21944, // Ruby Dragon Bolts (e)
        batchSize: 11000,
        targetMargin: 75,
        runes: [
            { id: 564, price: 130, quantity: 1100 },  // Cosmic Runes
            { id: 565, price: 240, quantity: 1100 }   // Blood Runes
        ]
    },
    diamond: {
        baseItemId: 21969,      // Diamond Dragon Bolts
        enchantedItemId: 21946, // Diamond Dragon Bolts (e)
        batchSize: 11000,
        targetMargin: 75,
        runes: [
            { id: 564, price: 130, quantity: 1100 },  // Cosmic Runes
            { id: 563, price: 128, quantity: 2200 }   // Law Runes
        ]
    }
};

/**
 * Manages the menu bar application for OSRS Bolt Monitor
 */
class MenuBarApp {
    constructor() {
        this.initializeApp();
        this.initializeMonitors();
        this.initializeLimits();
        this.setupIPCListeners();
    }

    /**
     * Initialize core application settings
     */
    initializeApp() {
        if (process.platform === 'darwin') {
            app.dock.hide();
        }
        
        this.logger = new Logger({ debug: process.env.NODE_ENV === 'development' });
        this.priceHistory = new PriceHistoryManager(this.logger);
        
        this.popupWindow = null;
        this.tray = null;
        this.lastNotificationTime = 0;
        this.lastUpdateTime = 0;
    }

    /**
     * Initialize price monitors for different bolt types
     */
    async initializeMonitors() {
        this.rubyBoltMonitor = new EnchantingMonitor(BOLT_CONFIGS.ruby, this.priceHistory);
        this.diamondBoltMonitor = new EnchantingMonitor(BOLT_CONFIGS.diamond, this.priceHistory);
        await Promise.all([
            this.rubyBoltMonitor.initialize(),
            this.diamondBoltMonitor.initialize()
        ]);
    }

    /**
     * Initialize purchase limit tracking
     */
    initializeLimits() {
        this.limitStorePath = path.join(app.getPath('userData'), 'limits.json');
        this.purchaseLimits = this.loadLimits() || {
            ruby: { limitReached: false, resetTime: null },
            diamond: { limitReached: false, resetTime: null }
        };
        
        this.restoreLimitTimers();
    }

    /**
     * Restore limit timers from saved state
     */
    restoreLimitTimers() {
        for (const [boltType, limit] of Object.entries(this.purchaseLimits)) {
            if (limit.limitReached && limit.resetTime) {
                const remaining = limit.resetTime - Date.now();
                if (remaining > 0) {
                    setTimeout(() => this.clearPurchaseLimit(boltType), remaining);
                } else {
                    this.clearPurchaseLimit(boltType);
                }
            }
        }
    }

    /**
     * Set up IPC listeners for renderer communication
     */
    setupIPCListeners() {
        ipcMain.on('set-purchase-limit', (event, boltType) => {
            this.setPurchaseLimit(boltType);
        });
        
        ipcMain.on('clear-purchase-limit', (event, boltType) => {
            this.clearPurchaseLimit(boltType);
        });
    }

    /**
     * Start the application
     */
    async start() {
        try {
            await this.initializeTray();
            this.startPriceChecking();
            this.logger.info('Application started successfully');
        } catch (error) {
            this.logger.error('Failed to start application:', error);
            throw error;
        }
    }

    /**
     * Start periodic price checking
     */
    startPriceChecking() {
        this.checkProfitability().catch(error => 
            this.logger.error('Initial profitability check failed:', error)
        );

        // Set up periodic checking
        setInterval(() => {
            this.checkProfitability().catch(error => 
                this.logger.error('Periodic profitability check failed:', error)
            );
        }, INTERVALS.CHECK);
    }

    async initializeTray() {
        const trayIcon = path.join(__dirname, '..', 'assets', ICONS.DEFAULT);
        this.tray = new Tray(trayIcon);
        
        if (process.platform === 'darwin') {
            this.tray.setIgnoreDoubleClickEvents(true);
        }
        
        this.tray.setToolTip('OSRS Bolt Monitor');
        this.updateTray(ICONS.DEFAULT);

        // Handle left click for popup window
        this.tray.on('click', (event, bounds) => {
            const contextMenu = Menu.buildFromTemplate([]);
            this.tray.popUpContextMenu(contextMenu);
            if (this.popupWindow && this.popupWindow.isVisible()) {
                this.popupWindow.hide();
            } else {
                this.showPopupWindow(bounds);
            }
        });

        // Handle right click for menu
        this.tray.on('right-click', () => {
            const contextMenu = Menu.buildFromTemplate([
                { 
                    label: 'Quit', 
                    click: () => app.quit() 
                }
            ]);
            this.tray.popUpContextMenu(contextMenu);
        });

        // Hide window when clicking outside
        if (this.popupWindow) {
            this.popupWindow.on('blur', () => {
                this.popupWindow.hide();
            });
        }
    }

    showPopupWindow(bounds) {
        if (!this.popupWindow) {
            this.popupWindow = new BrowserWindow({
                width: 635,
                height: 360,
                show: false,
                frame: false,
                fullscreenable: false,
                resizable: false,
                transparent: true,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false
                }
            });

            this.popupWindow.loadFile(path.join(__dirname, 'popup.html'));
        }

        // Position window next to tray icon
        if (process.platform === 'darwin') {
            const x = Math.round(bounds.x - this.popupWindow.getBounds().width / 2 + bounds.width / 2);
            const y = Math.round(bounds.y + bounds.height);
            this.popupWindow.setPosition(x, y);
        }

        this.popupWindow.show();
        this.checkProfitability();
    }

    async updatePopupWindow() {
        if (!this.popupWindow || !this.popupWindow.isVisible()) {
            return;
        }

        try {
            const baseRubyPricing = await this.rubyBoltMonitor.trackers.baseItem.getLatestPrice();
            const enchantedRubyPricing = await this.rubyBoltMonitor.trackers.enchantedItem.getLatestPrice();

            const rubyData = this.rubyBoltMonitor?.lastProfit ? {
                profit: Number(this.rubyBoltMonitor.lastProfit.profit || 0),
                profitPerItem: Number(this.rubyBoltMonitor.lastProfit.profitPerItem || 0),
                baseBoltPrice: Number(baseRubyPricing.avgHighPrice || 0),
                enchantedBoltPrice: Number(enchantedRubyPricing.avgLowPrice || 0),
                latestBuyPrice: Number(baseRubyPricing.highPrice || 0),
                latestSellPrice: Number(enchantedRubyPricing.lowPrice || 0),
                runes: this.rubyBoltMonitor.config.runes.map(rune => ({
                    quantity: Number(rune.quantity || 0),
                    price: Number(rune.price || 0),
                    name: RUNE_NAMES[rune.id] || 'Unknown Rune'
                })),
                limitReached: this.purchaseLimits.ruby.limitReached,
                resetTime: this.purchaseLimits.ruby.resetTime
            } : null;

            const baseDiamondPricing = await this.diamondBoltMonitor.trackers.baseItem.getLatestPrice();
            const enchantedDiamondPricing = await this.diamondBoltMonitor.trackers.enchantedItem.getLatestPrice();
            const diamondData = this.diamondBoltMonitor?.lastProfit ? {
                profit: Number(this.diamondBoltMonitor.lastProfit.profit || 0),
                profitPerItem: Number(this.diamondBoltMonitor.lastProfit.profitPerItem || 0),
                baseBoltPrice: Number(baseDiamondPricing.avgHighPrice || 0),
                enchantedBoltPrice: Number(enchantedDiamondPricing.avgLowPrice || 0),
                latestBuyPrice: Number(baseDiamondPricing.highPrice || 0),
                latestSellPrice: Number(enchantedDiamondPricing.lowPrice || 0),
                runes: this.diamondBoltMonitor.config.runes.map(rune => ({
                    quantity: Number(rune.quantity || 0),
                    price: Number(rune.price || 0),
                    name: RUNE_NAMES[rune.id] || 'Unknown Rune'
                })),
                limitReached: this.purchaseLimits.diamond.limitReached,
                resetTime: this.purchaseLimits.diamond.resetTime
            } : null;

            // Log the data before sending
            this.logger.debug('Sending data to popup:', { rubyData, diamondData });

            // Send the data
            this.popupWindow.webContents.send('update-profits', {
                rubyProfit: rubyData,
                diamondProfit: diamondData,
                lastUpdateTime: this.diamondBoltMonitor.trackers.baseItem.lastUpdated
            });
        } catch (error) {
            this.logger.error('Error updating popup window:', error);
        }
    }

    async checkProfitability() {
        try {
            // Signal that we're starting an update
            if (this.popupWindow && !this.popupWindow.isDestroyed()) {
                this.popupWindow.webContents.send('updating-prices');
            }

            const rubyProfit = await this.rubyBoltMonitor.calculateCurrentProfit();
            const diamondProfit = await this.diamondBoltMonitor.calculateCurrentProfit();

            // Store the last profit values and update time
            this.rubyBoltMonitor.lastProfit = rubyProfit;
            this.diamondBoltMonitor.lastProfit = diamondProfit;
            this.lastUpdateTime = Date.now();

            // Check if both limits are reached
            const bothLimitsReached = this.purchaseLimits.ruby.limitReached && 
                                    this.purchaseLimits.diamond.limitReached;

            if (bothLimitsReached) {
                this.updateTray(ICONS.LIMIT);
            } else {
                // Check profitability for non-limited bolts
                const rubyAvailable = !this.purchaseLimits.ruby.limitReached;
                const diamondAvailable = !this.purchaseLimits.diamond.limitReached;
                
                const rubyProfitable = rubyAvailable && rubyProfit.profitPerItem >= BOLT_CONFIGS.ruby.targetMargin;
                const diamondProfitable = diamondAvailable && diamondProfit.profitPerItem >= BOLT_CONFIGS.diamond.targetMargin;
                
                const rubyNeutral = rubyAvailable && rubyProfit.profitPerItem > 0;
                const diamondNeutral = diamondAvailable && diamondProfit.profitPerItem > 0;
                
                const rubyLoss = rubyAvailable && rubyProfit.profitPerItem <= 0;
                const diamondLoss = diamondAvailable && diamondProfit.profitPerItem <= 0;

                // Apply priority rules
                if (rubyProfitable || diamondProfitable) {
                    this.sendProfitNotification(rubyProfit, diamondProfit);

                    const bestProfit = Math.max(rubyProfit.profit, diamondProfit.profit);
                    if (bestProfit > 1500000) {
                        this.updateTray(ICONS.PROFITHIGH);
                    } else if (bestProfit > 750000) {
                        this.updateTray(ICONS.PROFITMEDIUM);
                    } else if (bestProfit > 200000) {
                        this.updateTray(ICONS.PROFITLOW);
                    } else {
                        this.updateTray(ICONS.DEFAULT);
                    }
                } else if (rubyNeutral || diamondNeutral) {
                    this.updateTray(ICONS.DEFAULT); // neutral state
                } else if (rubyLoss || diamondLoss) {
                    this.updateTray(ICONS.LOSS);
                }
            }

            // Update the popup window if it's visible
            await this.updatePopupWindow();
        } catch (error) {
            this.logger.error('Error checking profitability:', error);
            this.handlePriceError(error, 'profitability-check');
        }
    }

    /**
     * Updates the tray icon and tooltip based on status
     */
    updateTray(iconStatus) {
        try {
            const iconName = iconStatus || ICONS.DEFAULT;
            const iconPath = path.join(__dirname, '..', 'assets', iconName);
            
            if (!fs.existsSync(iconPath)) {
                this.logger.error(`Icon not found: ${iconPath}`);
                this.tray.setImage(path.join(__dirname, '..', 'assets', ICONS.DEFAULT));
                return;
            }

            this.tray.setImage(iconPath);
            
            // Update tooltip based on status
            let tooltips = {}
            tooltips[ICONS.PROFITHIGH] = '(>1.5m) Profitable enchanting opportunity!',
            tooltips[ICONS.PROFITMEDIUM] = '(>750k) Profitable enchanting opportunity!',
            tooltips[ICONS.PROFITLOW] = '(>200k) Profitable enchanting opportunity!',
            tooltips[ICONS.LOSS] = 'Current prices show a loss',
            tooltips[ICONS.LIMIT] = 'Purchase limits reached',
            tooltips[ICONS.DEFAULT] = 'OSRS Bolt Monitor'

            this.tray.setToolTip(tooltips[iconStatus] || tooltips.default);
        } catch (error) {
            this.logger.error('Failed to update tray:', error);
            // Attempt to set default icon as fallback
            try {
                this.tray.setImage(path.join(__dirname, '..', 'assets', ICONS.DEFAULT));
            } catch (fallbackError) {
                this.logger.error('Failed to set fallback icon:', fallbackError);
            }
        }
    }

    /**
     * Sends a notification if enough time has passed since the last one
     * @param {Object} rubyProfit Ruby bolt profit data
     * @param {Object} diamondProfit Diamond bolt profit data
     */
    sendProfitNotification(rubyProfit, diamondProfit) {
        try {
            const now = Date.now();
            if (now - this.lastNotificationTime < INTERVALS.NOTIFICATION) {
                return; // Skip if notification cooldown hasn't elapsed
            }

            const profitableItems = [];
            if (rubyProfit?.profitPerItem >= this.rubyBoltMonitor.config.targetMargin) {
                profitableItems.push(`Ruby (${rubyProfit.profitPerItem.toLocaleString()}gp/bolt)`);
            }
            if (diamondProfit?.profitPerItem >= this.diamondBoltMonitor.config.targetMargin) {
                profitableItems.push(`Diamond (${diamondProfit.profitPerItem.toLocaleString()}gp/bolt)`);
            }

            if (profitableItems.length === 0) return;

            notifier.notify({
                title: 'Profitable Enchanting Opportunity',
                message: `Profitable bolts: ${profitableItems.join(', ')}`,
                icon: path.join(__dirname, '..', 'assets', ICONS.NOTIFICATION),
                sound: true,
                wait: true
            });

            this.lastNotificationTime = now;
        } catch (error) {
            this.logger.error('Failed to send notification:', error);
        }
    }

    loadLimits() {
        try {
            if (fs.existsSync(this.limitStorePath)) {
                const data = fs.readFileSync(this.limitStorePath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            this.logger.error('Error loading limits:', error);
        }
        return null;
    }

    saveLimits() {
        try {
            fs.writeFileSync(this.limitStorePath, JSON.stringify(this.purchaseLimits));
        } catch (error) {
            this.logger.error('Error saving limits:', error);
        }
    }

    setPurchaseLimit(boltType) {
        this.purchaseLimits[boltType].limitReached = true;
        this.purchaseLimits[boltType].resetTime = Date.now() + INTERVALS.LIMIT;
        
        // Save limits
        this.saveLimits();
        
        // Schedule automatic reset
        setTimeout(() => {
            this.clearPurchaseLimit(boltType);
        }, INTERVALS.LIMIT);
        
        // Immediately update icon and UI
        this.checkProfitability();
    }

    clearPurchaseLimit(boltType) {
        this.purchaseLimits[boltType].limitReached = false;
        this.purchaseLimits[boltType].resetTime = null;
        
        // Save limits
        this.saveLimits();
        
        // Update UI and icon
        this.checkProfitability();
    }

    /**
     * Cleans up resources before app quit
     */
    cleanup() {
        try {
            if (this.popupWindow) {
                this.popupWindow.destroy();
            }
            if (this.priceHistory) {
                this.priceHistory.close();
            }
            // Clear any existing intervals
            clearInterval(this.priceCheckInterval);
        } catch (error) {
            this.logger.error('Error during cleanup:', error);
        }
    }

    /**
     * Handles errors that occur during price updates
     * @param {Error} error The error that occurred
     * @param {string} source The source of the error
     */
    handlePriceError(error, source) {
        this.logger.error(`Price update error (${source}):`, error);
        this.updateTray('default');
        
        if (this.popupWindow && !this.popupWindow.isDestroyed()) {
            this.popupWindow.webContents.send('price-error', {
                message: `Failed to update prices: ${error.message}`,
                source
            });
        }
    }
}

// Prevent multiple instances
const menuBarApp = new MenuBarApp();
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.whenReady().then(() => {
        menuBarApp.start().catch(error => {
            console.error('Failed to start application:', error);
            app.quit();
        });
    });
}

// Remove or modify the window-all-closed event handler since we want the app to stay running
app.removeAllListeners('window-all-closed');
app.on('window-all-closed', () => {
    // Do nothing - this keeps the app running when all windows are closed
});

// Set up app lifecycle handlers
app.on('before-quit', () => {
    if (menuBarApp) {
        menuBarApp.cleanup();
    }
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    app.quit();
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    app.quit();
}); 