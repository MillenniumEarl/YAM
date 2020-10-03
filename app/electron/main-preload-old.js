// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

//### IN ORDER TO USE window.[function[] CONTEXT_ISOLATION IN APP.JS MUST BE FALSE!!! ###
const {
  readFileSync,
  existsSync,
  rmdir,
  writeFileSync,
  createWriteStream,
  unlinkSync
} = require('fs');
const {join} = require('path');
const electron = require('electron');
const ipc = electron.ipcRenderer;
const glob = require('glob').glob;
const F95API = require('f95api');
const AppCostants = require('../AppCostants').AppCostants;
const request = require('request');

/**
 * Run a file from disk.
 * @param {String} path Path of the application to run
 */
window.runApplication = function (path) {
  console.log('Executing ' + path);
  electron.shell
    .openPath(path)
    .then((err) => {
      if (err)
        console.error('Failed to start subprocess: ' + err);
    });
}

/**
 * Download an image from Internet.
 * @param {URL} url URL of the image to download
 * @param {String} savePath Path for saving the image to disk
 * @returns {Boolean} true if the image was downloaded, false otherwise
 */
window.downloadImage = function (url, savePath) {
  request.head(url.toString(), (err, res, body) => {
    if (err) {
      console.error("Can't download image: " + err);
      return false;
    }
    request(url).pipe(createWriteStream(savePath));
    return true;
  })
}

window.isOnline = function() {
  return navigator.onLine;
}

var costants = new AppCostants();
costants.init();

F95API.debug(true);
// Set the cache path for the F95API
F95API.setCacheDir(costants.BROWSER_DATA_DIR);

window.AppCostant = costants;
window.osPlatform = process.platform;
window.glob = glob;
window.rmdir = rmdir;
window.existsSync = existsSync;
window.readFileSync = readFileSync;
window.dialog = electron.remote.dialog; // Need enableRemoteModule: true in app.js
window.F95API = F95API;
window.join = join;
window.writeFileSync = writeFileSync;
window.unlinkSync = unlinkSync;
window.ipc = ipc;
window.isOnline = isOnline;