"use strict";

// Core modules
const path = require("path");
const fs = require("fs");

// Public modules from npm
const { app, BrowserWindow, shell, ipcMain, dialog } = require("electron");
const prompt = require("electron-prompt");
const isDev = require("electron-is-dev");
const logger = require("electron-log");
const Store = require("electron-store");

// Modules from file
const { runApplication } = require("./src/scripts/io-operations.js");
const shared = require("./src/scripts/shared.js");
const { installChromium } = require("./src/scripts/chromium.js");
const localization = require("./src/scripts/localization.js");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let loginWindow;

// Variable used to close the main windows
let closeMainWindow = false;

// Global store, keep user-settings
const store = new Store();

//#region Windows creation methods
async function createMainWindow() {
  // Local variables
  const width = store.has("main-width") ? store.get("main-width") : 1024;
  const height = store.has("main-height") ? store.get("main-height") : 600;

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: width,
    height: height,
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

  // Detect if the user maximized the window in a previous session
  const maximize = store.has("main-maximized")
    ? store.get("main-maximized")
    : false;
  if (maximize) mainWindow.maximize();

  // Whatever URL the user clicks will open the default browser for viewing
  mainWindow.webContents.on("new-window", function mainWindowOnNewWindow(
    e,
    url
  ) {
    e.preventDefault();
    shell.openExternal(url);
  });

  // When the user try to close the main window,
  // this method intercept the default behaviour
  // Used to save the game data in the GameCards
  mainWindow.on("close", function mainWindowOnClose(e) {
    if (mainWindow && !closeMainWindow) {
      e.preventDefault();
      closeMainWindow = true;
      mainWindow.webContents.send("window-closing");
    }
  });

  // Disable default menu
  if (!isDev) mainWindow.setMenu(null);

  // Load the index.html of the app.
  const htmlPath = path.join(app.getAppPath(), "app", "src", "index.html");
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
    parent: mainWindow,
    modal: true,
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
  const htmlPath = path.join(app.getAppPath(), "app", "src", "login.html");
  loginWindow.loadFile(htmlPath);
}
//#endregion Windows creation methods

//#region IPC Communication
// This will be called when the main window
// require credentials, open the login windows
ipcMain.on("login-required", function ipcMainOnLoginRequired() {
  logger.info("Login required from main window");

  // Avoid multiple instance of the login window
  if (loginWindow) {
    logger.warn("Login window already active");
    return;
  } else createLoginWindow();
});

// Called when the main window has saved all
// the data and is ready to be definitely closed
ipcMain.on("main-window-closing", function ipcMainOnMainWindowClosing() {
  logger.silly("Closing main window");

  // Save the sizes of the window
  const size = mainWindow.getSize();
  store.set("main-width", size[0]);
  store.set("main-height", size[1]);

  // Check is the window is maximized
  store.set("main-maximized", mainWindow.isMaximized());

  mainWindow.close();
  mainWindow = null;
});

// Called when the login widnow want to be closed
ipcMain.on("login-window-closing", function ipcMainOnLoginWindowClosing() {
  logger.silly("Closing main window");
  loginWindow.close();
  loginWindow = null;
});

// Receive the result of the login operation
ipcMain.on("auth-result", function ipcMainOnAuthResult(
  e,
  result,
  username,
  password
) {
  mainWindow.webContents.send("auth-result", result, username, password);
});

// Execute the file passed as parameter
ipcMain.on("exec", function ipcMainOnExec(e, filename) {
  logger.info(`Executing ${filename[0]}`);
  runApplication(filename[0])
    .then((err) => {
      if (err) logger.error(`Failed to start subprocess: ${err}`);
    })
    .catch((err) => logger.error(`Failed to start subprocess: ${err}`));
});

// Return the current root dir path (Current Working Directory)
ipcMain.handle("cwd", function ipcMainOnCWD() {
  return app.getAppPath();
});

// Return the value localized of the specified key
ipcMain.handle("translate", function ipcMainHandleTranslate(
  e,
  key,
  interpolation
) {
  return localization.getTranslation(key, interpolation);
});

// Change language and save user choice
ipcMain.handle("change-language", function ipcMainHandleChangeLanguage(e, iso) {
  store.set("language-iso", iso);
  logger.log(`Language changed: ${iso}`);
  return localization.changeLanguage(iso);
});

// Get the current language ISO
ipcMain.handle("current-language", function ipcMainHandleCurrentLanguage() {
  return localization.getCurrentLanguage();
});

//#region shared app variables
ipcMain.handle("cache-dir", function ipcMainHandleCacheDir() {
  const dirname = path.resolve(".", shared.cacheDir);

  // Create directory if not existent
  if (!fs.existsSync(dirname))
    fs.mkdirSync(dirname, {
      recursive: true,
    });

  return dirname;
});

ipcMain.handle("browser-data-dir", function ipcMainHandleBrowserDataDir() {
  const dirname = path.resolve(".", shared.browserDataDir);

  // Create directory if not existent
  if (!fs.existsSync(dirname))
    fs.mkdirSync(dirname, {
      recursive: true,
    });

  return dirname;
});

ipcMain.handle("games-data-dir", function ipcMainHandleGamesDataDir() {
  const dirname = path.resolve(".", shared.gamesDataDir);

  // Create directory if not existent
  if (!fs.existsSync(dirname))
    fs.mkdirSync(dirname, {
      recursive: true,
    });

  return dirname;
});

ipcMain.handle("savegames-data-dir", function ipcMainHandleSaveGamesDataDir() {
  const dirname = path.resolve(".", shared.exportedGameSavesDirName);

  // Create directory if not existent
  if (!fs.existsSync(dirname))
    fs.mkdirSync(dirname, {
      recursive: true,
    });

  return dirname;
});

ipcMain.handle("credentials-path", function ipcMainHandleCredentialsPath() {
  return shared.credentialsPath;
});

ipcMain.handle("chromium-path", function ipcMainHandleChromiumPath() {
  return shared.chromiumPath;
});

//#endregion shared app variables

//#region IPC dialog for main window
ipcMain.handle("message-dialog", function ipcMainHandleMessageDialog(
  e,
  options
) {
  return dialog.showMessageBox(mainWindow, options[0]);
});

ipcMain.handle("open-dialog", function ipcMainHandleOpenDialog(e, options) {
  return dialog.showOpenDialog(mainWindow, options[0]);
});

ipcMain.handle("save-dialog", function ipcMainHandleSaveDialog(e, options) {
  return dialog.showSaveDialog(mainWindow, options[0]);
});

ipcMain.handle("prompt-dialog", function ipcMainHandlePromptDialog(e, options) {
  return prompt(options[0], mainWindow);
});
//#endregion IPC dialog for main window

//#endregion IPC Communication

//#region App-related events
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async function appOnReady() {
  logger.info("Application ready");

  // Initialize language
  logger.info("Initializing languages...");
  const lang = store.has("language-iso")
    ? store.get("language-iso")
    : "DEFAULT";
  const langPath = path.join(app.getAppPath(), "resources", "lang");
  localization.initLocalization({
    resourcesPath: langPath,
    language: lang,
  });
  logger.info("Languages initialized");

  shared.chromiumPath = await installChromium();
  if (shared.chromiumPath) logger.info("Chromium installed");
  else logger.error("Something wrong with Chromium");

  logger.silly("Creating main window");
  createMainWindow();

  app.on("activate", function appOnActivate() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", function appOnWindowAllClosed() {
  logger.silly("Closing application");
  if (process.platform !== "darwin") app.quit();
});
//#endregion App-related events
