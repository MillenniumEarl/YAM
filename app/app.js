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
const { run } = require("./src/scripts/io-operations.js");
const shared = require("./src/scripts/classes/shared.js");
const localization = require("./src/scripts/localization.js");

// Manage unhandled errors
process.on("uncaughtException", function (error) {
    logger.error(`Uncaught error in the main process.\n${error}`);
});

//#region Global variables
const baseColor = "#262626";
const preloadDir = path.join(app.getAppPath(), "app", "electron");
const htmlDir = path.join(app.getAppPath(), "app", "src");
const appIcon = path.join(app.getAppPath(), "resources", "images", "icon.ico");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow, loginWindow, messageBox;

// Variable used to close the main windows
let closeMainWindow = false;

// Global store, keep user-settings
const store = new Store();

//#endregion Global variables

//#region Windows creation methods
/**
 * @private
 * Create a simple window.
 * @param {Object.<string, number>} size Default size of the window
 * @param {Object.<string, number>} minSize Minimum size of the window
 * @param {Boolean} hasFrame Set if the window has a non-Chrome contourn
 * @param {BrowserWindow} parent Parent window for modal dialog
 * @param {String} preloadPath Path to the preload script
 */
function createWindow(size, minSize, preloadPath, hasFrame, parent) {
    // Create the browser window.
    const w = new BrowserWindow({
        // Set window size
        width: size.width,
        height: size.height,
        minWidth: minSize.width,
        minHeight: minSize.height,
        useContentSize: true,

        // Set "style" settings
        icon: appIcon,
        backgroundColor: baseColor, // Used to simulate loading and not make the user wait
        frame: hasFrame !== undefined ? hasFrame : true,

        // Set window behaviour
        parent: parent !== undefined ? parent : null,
        modal: parent !== undefined,

        // Set security settings
        webPreferences: {
            allowRunningInsecureContent: false,
            worldSafeExecuteJavaScript: true,
            enableRemoteModule: false,
            contextIsolation: true,
            webSecurity: true,
            nodeIntegration: false,
            preload: preloadPath,
        },
    });
    
    // Show the window when is fully loaded (set the listener)
    w.webContents.on("did-finish-loading", function () {
        w.show();
    });

    return w;
}

/**
 * @private
 * Create the main window of the application.
 * @returns {BrowserWindow} The main window object
 */
function createMainWindow() {
    // Local variables
    const preload = path.join(preloadDir, "main-preload.js");

    // Set size
    const width = store.has("main-width") ? store.get("main-width") : 1024;
    const height = store.has("main-height") ? store.get("main-height") : 600;
    const size = {
        "width": width,
        "height": height,
    };
    const minSize = {
        "width": 1024,
        "height": 600,
    };

    // Create the browser window
    const w = createWindow(size, minSize, preload);

    // Detect if the user maximized the window in a previous session
    const maximize = store.has("main-maximized")
        ? store.get("main-maximized")
        : false;
    if (maximize) w.maximize();

    // Whatever URL the user clicks will open the default browser for viewing
    w.webContents.on("new-window", function mainWindowOnNewWindow(e, url) {
        e.preventDefault();
        shell.openExternal(url);
    });

    // When the user try to close the main window,
    // this method intercept the default behaviour
    // Used to save the game data in the GameCards
    w.on("close", function mainWindowOnClose(e) {
        if (w && !closeMainWindow) {
            e.preventDefault();
            closeMainWindow = true;
            w.webContents.send("window-closing");
        }
    });

    // Disable default menu
    if (!isDev) w.setMenu(null);

    // Load the index.html of the app.
    const htmlPath = path.join(htmlDir, "index.html");
    w.loadFile(htmlPath);

    return w;
}

/**
 * @private
 * Create the login window for the application.
 * @param {BrowserWindow} parent The parent window
 * @returns {BrowserWindow} The login window object
 */
function createLoginWindow(parent) {
    // Local variables
    const preload = path.join(preloadDir, "login-preload.js");

    // Set size
    const size = {
        width: 400,
        height: 250
    };

    // Create the browser window (minSize = size)
    const w = createWindow(size, size, preload, false, parent);

    // Set window properties
    w.setResizable(false);
    
    // Disable default menu
    if (!isDev) w.setMenu(null);

    // Load the html file
    const htmlPath = path.join(htmlDir, "login.html");
    w.loadFile(htmlPath);

    return w;
}

/**
 * @private
 * Create a messagebox with the specified parameters.
 * @param {BrowserWindow} parent The parent window
 * @param {String} type Select the icon of the messagebox between `info`/`warning`/`error`
 * @param {String} title Title of the window
 * @param {String} message Message of the window
 * @returns {BrowserWindow} The messagebox
 */
function createMessagebox(parent, type, title, message) {
    // Local variables
    const preload = path.join(preloadDir, "messagebox-preload.js");

    // Set size
    const size = {
        width: 450,
        height: 150
    };

    // Create the browser window (minSize = size)
    const w = createWindow(size, size, preload, false, parent);

    // Set window properties
    w.setResizable(false);

    // Disable default menu
    if (!isDev) w.setMenu(null);

    w.webContents.once("dom-ready", () => {
        w.webContents.send("messagebox-arguments", type, title, message);
        ipcMain.once("messagebox-resize", (e, args) => {
            w.setSize(args[0], args[1], false);
            w.center();
        });
    });

    // Load the html file
    const htmlPath = path.join(htmlDir, "messagebox.html");
    w.loadFile(htmlPath);

    return w;
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
    } else loginWindow = createLoginWindow(mainWindow);
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
    logger.silly("Closing login window");
    loginWindow.close();
    loginWindow = null;
});

// Called when a messagebox is closed
ipcMain.on("messagebox-closing", function ipcMainOnMessageboxClosing() {
    logger.silly("Closing messagebox");
    messageBox.close();
    messageBox = null;
});

// Called when the main window require a new messagebox
ipcMain.on("require-messagebox", function ipcMainOnRequireMessagebox(e, args) {
    messageBox = createMessagebox(mainWindow, ...args);
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

    logger.silly("Creating main window");
    mainWindow = createMainWindow();

    app.on("activate", function appOnActivate() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow();
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
