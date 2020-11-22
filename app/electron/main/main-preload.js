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
    basename
} = require("path");

// Public modules from npm
const {
    contextBridge,
    ipcRenderer,
} = require("electron");
const F95API = require("@millenniumearl/f95api");
const download = require("simple-image-downloader");
const logger = require("electron-log");
const imagemin = require("imagemin");
const imageminWebp = require("imagemin-webp");
const imageminGifsicle = require("imagemin-gifsicle");

// Modules from file
const ioOps = require("../../src/scripts/io-operations.js");
const GameInfoExtended = require("../../src/scripts/classes/game-info-extended.js");
const {check} = require("../../src/scripts/internet-connection.js");
const GameDataStore = require("../../db/stores/game-data-store.js");

// Set F95API logger level
F95API.loggerLevel = "warn";

// Array of valid main-to-render channels
const validReceiveChannels = [];

// Array of valid render-to-main channels
const validSendChannels = [
    "login-required",
    "exec",
    "message-dialog",
    "open-dialog",
    "cwd",
    "cache-dir",
    "savegames-data-dir",
    "credentials-path",
    "translate",
    "require-messagebox",
    "url-input",
    "update-messagebox",
    "preview-dir"
];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("API", {
    /**
     * Directory of the app.js file.
     */
    appDir: __dirname.replace("electron", "").replace("main", ""),
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
        else logger.warn(`Unauthorized IPC message from 'main-preload.js' through ${channel}: ${data}`);
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
        else logger.warn(`Unauthorized IPC message from 'main-preload.js' through ${channel}: ${data}`);
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
     */
    isOnline: () => check(),
    /**
     * Download an image given a url.
     * @param {String} url URL to download the image from
     * @param {String} dest Path where save the image
     * @returns {Promise<Any>}
     */
    downloadImage: function apiDownloadImage(url, dest) {
        return download.image({
            url: url,
            dest: dest,
        });
    },
    /**
     * Obtain the name of the parent directory of a specified path.
     * @param {String} path
     * @returns {String}
     */
    getDirName: function apiGetDirName(path) {
        return basename(path);
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
    /**
     * Convert and compress an image to webp.
     * @param {String} src Path to source
     * @param {String} dest Path to destination folder
     */
    compress: async function compressImage(src, dest) {
        const gifOptions = {
            interlaced: true,
            optimizationLevel: 3,
        };
        const webpOptions = {
            preset: "picture",
            quality: 70,
            method: 5
        };

        // GIF images cannot be converted to WEBP
        const isGIF = src.endsWith(".gif");
        const plugins = isGIF ? [imageminGifsicle(gifOptions)] : [imageminWebp(webpOptions)];
        
        const options = {
            destination: dest,
            // imagemin cannot handle Window slash but only 
            // Unix backslash, see https://github.com/imagemin/imagemin/issues/352
            glob: false, 
            plugins: plugins
        };
        
        return await imagemin([src], options);
    }
});

// Expose the I/O operations
contextBridge.exposeInMainWorld("IO", {
    /**
     * Read data from a file synchronously.
     * @param {String} path
     * @returns {Any}
     */
    readSync: function ioReadSync(path) {
        return ioOps.readFileSync(path);
    },
    /**
     * Read data from a file asynchronously.
     * @param {String} path
     * @returns {Any}
     */
    read: async function ioRead(path) {
        return ioOps.readFileSync(path);
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
        ioOps.deleteFolderRecursive(dirname);
    },
    /**
     * Check if the path exists on disk.
     * @param {String} path
     * @returns {Boolean}
     */
    pathExists: async function ioPathExists(path) {
        return ioOps.exists(path);
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
    },
});

// Expose the F95API
contextBridge.exposeInMainWorld("F95", {
    UserData: new F95API.UserData(),
    logged: F95API.isLogged,
    login: (username, password) => F95API.login(username, password),
    getUserData: () => F95API.getUserData(),
    getGameData: (name, searchMod) => F95API.getGameData(name, searchMod),
    getGameDataFromURL: (url) => F95API.getGameDataFromURL(url),
    checkGameUpdates: function checkGameUpdates(data) {
        // Create a new object from the data
        const gameinfo = Object.assign(new GameInfoExtended(), data);

        // This method require GameInfo but GameInfoExtended is extended from GameInfo
        return F95API.checkIfGameHasUpdate(gameinfo);
    },
});

// Expose the GameInfoExtended custom class
contextBridge.exposeInMainWorld("GIE", {
    gamedata: new GameInfoExtended(),
    convert: function convert(gameinfo) {
        // Create a new object from the data
        return Object.assign(new GameInfoExtended(), gameinfo);
    },
    save: function saveGameInfo(data, path) {
        // Create a new object from the data
        const gameinfo = Object.assign(new GameInfoExtended(), data);

        // Save the data
        gameinfo.save(path);
    },
    load: function loadGameInfo(path) {
        // Load data
        const gameinfo = new GameInfoExtended();
        gameinfo.load(path);
        
        // Return data (will be frozen)
        return gameinfo;
    },
    saves: async function getGameSaves(data) {
        // Create a new object from the data
        const gameinfo = Object.assign(new GameInfoExtended(), data);

        return await gameinfo.getSaves();
    },
    launcher: function getGameLauncher(data) {
        // Create a new object from the data
        const gameinfo = Object.assign(new GameInfoExtended(), data);

        return gameinfo.getGameLauncher();
    }
});

// Expose the database methods
let dbstore = null;
ipcRenderer.invoke("database-path").then(function (path) {
    dbstore = new GameDataStore(path);
});
contextBridge.exposeInMainWorld("DB", {
    insert: (gameinfo) => dbstore.insert(gameinfo),
    delete: (id) => dbstore.delete(id),
    read: (id) => dbstore.read(id),
    write: (gameinfo) => dbstore.write(gameinfo),
    search: (searchQuery, index, size, limit, sortQuery) => dbstore.search(searchQuery, index, size, limit, sortQuery),
    count: (query) => dbstore.count(query),
});