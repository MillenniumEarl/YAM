"use strict";

/**
 * This class represents a thread of a game on the F95Zone platform.
 */
class ThreadInfo {
    constructor() {
        /**
         * Unique ID of the game in the platform
         * @type Number
         */
        this.id = -1;
        /**
         * Name of the game on the thread
         * @type String
         */
        this.name = "";
        /**
         * Author of the game on the thread
         * @type String
         */
        this.author = "";
        /**
         * URL of the thread on the platform
         * @type String
         */
        this.url = "";
        /**
         * Tags of the game
         * @type String[]
         */
        this.tags = [];
        /**
         * URL to the preview of the game
         * @type String
         */
        this.previewSrc = "";
        /**
         * Version of the game
         * @type String
         */
        this.version = "";
        /**
         * Date of last update of the game
         * @type Date
         */
        this.lastUpdate = null;
        /**
         * Indicates if an update is available.
         * @type Boolean
         */
        this.updateAvailable = false;
        /**
         * Indicate if the user has marked this thread as read
         * @type Boolean
         */
        this.markedAsRead = false;
    }

    //#region Public methods
    /**
     * @public
     * Extract information from a GameInfo object.
     * @param {GameInfo} gameinfo 
     */
    fromGameInfo(gameinfo) {
        this.id = gameinfo.id;
        this.name = gameinfo.name;
        this.author = gameinfo.author;
        this.url = gameinfo.url;
        this.tags = gameinfo.tags;
        this.previewSrc = gameinfo.previewSrc;
        this.version = gameinfo.version;
        this.lastUpdate = gameinfo.lastUpdate;
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
            tags: this.tags,
            previewSrc: this.previewSrc,
            version: this.version,
            lastUpdate: this.lastUpdate,
            updateAvailable: this.updateAvailable,
            markedAsRead: this.markedAsRead,
        };
    }

    /**
     * @private
     * Return a new GameInfo from a JSON string.
     * @param {String} json JSON string used to create the new object
     * @returns {ThreadInfo}
     */
    _fromJSON(json) {
        // Convert string
        const temp = Object.assign(new ThreadInfo(), JSON.parse(json));

        // JSON cannot transform a string to a date implicitly
        temp.lastUpdate = new Date(temp.lastUpdate);
        return temp;
    }
    //#endregion Private methods
}

module.exports = ThreadInfo;