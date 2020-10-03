"use strict";

// Core modules
const path = require('path');
const fs = require("fs");

// Public modules from npm
const {
  app,
  BrowserWindow,
  shell,
  ipcMain
} = require('electron');
const Store = require("secure-electron-store").default;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

//#region Windows creation methods
async function createMainWindow() {
  // Use saved config values for configuring your
  // BrowserWindow, for instance.
  // NOTE - this config is not passcode protected
  // and stores plaintext values
  // NOTE - be sure to _ensure_ values exist before
  // referencing them below!
  let savedConfig = store.mainInitialStore(fs);

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: savedConfig.width ? savedConfig.width : 1024,
    height: savedConfig.height ? savedConfig.height : 600,
    backgroundColor: '#252321', // Used to simulate loading and not make the user wait
    webPreferences: {
      allowRunningInsecureContent: false,
      worldSafeExecuteJavaScript: true,
      enableRemoteModule: false,
      contextIsolation: true,
      webSecurity: true,
      nodeIntegration: false,
      preload: path.join(app.getAppPath(), 'electron', 'main-preload.js'),
      additionalArguments: [`storePath:${app.getPath("userData")}`], // Needed for using the IPC-base JSON storage
    }
  });

  // Sets up app.js bindings for our electron store
  const store = new Store({
    path: app.getPath("userData")
  });
  store.mainBindings(ipcMain, mainWindow, fs);

  // Whatever URL the user clicks will open the default browser for viewing
  mainWindow.webContents.on('new-window', function (e, url) {
    e.preventDefault();
    shell.openExternal(url);
  });

  // When the user try to close the main window, 
  // this method intercept the default behaviour
  // Used to save the game data in the GameCards
  mainWindow.on('close', function (e) {
    if (mainWindow) {
      e.preventDefault();
      mainWindow.webContents.send('app-closing');
    }
  });

  // Disable default menu
  //mainWindow.setMenu(null)

  // Load the index.html of the app.
  let htmlPath = path.join(app.getAppPath(), 'src', 'index.html');
  mainWindow.loadFile(htmlPath);

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

async function createLoginWindow() {
  // Create the login window.
  let loginWindow = new BrowserWindow({
    width: 400,
    height: 250,
    backgroundColor: '#252321', // Used to simulate loading and not make the user wait
    frame: false,
    webPreferences: {
      allowRunningInsecureContent: false,
        worldSafeExecuteJavaScript: true,
        enableRemoteModule: false,
        contextIsolation: true,
        webSecurity: true,
        nodeIntegration: false,
      preload: path.join(app.getAppPath(), 'electron', 'login-preload.js')
    }
  });

  // Disable default menu
  loginWindow.setMenu(null)

  // Load the html file
  let htmlPath = path.join(app.getAppPath(), 'src', 'login.html');
  loginWindow.loadFile(htmlPath);
}
//#endregion Windows creation methods

//#region IPC Communication
// This will be called when the main window require credentials
ipcMain.on('login-required', function() {
  console.log('Login required');
  createLoginWindow();
});

// Called when the main window has saved all the data and is ready to be definitely closed
ipcMain.on('main-window-closing', function () {
  mainWindow = null;
  if (process.platform !== 'darwin') app.quit();
});

// Used to return credentials
ipcMain.on('auth-successful', function(event, credentials) {
  mainWindow.webContents.send('auth-successful', credentials);
});
//#endregion IPC Communication

//#region App-related events
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(function() {
  createMainWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  })
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
//#endregion App-related events