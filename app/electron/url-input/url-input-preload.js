// For more information about secure use of IPC see:
// https://github.com/reZach/secure-electron-template/blob/master/docs/newtoelectron.md

"use strict";

// Public modules from npm
const { ipcRenderer, contextBridge } = require("electron");
const logger = require("electron-log");

// Array of valid render-to-main channels
const validSendChannels = [
    "translate",
    "url-response",
    "url-input-closing",
    "window-resize"
];

contextBridge.exposeInMainWorld("API", {
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
     * Provide access to logger methods.
     */
    log: logger.functions,
});