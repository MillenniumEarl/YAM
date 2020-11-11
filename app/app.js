"use strict";

// Core modules
const path = require("path");
const fs = require("fs");

// Public modules from npm
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const logger = require("electron-log");
const Store = require("electron-store");

// Modules from file
const { run } = require("./src/scripts/io-operations.js");
const shared = require("./src/scripts/classes/shared.js");
const localization = require("./src/scripts/localization.js");
const windowCreator = require("./src/scripts/window-creator.js");

// Manage unhandled errors
process.on("uncaughtException", function (error) {
    logger.error(`Uncaught error in the main process.\n${error}`);
});

//#region Global variables

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow, loginWindow, messageBox;

// Global store, keep user-settings
const store = new Store();

//#endregion Global variables

// Disable hardware acceleration for better performance
app.disableHardwareAcceleration();

//#region IPC Communication
// This will be called when the main window
// require credentials, open the login windows
ipcMain.on("login-required", function ipcMainOnLoginRequired() {
    logger.info("Login required from main window");

    // Avoid multiple instance of the login window
    if (loginWindow) {
        logger.warn("Login window already active");
        return;
    } else loginWindow = windowCreator.createLoginWindow(mainWindow);
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

// Called when the login window want to be closed
ipcMain.on("login-window-closing", function ipcMainOnLoginWindowClosing() {
    logger.silly("Closing login window");
    loginWindow.close();
    loginWindow = null;
});

// Called when a messagebox is closing
ipcMain.on("messagebox-closing", function ipcMainOnMessageboxClosing() {
    logger.silly("Closing messagebox");
    messageBox.close();
    messageBox = null;
});

// Called when the main window require a new messagebox
ipcMain.on("require-messagebox", function ipcMainOnRequireMessagebox(e, args) {
    messageBox = windowCreator.createMessagebox(mainWindow, ...args);
});

// Receive the result of the login operation
ipcMain.on("auth-result", function ipcMainOnAuthResult(e, result) {
    mainWindow.webContents.send("auth-result", ...result);
});

// Execute the file passed as parameter
ipcMain.on("exec", function ipcMainOnExec(e, filename) {
    logger.info(`Executing ${filename[0]}`);
    run(filename[0])
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
ipcMain.handle("translate", function ipcMainHandleTranslate(e, key, interpolation) {
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
//#endregion shared app variables

//#region IPC dialog for main window
ipcMain.handle("message-dialog", function ipcMainHandleMessageDialog(e, options) {
    return dialog.showMessageBox(mainWindow, options[0]);
});

ipcMain.handle("open-dialog", function ipcMainHandleOpenDialog(e, options) {
    return dialog.showOpenDialog(mainWindow, options[0]);
});

ipcMain.handle("url-input", function ipcMainHandleURLInput() {
    // Create the messagebox
    let urlInput = windowCreator.createURLInputbox(mainWindow);

    // We cannot return something from inside the callback, 
    // so we create a new promise and return that.
    // The result of the promise will be received by the original sender.
    return new Promise((resolve) => {
        // Manage the close event + URL inserted
        ipcMain.once("url-response", function ipcMainOnURLInputReturnInput(_, args) {
            resolve(args[0]); // args[0] is the returned URL
        });

        // Manage the close event
        ipcMain.once("url-input-closing", function ipcMainOnURLInputWindowClosing() {
            logger.silly("Closing URL input window");
            urlInput.close();
            urlInput = null;
            resolve(null);
        });
    });
});

ipcMain.handle("update-messagebox", function ipcMainHandleURLInput(e, options) {
    // Create the messagebox
    let w = windowCreator.createUpdateMessagebox(mainWindow, ...options);

    // We cannot return something from inside the callback, 
    // so we create a new promise and return that.
    // The result of the promise will be received by the original sender.
    return new Promise((resolve) => {
        // Manage the close event when the game is updated
        ipcMain.once("um-finalized", function ipcMainOnUpdateWindowFinalizing() {
            logger.silly("Update finalized by the user");
            w.close();
            w = null;
            resolve(true);
        });

        // Manage the close event
        ipcMain.once("um-closing", function ipcMainOnUpdateWindowClosing() {
            logger.silly("Closing update window without finalizing the update");
            w.close();
            w = null;
            resolve(false);
        });
    });
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

    logger.silly("Creating main window");
    mainWindow = windowCreator.createMainWindow();

    app.on("activate", function appOnActivate() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) mainWindow = windowCreator.createMainWindow();
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
