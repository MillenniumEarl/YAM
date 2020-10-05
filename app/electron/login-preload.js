// For more information about secure use of IPC see:
// https://github.com/reZach/secure-electron-template/blob/master/docs/newtoelectron.md

"use strict";

// Public modules from npm
const {
    contextBridge,
    ipcRenderer
} = require("electron");

// Modules from file
const AppConstant = require("../src/scripts/app-constant.js");

// Set the global constants
var _constants = new AppConstant();
_constants.init();

// Array of valid main-to-render channels
let validReceiveChannels = ["login-reply"];

// Array of valid render-to-main channels
let validSendChannels = ["read-file", "write-file", "file-exists", "auth-successful", "try-login"];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("api", {
    constants: _constants,
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
    currentWindow: Electron.remote.getCurrentWindow()
});