// For more information about secure use of IPC see:
// https://github.com/reZach/secure-electron-template/blob/master/docs/newtoelectron.md

"use strict";

// Core modules
const fs = require("fs");
const { glob } = require("glob");
const { join, basename, dirname } = require("path");

// Public modules from npm
const { contextBridge, ipcRenderer } = require("electron");
const F95API = require("f95api");
const download = require("image-downloader");

// Modules from file
const {
  deleteFolderRecursive,
  readFileSync,
  exists,
} = require("../src/scripts/io-operations.js");

// Set F95 cache
ipcRenderer.invoke("browser-data-dir").then(function (browserDir) {
  F95API.setCacheDir(browserDir);
});

// Set F95 chromium path
ipcRenderer.invoke("chromium-path").then(function (path) {
  F95API.setChromiumPath(path);
});

// Set F95 isolation
F95API.setIsolation(true);

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
  "browser-data-dir",
  "games-data-dir",
  "credentials-path",
];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("API", {
  appDir: __dirname.replace("electron", ""),
  /**
   * OS platform of the current device.
   */
  platform: process.platform,
  invoke: (channel, ...data) => {
    // Send a custom message
    if (validSendChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
  },
  send: (channel, ...data) => {
    // Send a custom message
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    // Receive a custom message
    if (validReceiveChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  join: (...paths) => join(...paths),
  isOnline: () => navigator.onLine,
  downloadImage: function (url, dest) {
    return download.image({ url: url, dest: dest });
  },
  getDirName: function (path) {
    return basename(dirname(path));
  },
});

// Expose the I/O operations
contextBridge.exposeInMainWorld("IO", {
  /**
   * Read data from a file synchronously.
   * @param {String} path
   * @returns {Any}
   */
  readSync: function (path) {
    return readFileSync(path);
  },
  /**
   * Read data from a file asynchronously.
   * @param {String} path
   * @returns {Any}
   */
  read: async function (path) {
    return readFileSync(path);
  },
  /**
   * Write data in a file.
   * @param {String} path
   * @param {Any} value
   */
  write: async function (path, value) {
    fs.writeFileSync(path, value);
  },
  /**
   * Filter a direcotry using glob.
   * @param {String} filter Glob filter
   * @param {String} basedir Path to the directory where starting using the filter
   * @returns {Promise<String[]>} List of files matching the filter
   */
  filter: async function (filter, basedir) {
    return glob.sync(filter, {
      cwd: basedir,
    });
  },
  /**
   * Remove a single file from disk.
   * @param {String} filename Path to the file
   */
  deleteFile: function (filename) {
    fs.unlinkSync(filename);
  },
  /**
   * Remove a dirctory recursively, unlinking also the content.
   * @param {String} dirname Path of the directory
   */
  deleteFolder: async function (dirname) {
    deleteFolderRecursive(dirname);
  },
  /**
   * Check if the path exists on disk.
   * @param {String} path
   * @returns {Boolean}
   */
  pathExists: async function (path) {
    return exists(path);
  },
  /**
   * Rename a directory.
   * @param {String} currPath Current path of the directory
   * @param {String} newPath Path of the directory with the new name
   */
  renameDir: function (currPath, newPath) {
    fs.renameSync(currPath, newPath);
  },
});

// Expose the F95API
contextBridge.exposeInMainWorld("F95", {
  UserData: new F95API.UserData(),
  GameInfo: new F95API.GameInfo(),
  login: (username, password) => F95API.login(username, password),
  getUserData: () => F95API.getUserData(),
  getGameData: (name, includeMods) => F95API.getGameData(name, includeMods),
  getGameDataFromURL: (url) => F95API.getGameDataFromURL(url),
  checkGameUpdates: (gameinfo) => F95API.chekIfGameHasUpdate(gameinfo),
  loadF95BaseData: () => F95API.loadF95BaseData(),
  logout: () => F95API.logout(),
});
