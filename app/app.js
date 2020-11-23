"use strict";

// Core modules
const path = require("path");
const fs = require("fs");

// Public modules from npm
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const logger = require("electron-log");
const Store = require("electron-store");

// Modules from file
const { run, openLink } = require("./src/scripts/io-operations.js");
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
let mainWindow;

// Global store, keep user-settings
const store = new Store();

//#endregion Global variables

// Get a lock instance to prevent multiple instance from running
const instanceLock = app.requestSingleInstanceLock();

// There is another instance running, close this instance
if (!instanceLock) app.quit();

// Disable hardware acceleration for better performance
// as we don't use animations. 
// Fix also strange graphical artifacts
app.disableHardwareAcceleration();

//#region IPC Communication
// This will be called when the main window
// require credentials, open the login windows
ipcMain.handle("login-required", function ipcMainOnLoginRequired() {
    logger.info("Login required from main window");
    return windowCreator.createLoginWindow(mainWindow).onclose;
});

// Called when the main window require a new messagebox
ipcMain.handle("require-messagebox", function ipcMainOnRequireMessagebox(e, args) {
    return windowCreator.createMessagebox(mainWindow, ...args, messageBoxCloseCallback).onclose;
});

// Execute the file passed as parameter
ipcMain.on("exec", async function ipcMainOnExec(e, filename) {
    const filepath = filename[0];

    logger.info(`Executing ${filepath}`);
    
    // Create and run child
    const child = run(filepath);

    // Write log on child error
    child.stderr.on("data", (data) => {
        logger.error(`Error running ${filepath}: ${data}`);
    });
});

// Open the directory path/URL in the default manner
ipcMain.on("open-link", function ipcMainOnOpenLink(e, filename) {
    const link = filename[0];

    logger.info(`Opening ${link}`);

    // Open link
    openLink(link);
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

ipcMain.handle("preview-dir", function ipcMainHandlePreviewDir() {
    const dirname = path.resolve(".", shared.previewDir);

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

ipcMain.handle("database-path", function ipcMainHandleDatabasePath() {
    return shared.databasePath;
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
    return windowCreator.createURLInputbox(mainWindow).onclose;
});

ipcMain.handle("update-messagebox", function ipcMainHandleURLInput(e, options) {
    return windowCreator.createUpdateMessagebox(mainWindow, ...options, updateMessageBoxCloseCallback).onclose;
});
//#endregion IPC dialog for main window

//#endregion IPC Communication

//#region App-related events
/**
 * Load the files containing the translations for the interface.
 */
async function initializeLocalization() {
    logger.info("Initializing languages...");

    // Obtain the language to display
    const lang = store.has("language-iso") ?
        store.get("language-iso") :
        "DEFAULT";

    // Get the data file
    const langPath = path.join(app.getAppPath(), "resources", "lang");
    await localization.initLocalization({
        resourcesPath: langPath,
        language: lang,
    });

    logger.info("Languages initialized");
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async function appOnReady() {
    logger.info(`Application ready (version: ${app.getVersion()})`);

    // Wait for language initialization
    await initializeLocalization();

    logger.silly("Creating main window");
    mainWindow = windowCreator.createMainWindow(mainWindowCloseCallback).window;

    app.on("activate", function appOnActivate() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
            mainWindow = windowCreator.createMainWindow(mainWindowCloseCallback).window;
        }
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", function appOnWindowAllClosed() {
    logger.silly("Closing application");
    if (process.platform !== "darwin") app.quit();
});

app.on("second-instance", function appOnSecondInstance() {
    // Someone tried to run a second instance, we should focus our window.
    if(!mainWindow) return; // No window to focus on
    
    // Show and focus on the main window
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
});
//#endregion App-related events

//#region Window close callbacks
/**
 * Callback used to log the closure of the main window e to store the size.
 */
function mainWindowCloseCallback() {
    logger.silly("Closing main window");

    // Save the sizes of the window
    const size = mainWindow.getSize();
    store.set("main-width", size[0]);
    store.set("main-height", size[1]);

    // Check is the window is maximized
    store.set("main-maximized", mainWindow.isMaximized());
    mainWindow = null;
}

/**
 * Callback used to log the closure of a messagebox.
 */
function messageBoxCloseCallback() {
    logger.silly("Closing messagebox");
}

/**
 * Callback used to log the result of the update of a game.
 * @param {Boolean} finalized 
 */
function updateMessageBoxCloseCallback(finalized) {
    if (finalized) {
        logger.silly("Update finalized by the user");
    }
    else {
        logger.silly("Closing update window without finalizing the update");
    }
}
//#endregion Window close callbacks
