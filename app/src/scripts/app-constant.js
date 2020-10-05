"use strict";

// Core modules
const fs = require('fs');
const path = require('path');

class AppCostant {
    constructor() {
        this.CACHE_DIR = 'cache';
        this.GAME_DATA_DIR = path.join(this.CACHE_DIR, 'gamedata');
        this.BROWSER_DATA_DIR = path.join(this.CACHE_DIR, 'browserdata');
        this.CREDENTIALS_PATH = path.join(this.CACHE_DIR, 'credentials.json');
    }

    init() {
        // Check if cache dir exists
        if (!fs.existsSync(this.CACHE_DIR)) {
            fs.mkdirSync(this.CACHE_DIR);
        }

        // Check if game cache dir exists
        if (!fs.existsSync(this.GAME_DATA_DIR)) {
            fs.mkdirSync(this.GAME_DATA_DIR);
        }

        // Check if browser cache dir exists
        if (!fs.existsSync(this.BROWSER_DATA_DIR)) {
            fs.mkdirSync(this.BROWSER_DATA_DIR);
        }
    }
}

// Export the class
module.exports = AppCostant;