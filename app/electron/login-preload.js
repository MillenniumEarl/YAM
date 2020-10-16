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

// Set F95 chromium path
ipcRenderer.invoke("chromium-path").then(function (path) {
  F95API.setChromiumPath(path);
});

// Modules from file
const { readFileSync, exists } = require("../src/scripts/io-operations.js");

// Array of valid render-to-main channels
const validSendChannels = [
  "auth-result",
  "login-window-closing",
  "credentials-path",
  "translate",
];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("API", {
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
   * Translate a key into a message in the language specified by the user.
   * @param {String} key Unique key of the message
   * @returns {Promise<String>}
   */
  translate: async function (key) {
    return ipcRenderer.invoke("translate", key);
  }
});

// Expose the I/O operations
contextBridge.exposeInMainWorld("IO", {
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
   * Check if the specified file exists on disk.
   * @param {String} filename 
   * @returns {Boolean}
   */
  fileExists: async function (filename) {
    return exists(filename);
  },
});

// Expose the F95API
contextBridge.exposeInMainWorld("F95", {
  login: (username, password) => F95API.login(username, password),
  logout: () => F95API.logout(),
});
