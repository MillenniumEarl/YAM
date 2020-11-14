"use strict";

// Core modules
const {
    glob
} = require("glob");
const {
    join
} = require("path");

// Public module from npm
const { GameInfo } = require("f95api");

// Modules from file
const savesFinder = require("../save-files-finder.js");

/**
 * This class extends the properties of the F95Zone 
 * platform games with information that can be 
 * used by the application.
 */
class GameInfoExtended extends GameInfo {
    super() {
        /**
         * Univoke ID of the game in the database.
         */
        this.dbid = -1;
        /**
         * Directory containing game files.
         * @type String
         */
        this.gameDirectory = null;
        /**
         * Date of the last game session.
         * @type Date
         */
        this.lastPlayed = null;
        /**
         * Path to the game preview on the disk.
         * @type String
         */
        this.localPreviewPath = null;
        /**
         * Indicates if an update is available.
         * @type Boolean
         */
        this.updateAvailable = false;
    }

    //#region Public methods
    /**
     * @public
     * Search for a compatible game launcher for the current OS.
     * @returns {String} Launcher of the game or `null` if no file are found
     */
    getGameLauncher() {
        // Get the extension matching the current OS
        let extension = "";

        switch (process.platform) {
        case "win32":
            extension = "exe";
            break;
        case "darwin":
            extension = "sh";
            break;
        case "linux":
            extension = "py";
            break;
        default:
            // Unsupported platform
            return null;
        }

        // Find the launcher
        let files = glob.sync(`*.${extension}`, {
            cwd: this.gameDirectory
        });

        // Try with HTML if no file is found
        if (files.length === 0) files = glob.sync("*.html", {
            cwd: this.gameDirectory
        });

        // Return executable
        if (files.length === 0) return null;
        else return join(this.gameDirectory, files[0]);
    }

    /**
     * @public
     * Get game save files if development engine is supported.
     * @returns {Promise<String[]>} Paths to game save files
     */
    getSaves() {
        return savesFinder.findSavesPath(this);
    }
    //#endregion Public methods

    //#region Private methods
    /**
     * @private
     * Converts the object to a dictionary used for JSON serialization.
     * @returns {Object.<string,object>} Dictionary of properties
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            author: this.author,
            url: this.url,
            overview: this.overview,
            language: this.language,
            supportedOS: this.supportedOS,
            censored: this.censored,
            engine: this.engine,
            status: this.status,
            tags: this.tags,
            previewSrc: this.previewSrc,
            version: this.version,
            lastUpdate: this.lastUpdate,
            isMod: this.isMod,
            changelog: this.changelog,
            gameDirectory: this.gameDirectory,
            lastPlayed: this.lastPlayed,
            localPreviewPath: this.localPreviewPath,
        };
    }

    /**
     * @private
     * Return a new GameInfo from a JSON string.
     * @param {String} json JSON string used to create the new object
     * @returns {GameInfoExtended}
     */
    _fromJSON(json) {
        // Convert string
        const temp = Object.assign(new GameInfoExtended(), JSON.parse(json));

        // JSON cannot transform a string to a date implicitly
        temp.lastUpdate = new Date(temp.lastUpdate);
        temp.lastPlayed = new Date(temp.lastPlayed);
        return temp;
    }
    //#endregion Private methods
}

module.exports = GameInfoExtended;