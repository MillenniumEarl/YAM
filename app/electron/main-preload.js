// For more information about secure use of IPC see:
// https://github.com/reZach/secure-electron-template/blob/master/docs/newtoelectron.md

"use strict";

// Core modules
const fs = require("fs");
const { glob } = require("glob");
const { join } = require("path");

// Public modules from npm
const { contextBridge, ipcRenderer } = require("electron");
const F95API = require("f95api");

// Modules from file
const {
  deleteFolderRecursive,
  readFileSync,
  fileExists,
} = require("../src/scripts/io-operations.js");

// Set F95 cache
ipcRenderer.invoke("cawd").then(function (cawd) {
  let cacheDir = join(cawd, "cache");
  F95API.setCacheDir(cacheDir);
  if (!fs.existsSync(cacheDir)) fs.mkdir(cacheDir);
});

// Array of valid main-to-render channels
let validReceiveChannels = [
  "window-closing",
  "auth-result",
  "cawd",
  "cache-dir",
  "browser-data-dir",
  "games-data-dir",
  "credentials-path",
];

// Array of valid render-to-main channels
let validSendChannels = [
  "main-window-closing",
  "login-required",
  "exec",
  "message-dialog",
  "open-dialog",
  "save-dialog",
  "cawd",
  "cache-dir",
  "browser-data-dir",
  "games-data-dir",
  "credentials-path",
];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("API", {
  appDir: __dirname.replace("electron", ""),
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
});

// Expose the I/O operations
contextBridge.exposeInMainWorld("IO", {
  readSync: function (path) {
    return readFileSync(path);
  },
  read: async function (path) {
    return readFileSync(path);
  },
  write: async function (path, value) {
    fs.writeFileSync(path, value);
  },
  filter: async function (filter, basedir) {
    return glob.sync(filter, {
      cwd: basedir,
    });
  },
  deleteFolder: async function (dirname) {
    deleteFolderRecursive(dirname);
  },
  fileExists: async function (filename) {
    return fileExists(filename);
  },
});

// Expose the F95API
contextBridge.exposeInMainWorld("F95", {
  UserData: new F95API.UserData(),
  GameInfo: new F95API.GameInfo(),
  login: (username, password) => F95API.login(username, password),
  getUserData: () => F95API.getUserData(),
  getGameData: (name, includeMods) => F95API.getGameData(name, includeMods),
  getGameVersion: (gameinfo) => F95API.getGameVersion(gameinfo),
  loadF95BaseData: () => F95API.loadF95BaseData(),
});
