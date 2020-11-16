// For more information about secure use of IPC see:
// https://github.com/reZach/secure-electron-template/blob/master/docs/newtoelectron.md

"use strict";

// Core modules
const { join } = require("path");

// Public modules from npm
const { ipcRenderer, contextBridge } = require("electron");
const logger = require("electron-log");

// Modules from file
const {
    readFileSync
} = require("../../src/scripts/io-operations.js");

// Array of valid render-to-main channels
const validSendChannels = [
    "window-close",
    "window-resize",
    "translate",
];

// Array of valid main-to-render channels
const validReceiveChannels = ["window-arguments"];

contextBridge.exposeInMainWorld("API", {
    /**
     * Join multiple strings into a parsed path for the current OS.
     * @param {String[]} paths Partial paths to join
     * @return {String} Joined path
     */
    join: (...paths) => join(...paths),
    /**
     * Return the current working directory.
     */
    cwd: async function cwd() {
        return ipcRenderer.invoke("cwd");
    },
    /**
     * Send an asynchronous request via IPC.
     * @param {String} channel Communication channel
     * @param {Any[]} data Data to send to main process
     */
    send: (channel, ...data) => {
        // Send a custom _message
        if (validSendChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    once: (channel, func) => {
        // Receive a custom message
        if (validReceiveChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`
            ipcRenderer.once(channel, (event, ...args) => func(...args));
        }
    },
    /**
     * Translate a key into a _message in the language specified by the user.
     * @param {String} key Unique key of the _message
     * @param {Object} interpolation Dictionary containing the interpolation values
     * @returns {Promise<String>}
     */
    translate: async function apiTranslate(key, interpolation) {
        return ipcRenderer.invoke("translate", key, interpolation);
    },
    /**
     * Provide access to logger methods.
     */
    log: logger.functions,
});

contextBridge.exposeInMainWorld("IO", {
    /**
     * Read data from a file asynchronously.
     * @param {String} path
     * @returns {Any}
     */
    read: async function ioRead(path) {
        return readFileSync(path);
    }
});
