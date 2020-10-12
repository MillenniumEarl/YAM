// For more information about secure use of IPC see:
// https://github.com/reZach/secure-electron-template/blob/master/docs/newtoelectron.md

"use strict";

// Core modules
const fs = require("fs");

// Public modules from npm
const { contextBridge, ipcRenderer } = require("electron");
const F95API = require("f95api");

// Set F95 cache
ipcRenderer.invoke("browser-data-dir").then(function (browserDir) {
  F95API.setCacheDir(browserDir);
});

// Modules from file
const { readFileSync, fileExists } = require("../src/scripts/io-operations.js");

// Array of valid render-to-main channels
let validSendChannels = [
  "auth-result",
  "login-window-closing",
  "credentials-path",
];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("API", {
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
});

// Expose the I/O operations
contextBridge.exposeInMainWorld("IO", {
  read: async function (path) {
    return readFileSync(path);
  },
  write: async function (path, value) {
    fs.writeFileSync(path, value);
  },
  fileExists: async function (filename) {
    return fileExists(filename);
  },
});

// Expose the F95API
contextBridge.exposeInMainWorld("F95", {
  login: (username, password) => F95API.login(username, password),
  logout: () => F95API.logout(),
});
