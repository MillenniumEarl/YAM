// Copyright (c) 2021 MillenniumEarl
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

"use strict";

// Public modules from npm
const F95API = require("@millenniumearl/f95api");
const logger = require("electron-log");
const { CaptchaHarvest } = require("@millenniumearl/recaptcha-harvester");

// Local modules
const GameInfoExtended = require("./classes/game-info-extended");

// Set F95API logger level
F95API.loggerLevel = "warn";

class F95Wrapper {
    userData = null;

    isLogged() {
        return F95API.isLogged();
    }

    login(username, password) { 
        return F95API.login(username, password, retrieveCaptchaToken); 
    }

    async getUserData() {
        if (!this.userData) {
            this.userData = new F95API.UserProfile();
            await this.userData.fetch(true);
        }
        return this.userData;
    }

    getGameData(name, searchMod) {
        const query = new F95API.HandiworkSearchQuery();
        query.keywords = name;
        query.category = searchMod ? "mods" : "games";
        return F95API.searchHandiwork(query);
    }

    getGameDataFromURL(url) {
        return F95API.getHandiworkFromURL(url);
    }

    async checkGameUpdates(data) {
        // Create a new object from the data
        const game = Object.assign(new F95API.Game(), data);

        // Check for updates
        return await F95API.checkIfHandiworkHasUpdate(game);
    }
}

async function retrieveCaptchaToken() {
    // Local variables
    const website = "https://f95zone.to";
    const sitekey = "6LcwQ5kUAAAAAAI-_CXQtlnhdMjmFDt-MruZ2gov";

    // Start the harvester
    logger.info("Starting CAPTCHA harvester...");
    const harvester = new CaptchaHarvest();
    await harvester.start("reCAPTCHAv2");
    logger.info("CAPTCHA harvester ready");

    // Fetch token
    try {
        logger.info("Fetching CAPTCHA token...");
        const token = await harvester.getCaptchaToken(website, sitekey);
        return token.token;
    } catch (e) {
        logger.error(`Error while retrieving CAPTCHA token:\n${e}`);
    } finally {
        // Stop harvester
        harvester.stop();
    }
}

module.exports = F95Wrapper;