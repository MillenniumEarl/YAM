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
    constructor() {
        super();
        
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
        /**
         * Number of time the game has been launched.
         * @type Number
         */
        this.gameSessions = 0;
    }

    //#region Public methods
    /**
     * @public
     * Search for a compatible game launcher for the current OS.
     * @returns {String} Launcher of the game or `null` if no file are found
     */
    getGameLauncher() {
        // Local variables
        let executablePath = null;

        // Get the extension matching the current OS
        const extensions = this._getExtensionsForPlatform();
        
        // Find the launcher
        let index = 0;
        do {
            // Obtains the files with the specific extension
            const files = glob.sync(`*.${extensions[index]}`, {
                cwd: this.gameDirectory
            });

            if (files.length !== 0) {
                executablePath = join(this.gameDirectory, files[0]);
            }

            index += 1;
        }
        while (index < extensions.length && !executablePath);
        return executablePath;
    }

    /**
     * @public
     * Get game save files if development engine is supported.
     * @returns {Promise<String[]>} Paths to game save files
     */
    async getSaves() {
        return await savesFinder.findSavesPath(this);
    }
    //#endregion Public methods

    //#region Private methods
    /**
     * @private
     * Obtains the valid file extensions for game for the 
     * current OS or a empty array if it's not supported.
     * @return {String[]}
     */
    _getExtensionsForPlatform() {
        // Local variables
        let returnValue = [];
        const extensions = {
            win32: ["exe", "html"],
            darwin: ["sh", "html"],
            linux: ["sh", "x86_64", "html"],
        };

        // Check if this is a valid OS
        const valid = Object.keys(extensions).includes(process.platform);
        if(valid) returnValue = extensions[process.platform];
        return returnValue;
    }

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
            gameSessions: this.gameSessions,
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