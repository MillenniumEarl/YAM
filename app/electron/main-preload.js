// For more information about secure use of IPC see:
// https://github.com/reZach/secure-electron-template/blob/master/docs/newtoelectron.md

"use strict";

// Public modules from npm
const {
  contextBridge,
  ipcRenderer
} = require("electron");
const F95API = require("f95api");
const fs = require("fs");
const {
  glob
} = require('glob');
const {join} = require("path");
const dialog = require("electron-dialog");

// Modules from file
const Shared = require("../src/scripts/shared.js");
const {
  deleteFolderRecursive,
  readFile,
  fileExists
} = require("../src/scripts/io-operations.js");

// Array of valid main-to-render channels
let validReceiveChannels = ["window-closing", "delete-folder-reply", "auth-successful"];

// Array of valid render-to-main channels
let validSendChannels = ["main-window-closing", "login-required", "exec"];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("api", {
  shared: Shared,
  invoke: (channel, data) => { // Send a custom message
    if (validSendChannels.includes(channel)) {
      ipcRenderer.invoke(channel, data);
    }
  },
  send: (channel, data) => { // Send a custom message
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => { // Receive a custom message
    if (validReceiveChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender` 
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  read: async function (path) {
    return readFile(path);
  },
  write: async function (path, value) {
    fs.writeFileSync(path, value);
  },
  filter: async function (filter, basedir) {
    return glob.sync(filter, {
      cwd: basedir
    });
  },
  deleteFolder: async function (dirname) {
    deleteFolderRecursive(dirname);
  },
  fileExists: async function (filename) {
    return fileExists(filename);
  },
  join: (paths) => join(paths),
  dialogAlert: (message) => dialog.alert(message),
  dialogChoice: (message, choiches) => dialog.choice(message, choiches),
  dialogOpen: (options) => dialog.open(options)
});

// Expose the F95API
contextBridge.exposeInMainWorld("F95", {
  UserData: F95API.UserData,
  GameInfo: F95API.GameInfo,
  getUserData: F95API.getUserData(),
  getGameData: (name, includeMods) => F95API.getGameData(name, includeMods),
  getGameVersion: (gameinfo) => F95API.getGameVersion(gameinfo)
});