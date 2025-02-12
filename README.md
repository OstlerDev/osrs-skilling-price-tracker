# OSRS Bolt Monitor

This is an Electron-based desktop application that monitors the Old School RuneScape (OSRS) Grand Exchange market to detect profitable bolt enchanting opportunities. 

## Features

1. Price Tracking:
   - Ruby Dragon Bolts & Ruby Dragon Bolts (e)
   - Diamond Dragon Bolts & Diamond Dragon Bolts (e)
   - Cosmic, Blood, and Law Runes with configurable fixed prices

2. Profit Calculations:
   - Real-time profit monitoring
   - Per-bolt profit calculations
   - Configurable target margins (currently 75gp)
   - Material cost tracking
   - Price stability monitoring

3. User Interface:
   - Clean, modern menu bar application
   - Color-coded status icon:
     - Green: Profitable opportunity available
     - Yellow: Neutral/low profit available
     - Red: Only loss-making opportunities
     - Gray: All bolt types at purchase limit
   - Side-by-side detailed popup interface showing:
     - Current profit/loss for each bolt type
     - Latest buy/sell prices
     - Base and enchanted bolt prices
     - Material costs breakdown
     - Visual profit indicators (green/yellow/red backgrounds)
   - Right-click menu for quick access to quit option

4. Grand Exchange Limit Tracking:
   - Purchase limit tracking (11,000 per 4 hours)
   - Individual timers for each bolt type
   - Real-time countdown display (hours, minutes, seconds)
   - Persistent limit tracking between app restarts
   - Manual limit setting and clearing
   - Visual indicators for limit-reached status

5. System Integration:
   - Native macOS menu bar integration
   - Desktop notifications for profitable opportunities
   - Notification cooldown system (5-minute intervals)
   - Runs in background with minimal resource usage
   - Persistent storage for settings and limits

6. Technical Features:
   - OSRS Wiki Real-time Prices API integration
   - SQLite price history database
   - Price normalization and averaging
   - Robust error handling
   - Modular architecture separating concerns
   - Configurable update intervals (currently 1 minute)

## Purpose

The application helps players identify profitable bolt enchanting opportunities by:
- Monitoring real-time market conditions
- Calculating precise profit margins
- Providing clear visual feedback
- Sending notifications for good opportunities
- Tracking price history for better decision making
- Managing Grand Exchange purchase limits

The interface is designed to be unobtrusive while providing quick access to all relevant information through a simple click on the menu bar icon.