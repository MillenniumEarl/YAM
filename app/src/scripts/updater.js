"use strict";

// Public modules from npm
const { autoUpdater } = require("electron-updater");
const logger = require("electron-log");

/**
 * @public
 * Check for available updates. Automatically download the latest release (not work on Linux).
 * @param {Object} callbacks 
 * @param {Function} [callbacks.onUpdateDownloaded] 
 * Callback executed when a new release is downloaded to disk.
 * Takes a single parameter: `info`.
 * @param {Function} [callbacks.onUpdateAvailable] 
 * Callback executed when a new release is available.
 * @param {Function} [callbacks.onUpdateNotAvailable] 
 * Callback executed when there is not anew version.
 * @param {Function} [callbacks.onError] 
 * Callback executed after an error. Take a error as single parameter.
 */
module.exports.check = function (callbacks) {
    // Set logger
    autoUpdater.logger = logger;
    autoUpdater.logger.transports.file.level = "info";

    // Set listeners
    autoUpdater.on("error", err => {
        if (callbacks.onError) callbacks.onError(err);
    });
    autoUpdater.on("update-available", () => {
        if (callbacks.onUpdateAvailable) callbacks.onUpdateAvailable();
    });
    autoUpdater.on("update-not-available", () => {
        if (callbacks.onUpdateNotAvailable) callbacks.onUpdateNotAvailable();
    });
    autoUpdater.on("update-downloaded", (info) => {
        if (callbacks.onUpdateDownloaded) callbacks.onUpdateDownloaded(info);
    });

    // Check updates
    autoUpdater.checkForUpdates();
};
