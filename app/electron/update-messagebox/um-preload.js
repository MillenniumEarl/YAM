// For more information about secure use of IPC see:
// https://github.com/reZach/secure-electron-template/blob/master/docs/newtoelectron.md

"use strict";

// Public modules from npm
const {
    ipcRenderer,
    contextBridge
} = require("electron");
const logger = require("electron-log");

// Modules from file
const errManager = require("../../src/scripts/error-manger.js");

// Array of valid render-to-main channels
const validSendChannels = [
    "window-close",
    "translate",
    "open-link",
];

// Array of valid main-to-render channels
const validReceiveChannels = ["window-arguments"];

//#region Error management
/**
 * @event
 * Handles errors generated by the application.
 * @param {String} message Error message
 * @param {String} source File where the error occurred
 * @param {number} lineno Line containing the instruction that generated the error
 * @param {number} colno Column containing the statement that generated the error
 * @param {Error} error Application generated error
 */
window.onerror = function (message, source, lineno, colno, error) {
    errManager.manageError("um-preload.js", {
        message: message,
        line: lineno,
        column: colno,
        error: error,
    }, ipcRenderer);
};

/**
 * @event
 * Handles errors generated within non-catched promises.
 * @param {PromiseRejectionEvent} error 
 */
window.onunhandledrejection = function (error) {
    errManager.manageUnhandledError("um-preload.js", error.reason, ipcRenderer);
};
//#endregion Error management

//#region Context Bridge
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
        else logger.warn(`Unauthorized IPC message from 'um-preload.js' through ${channel}: ${data}`);
    },
    once: (channel, func) => {
        // Receive a custom message
        if (validReceiveChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`
            ipcRenderer.once(channel, (event, ...args) => func(...args));
        }
    },
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
        } else logger.warn(`Unauthorized IPC message from 'um-preload.js' through ${channel}: ${data}`);
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
    /**
     * Log an error
     * @param {Error} error Throwed error
     * @param {String} code Unique error code
     * @param {String} name Name of the function that throw the error
     * @param {String} parentName Name of the function containing the error throwing function
     * @param {String} message Custom message to add
     */
    reportError: (error, code, name, parentName, message) => errManager.reportError(error, code, name, parentName, message),
});

// Expose methods for error logging
contextBridge.exposeInMainWorld("EM", {
    onerror: (scriptname, data) => errManager.manageError(scriptname, data, ipcRenderer),
    unhandlederror: (scriptname, reason) => errManager.manageUnhandledError(scriptname, reason, ipcRenderer)
});
//#endregion Context Bridge
