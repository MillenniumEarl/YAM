"use strict";

// Core modules
const {
    join
} = require("path");

/**
 * Class containing variables shared between modules.
 */
class Shared {
    //#region Properties
    /**
     * Base directory where to save the application cache.
     * @type String
     */
    static _cacheDir = "cache";
    /**
     * Name of the directory to save the game cache.
     * @type String
     */
    static _gameDirName = "gamedata";
    /**
     * Name of the directory to save the browser cache.
     * @type String
     */
    static _browserDirName = "browserdata";
    /**
     * Name of the file to save the credentials for accessing the F95Zone portal.
     * @type String
     */
    static _credentialsName = "credentials.json";
    //#endregion Properties

    //#region Getters
    /**
     * Base directory where to save the application cache.
     * @returns {String}
     */
    static get cacheDir() {
        return this._cacheDir;
    }
    /**
     * Name of the directory to save the game cache.
     * @returns {String}
     */
    static get gameDataDir() {
        return join(this._cacheDir, this._gameDirName);
    }
    /**
     * Name of the directory to save the browser cache.
     * @returns {String}
     */
    static get browserDataDir() {
        return join(this._cacheDir, this._browserDirName);
    }
    /**
     * Name of the file to save the credentials for accessing the F95Zone portal.
     * @returns {String}
     */
    static get credentialsPath() {
        return join(this._cacheDir, this._credentialsName);
    }
    //#endregion Getters

    //#region Setters
    static set cacheDir(val) {
        this._cacheDir = val;
    }
    //#endregion Setters
}

module.exports = Shared;