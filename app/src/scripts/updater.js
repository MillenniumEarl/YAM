"use strict";

// Public modules from npm
const electron = require("electron");

// Global variables
const APP_VERSION = electron.app.getVersion();
const AUTO_UPDATE_URL = `https://api.update.rocks/update/github.com/MillenniumEarl/YAM/stable/${process.platform}/${APP_VERSION}`;

/**
 * @public
 * Check for available updates. Automatically download the latest release (not work on Linux).
 * @param {Object} callbacks 
 * @param {Function} [callbacks.onUpdateDownloaded] 
 * Callback executed when a new release is downloaded to disk.
 * Takes three parameters: `event`, `releaseNotes`, `releaseName`.
 * `releaseNotes` not available on Linux.
 * @param {Function} [callbacks.onUpdateAvailable] 
 * Callback executed when a new release is available.
 * @param {Function} [callbacks.onUpdateNotAvailable] 
 * Callback executed when there is not anew version.
 * @param {Function} [callbacks.onError] 
 * Callback executed after an error. Take a error as single parameter.
 */
module.exports.check = function (callbacks) {
    // Set listeners
    electron.autoUpdater.on("error", err => {
        if (callbacks.onError) callbacks.onError(err);
    });
    electron.autoUpdater.on("update-available", () => {
        if (callbacks.onUpdateAvailable) callbacks.onUpdateAvailable();
    });
    electron.autoUpdater.on("update-not-available", () => {
        if (callbacks.onUpdateNotAvailable) callbacks.onUpdateNotAvailable();
    });
    electron.autoUpdater.on("update-downloaded", (event, releaseNotes, releaseName) => {
        if (callbacks.onUpdateDownloaded) callbacks.onUpdateDownloaded(event, releaseNotes, releaseName);
    });

    // Check updates
    electron.autoUpdater.setFeedURL(AUTO_UPDATE_URL);
    electron.autoUpdater.checkForUpdates();
};

