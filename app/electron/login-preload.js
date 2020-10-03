//### IN ORDER TO USE window.[function[] CONTEXT_ISOLATION IN APP.JS MUST BE FALSE!!! ###
const AppCostants = require('../AppCostants.js').AppCostants;
const { login, setCacheDir } = require('f95api');
const electron = require('electron');
const ipc = electron.ipcRenderer;
const {
    readFileSync,
    existsSync,
    writeFileSync,
} = require('fs');

// Initialize the folders
var constants = new AppCostants();
constants.init();


setCacheDir(costants.BROWSER_DATA_DIR);

// Assing the global variables
window.fread = readFileSync;
window.fexists = existsSync;
window.fwrite = writeFileSync;
window.ipc = ipc;
window.f95login = login;
window.AppCostants = constants;
window.getCurrentWindow = electron.remote.getCurrentWindow;