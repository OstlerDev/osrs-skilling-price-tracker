const { app, Menu, Tray, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const notifier = require('node-notifier');
const Logger = require('./Logger');
const PriceHistoryManager = require('./PriceHistoryManager');
const EnchantingMonitor = require('./EnchantingMonitor');
const fs = require('fs');

class MenuBarApp {
    constructor() {
        // Hide dock icon
        if (process.platform === 'darwin') {
            app.dock.hide();
        }
        
        this.logger = new Logger({ debug: process.env.NODE_ENV === 'development' });
        this.priceHistory = new PriceHistoryManager(this.logger);
        this.rubyBoltMonitor = new EnchantingMonitor({
            baseItemId: 21967,  // Ruby Dragon Bolts
            enchantedItemId: 21944,  // Ruby Dragon Bolts (e)
            batchSize: 11000,
            targetMargin: 75,
            runes: [
                { id: 564, price: 130, quantity: 1100 },  // Cosmic Runes
                { id: 565, price: 240, quantity: 1100 }   // Blood Runes
            ]
        }, this.priceHistory);
        this.diamondBoltMonitor = new EnchantingMonitor({
            baseItemId: 21969,  // Diamond Dragon Bolts
            enchantedItemId: 21946,  // Diamond Dragon Bolts (e)
            batchSize: 11000,
            targetMargin: 75,
            runes: [
                { id: 564, price: 130, quantity: 1100 },  // Cosmic Runes
                { id: 563, price: 128, quantity: 2200 }   // Law Runes
            ]
        }, this.priceHistory);
        
        this.popupWindow = null;
        this.tray = null;
        this.checkInterval = 60000; // Check every 1 minute
        this.lastNotificationTime = 0;
        this.NOTIFICATION_COOLDOWN = 300000; // 5 minutes
        
        this.limitStorePath = path.join(app.getPath('userData'), 'limits.json');
        this.purchaseLimits = this.loadLimits() || {
            ruby: {
                limitReached: false,
                resetTime: null
            },
            diamond: {
                limitReached: false,
                resetTime: null
            }
        };
        
        // Restore timers for existing limits
        for (const [boltType, limit] of Object.entries(this.purchaseLimits)) {
            if (limit.limitReached && limit.resetTime) {
                const remaining = limit.resetTime - Date.now();
                if (remaining > 0) {
                    setTimeout(() => {
                        this.clearPurchaseLimit(boltType);
                    }, remaining);
                } else {
                    this.clearPurchaseLimit(boltType);
                }
            }
        }
        
        // 4 hours in milliseconds
        this.LIMIT_COOLDOWN = 4 * 60 * 60 * 1000;

        // Set up IPC listeners
        ipcMain.on('set-purchase-limit', (event, boltType) => {
            this.setPurchaseLimit(boltType);
        });
        
        ipcMain.on('clear-purchase-limit', (event, boltType) => {
            this.clearPurchaseLimit(boltType);
        });
    }

    async start() {
        try {
            await app.whenReady();
            await this.initializeTray();
            await this.rubyBoltMonitor.initialize();
            await this.diamondBoltMonitor.initialize();
            
            // Do initial check
            await this.checkProfitability();
            
            // Start periodic checks
            setInterval(() => this.checkProfitability(), this.checkInterval);
            
            this.logger.info('Monitoring started');
        } catch (error) {
            this.logger.error('Failed to start application', error);
            app.quit();
        }
    }

    async initializeTray() {
        const trayIcon = path.join(__dirname, '..', 'assets', 'icon-default.png');
        this.tray = new Tray(trayIcon);
        
        if (process.platform === 'darwin') {
            this.tray.setIgnoreDoubleClickEvents(true);
        }
        
        this.tray.setToolTip('OSRS Bolt Monitor');
        this.updateTray('default');

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
                height: 346,
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
        this.updatePopupWindow();
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
                    name: String(this.getRuneName(rune.id))
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
                    name: String(this.getRuneName(rune.id))
                })),
                limitReached: this.purchaseLimits.diamond.limitReached,
                resetTime: this.purchaseLimits.diamond.resetTime
            } : null;

            // Log the data before sending
            this.logger.debug('Sending data to popup:', { rubyData, diamondData });

            // Send the data
            this.popupWindow.webContents.send('update-profits', {
                rubyProfit: rubyData,
                diamondProfit: diamondData
            });
        } catch (error) {
            this.logger.error('Error updating popup window:', error);
        }
    }

    getRuneName(runeId) {
        const runeNames = {
            564: 'Cosmic Rune',
            565: 'Blood Rune',
            563: 'Law Rune'
        };
        return runeNames[runeId] || 'Unknown Rune';
    }

    async checkProfitability() {
        try {
            const rubyProfit = await this.rubyBoltMonitor.calculateCurrentProfit();
            const diamondProfit = await this.diamondBoltMonitor.calculateCurrentProfit();

            // Store the last profit values
            this.rubyBoltMonitor.lastProfit = rubyProfit;
            this.diamondBoltMonitor.lastProfit = diamondProfit;

            // Check if both limits are reached
            const bothLimitsReached = this.purchaseLimits.ruby.limitReached && 
                                    this.purchaseLimits.diamond.limitReached;

            if (bothLimitsReached) {
                this.updateTray('limit');
            } else {
                // Check profitability for non-limited bolts
                const rubyAvailable = !this.purchaseLimits.ruby.limitReached;
                const diamondAvailable = !this.purchaseLimits.diamond.limitReached;
                
                const rubyProfitable = rubyAvailable && rubyProfit.profitPerItem >= this.rubyBoltMonitor.config.targetMargin;
                const diamondProfitable = diamondAvailable && diamondProfit.profitPerItem >= this.rubyBoltMonitor.config.targetMargin;
                
                const rubyNeutral = rubyAvailable && rubyProfit.profitPerItem > 0;
                const diamondNeutral = diamondAvailable && diamondProfit.profitPerItem > 0;
                
                const rubyLoss = rubyAvailable && rubyProfit.profitPerItem <= 0;
                const diamondLoss = diamondAvailable && diamondProfit.profitPerItem <= 0;

                // Apply priority rules
                if (rubyProfitable || diamondProfitable) {
                    this.updateTray('profitable');
                    this.sendProfitNotification(rubyProfit, diamondProfit);
                } else if (rubyNeutral || diamondNeutral) {
                    this.updateTray('default'); // neutral state
                } else if (rubyLoss || diamondLoss) {
                    this.updateTray('loss');
                }
            }

            // Update the popup window if it's visible
            await this.updatePopupWindow();
        } catch (error) {
            this.logger.error('Error checking profitability:', error);
            this.updateTray('error');
        }
    }

    updateTray(iconStatus) {
        const iconName = `icon-${iconStatus}.png`;
        this.tray.setImage(path.join(__dirname, '..', 'assets', iconName));
    }

    sendProfitNotification(rubyProfit, diamondProfit) {
        const now = Date.now();
        if (now - this.lastNotificationTime >= this.NOTIFICATION_COOLDOWN) {
            let message = '';
            if (rubyProfit && rubyProfit.profitPerItem >= this.rubyBoltMonitor.config.targetMargin) {
                message += `Ruby Bolts: ${rubyProfit.profit.toLocaleString()} GP (${rubyProfit.profitPerItem.toLocaleString()} GP/bolt)\n`;
            }
            if (diamondProfit && diamondProfit.profitPerItem >= this.diamondBoltMonitor.config.targetMargin) {
                message += `Diamond Bolts: ${diamondProfit.profit.toLocaleString()} GP (${diamondProfit.profitPerItem.toLocaleString()} GP/bolt)`;
            }

            if (message) {
                notifier.notify({
                    title: 'Profitable Bolt Enchanting Opportunity!',
                    message: message,
                    icon: path.join(__dirname, '..', 'assets', 'icon-notification.png'),
                    sound: true,
                    wait: true
                });
            }
            this.lastNotificationTime = now;
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
        this.purchaseLimits[boltType].resetTime = Date.now() + this.LIMIT_COOLDOWN;
        
        // Save limits
        this.saveLimits();
        
        // Schedule automatic reset
        setTimeout(() => {
            this.clearPurchaseLimit(boltType);
        }, this.LIMIT_COOLDOWN);
        
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
}

// Prevent multiple instances
const menuBarApp = new MenuBarApp();
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    menuBarApp.start();
}

// Remove or modify the window-all-closed event handler since we want the app to stay running
app.removeAllListeners('window-all-closed');
app.on('window-all-closed', () => {
    // Do nothing - this keeps the app running when all windows are closed
});

// Cleanup on quit
app.on('before-quit', () => {
    if (menuBarApp) {
        menuBarApp.priceHistory.close();
    }
}); 