"use strict";

// Core modules
const path = require("path");
const fs = require("fs");

// Public modules from npm
const { app, BrowserWindow, shell, ipcMain, dialog } = require("electron");
const prompt = require("electron-prompt");
const isDev = require("electron-is-dev");

// Modules from file
const { runApplication } = require("./src/scripts/io-operations.js");
const shared = require("./src/scripts/shared.js");
const { installChromium } = require("./src/scripts/chromium.js");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let loginWindow;

// Variable used to close the main windows
let closeMainWindow = false;

//#region Windows creation methods
async function createMainWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 600,
    minWidth: 1024,
    minHeight: 600,
    useContentSize: true,
    icon: path.join(app.getAppPath(), "resources", "images", "icon.ico"),
    backgroundColor: "#262626", // Used to simulate loading and not make the user wait
    webPreferences: {
      allowRunningInsecureContent: false,
      worldSafeExecuteJavaScript: true,
      enableRemoteModule: false,
      contextIsolation: true,
      webSecurity: true,
      nodeIntegration: false,
      preload: path.join(
        app.getAppPath(),
        "app",
        "electron",
        "main-preload.js"
      ),
    },
  });
  // Whatever URL the user clicks will open the default browser for viewing
  mainWindow.webContents.on("new-window", function (e, url) {
    e.preventDefault();
    shell.openExternal(url);
  });

  // When the user try to close the main window,
  // this method intercept the default behaviour
  // Used to save the game data in the GameCards
  mainWindow.on("close", function (e) {
    if (mainWindow && !closeMainWindow) {
      e.preventDefault();
      closeMainWindow = true;
      mainWindow.webContents.send("window-closing");
    }
  });

  // Disable default menu
  if (!isDev) mainWindow.setMenu(null);

  // Load the index.html of the app.
  let htmlPath = path.join(app.getAppPath(), "app", "src", "index.html");
  mainWindow.loadFile(htmlPath);
}

async function createLoginWindow() {
  // Create the login window.
  loginWindow = new BrowserWindow({
    width: 400,
    height: 250,
    resizable: false,
    icon: path.join(app.getAppPath(), "resources", "images", "icon.ico"),
    backgroundColor: "#262626", // Used to simulate loading and not make the user wait
    frame: false,
    webPreferences: {
      allowRunningInsecureContent: false,
      worldSafeExecuteJavaScript: true,
      enableRemoteModule: false,
      contextIsolation: true,
      webSecurity: true,
      nodeIntegration: false,
      preload: path.join(
        app.getAppPath(),
        "app",
        "electron",
        "login-preload.js"
      ),
    },
  });

  // Disable default menu
  if (!isDev) loginWindow.setMenu(null);

  // Load the html file
  let htmlPath = path.join(app.getAppPath(), "app", "src", "login.html");
  loginWindow.loadFile(htmlPath);
}
//#endregion Windows creation methods

//#region IPC Communication
// This will be called when the main window
// require credentials, open the login windows
ipcMain.on("login-required", function (e) {
  console.log("Login required from main window");

  // Avoid multiple instance of the login window
  if (loginWindow) {
    console.log("Login window already active");
    return;
  } else createLoginWindow();
});

// Called when the main window has saved all
// the data and is ready to be definitely closed
ipcMain.on("main-window-closing", function (e) {
  mainWindow.close();
  mainWindow = null;
});

// Called when the login widnow want to be closed
ipcMain.on("login-window-closing", function (e) {
  loginWindow.close();
  loginWindow = null;
});

// Receive the result of the login operation
ipcMain.on("auth-result", function (e, result, username, password) {
  mainWindow.webContents.send("auth-result", result, username, password);
});

// Execute the file passed as parameter
ipcMain.on("exec", function (e, filename) {
  runApplication(...filename);
});

// Return the current root dir path (Current Working Directory)
ipcMain.handle("cwd", function (e) {
  return ".";
});

//#region shared app variables
ipcMain.handle("cache-dir", function (e) {
  let dirname = path.resolve(".", shared.cacheDir);

  // Create directory if not existent
  if (!fs.existsSync(dirname))
    fs.mkdirSync(dirname, {
      recursive: true,
    });

  return dirname;
});

ipcMain.handle("browser-data-dir", function (e) {
  let dirname = path.resolve(".", shared.browserDataDir);

  // Create directory if not existent
  if (!fs.existsSync(dirname))
    fs.mkdirSync(dirname, {
      recursive: true,
    });

  return dirname;
});

ipcMain.handle("games-data-dir", function (e) {
  let dirname = path.resolve(".", shared.gamesDataDir);

  // Create directory if not existent
  if (!fs.existsSync(dirname))
    fs.mkdirSync(dirname, {
      recursive: true,
    });

  return dirname;
});

ipcMain.handle("credentials-path", function (e) {
  return shared.credentialsPath;
});

ipcMain.handle("chromium-path", function (e) {
  return shared.chromiumPath;
});

//#endregion shared app variables

//#region IPC dialog for main window
ipcMain.handle("message-dialog", function (e, options) {
  return dialog.showMessageBox(mainWindow, options[0]);
});

ipcMain.handle("open-dialog", function (e, options) {
  return dialog.showOpenDialog(mainWindow, options[0]);
});

ipcMain.handle("save-dialog", function (e, options) {
  return dialog.showSaveDialog(mainWindow, options[0]);
});

ipcMain.handle("prompt-dialog", function (e, options) {
  return prompt(options[0], mainWindow);
});
//#endregion IPC dialog for main window

//#endregion IPC Communication

//#region App-related events
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async function () {
  shared.chromiumPath = await installChromium();

  createMainWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
//#endregion App-related events
