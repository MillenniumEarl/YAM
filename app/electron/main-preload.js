// For more information about secure use of IPC see:
// https://github.com/reZach/secure-electron-template/blob/master/docs/newtoelectron.md

"use strict";

// Core modules
const fs = require("fs");
const {
    glob
} = require("glob");
const {
    join,
    basename,
    dirname
} = require("path");

// Public modules from npm
const {
    contextBridge,
    ipcRenderer
} = require("electron");
const F95API = require("f95api");
const download = require("image-downloader");
const logger = require("electron-log");

// Modules from file
const {
    deleteFolderRecursive,
    readFileSync,
    exists,
} = require("../src/scripts/io-operations.js");
const savesFinder = require("../src/scripts/save-files-finder.js");

// Array of valid main-to-render channels
const validReceiveChannels = ["window-closing", "auth-result"];

// Array of valid render-to-main channels
const validSendChannels = [
    "main-window-closing",
    "login-required",
    "exec",
    "message-dialog",
    "open-dialog",
    "save-dialog",
    "prompt-dialog",
    "cwd",
    "cache-dir",
    "games-data-dir",
    "savegames-data-dir",
    "credentials-path",
    "translate",
];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("API", {
    /**
     * Directory of the app.js file.
     */
    appDir: __dirname.replace("electron", ""),
    /**
     * OS platform of the current device.
     */
    platform: process.platform,
    /**
     * Send an asynchronous request via IPC and wait for a response.
     * @param {String} channel Communication channel
     * @param {Any[]} data Data to send to main process
     * @returns {Promise<Any>} Result from the main process
     */
    invoke: (channel, ...data) => {
        // Send a custom message
        if (validSendChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, data);
        }
    },
    /**
     * Send an asynchronous request via IPC.
     * @param {String} channel Communication channel
     * @param {Any[]} data Data to send to main process
     */
    send: (channel, ...data) => {
        // Send a custom message
        if (validSendChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    /**
     * Receive a message from main process via IPC and execute a method.
     * @param {String} channel Communication channel
     * @param {Function} func Method to execute when a message is received
     */
    receive: (channel, func) => {
        // Receive a custom message
        if (validReceiveChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    /**
     * Join multiple strings into a parsed path for the current OS.
     * @param {String[]} paths Partial paths to join
     * @return {String} Joined path
     */
    join: (...paths) => join(...paths),
    /**
     * Check if an Internet connection is available
     * @returns {Boolean}
     */
    isOnline: () => navigator.onLine,
    /**
     * Download an image given a url.
     * @param {String} url URL to download the image from
     * @param {String} dest Path where save the image
     * @returns {Promise<Any>}
     */
    downloadImage: function apiDownloadImage(url, dest) {
        return download.image({
            url: url,
            dest: dest
        });
    },
    /**
     * Obtain the name of the parent directory of a specified path.
     * @param {String} path
     * @returns {String}
     */
    getDirName: function apiGetDirName(path) {
        return basename(dirname(path));
    },
    /**
     * Provide access to logger methods.
     */
    log: logger.functions,
    /**
     * Translate a key into a message in the language specified by the user.
     * @param {String} key Unique key of the message
     * @param {Object} interpolation Dictionary containing the interpolation values
     * @returns {Promise<String>}
     */
    translate: async function apiTranslate(key, interpolation) {
        return ipcRenderer.invoke("translate", key, interpolation);
    },
    /**
     * Change the displayed language in the app.
     * @param {String} iso ISO 639-1 language
     */
    changeLanguage: async function apiChangeLanguage(iso) {
        return ipcRenderer.invoke("change-language", iso);
    },
    /**
     * Get the current app language ISO-code
     */
    currentLanguage: async function apiCurrentLanguage() {
        return ipcRenderer.invoke("current-language");
    },
});

// Expose the I/O operations
contextBridge.exposeInMainWorld("IO", {
    /**
     * Read data from a file synchronously.
     * @param {String} path
     * @returns {Any}
     */
    readSync: function ioReadSync(path) {
        return readFileSync(path);
    },
    /**
     * Read data from a file asynchronously.
     * @param {String} path
     * @returns {Any}
     */
    read: async function ioRead(path) {
        return readFileSync(path);
    },
    /**
     * Write data in a file.
     * @param {String} path
     * @param {Any} value
     */
    write: async function ioWrite(path, value) {
        fs.writeFileSync(path, value);
    },
    /**
     * Filter a direcotry using glob.
     * @param {String} filter Glob filter
     * @param {String} basedir Path to the directory where starting using the filter
     * @returns {Promise<String[]>} List of files matching the filter
     */
    filter: async function ioFilter(filter, basedir) {
        return glob.sync(filter, {
            cwd: basedir,
        });
    },
    /**
     * Remove a single file from disk.
     * @param {String} filename Path to the file
     */
    deleteFile: function ioDeleteFile(filename) {
        fs.unlinkSync(filename);
    },
    /**
     * Remove a dirctory recursively, unlinking also the content.
     * @param {String} dirname Path of the directory
     */
    deleteFolder: async function ioDeleteFolder(dirname) {
        deleteFolderRecursive(dirname);
    },
    /**
     * Check if the path exists on disk.
     * @param {String} path
     * @returns {Boolean}
     */
    pathExists: async function ioPathExists(path) {
        return exists(path);
    },
    /**
     * Rename a directory.
     * @param {String} currPath Current path of the directory
     * @param {String} newPath Path of the directory with the new name
     */
    renameDir: function ioRenameDir(currPath, newPath) {
        fs.renameSync(currPath, newPath);
    },
    /**
     * Obtain the saves path for a specific game.
     * @param {F95API.GameInfo} gameinfo 
     * @returns {Promise<String[]>}
     */
    findSavesPath: async function ioFindSavesPath(gameinfo) {
        return savesFinder.findSavesPath(gameinfo);
    },
    /**
     * Create a directory.
     * @param {String} dirname Path to new dir
     */
    mkdir: async function ioMkdir(dirname) {
        if (!fs.existsSync(dirname))
            fs.mkdirSync(dirname, {
                recursive: true,
            });
    },
    /**
     * Copy a file.
     * @param {String} src Path to origin
     * @param {String} dest Path to new destination
     */
    copy: async function ioCopy(src, dest) {
        fs.copyFileSync(src, dest);
    }
});

// Expose the F95API
contextBridge.exposeInMainWorld("F95", {
    UserData: new F95API.UserData(),
    GameInfo: new F95API.GameInfo(),
    getUserData: () => F95API.getUserData(),
    getGameData: (name, searchMod) => F95API.getGameData(name, searchMod),
    getGameDataFromURL: (url) => F95API.getGameDataFromURL(url),
    checkGameUpdates: (gameinfo) => F95API.checkIfGameHasUpdate(gameinfo),
    deserialize:(json) => F95API.GameInfo.fromJSON(json),
});
