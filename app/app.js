"use strict";

// Core modules
const path = require("path");
const fs = require("fs");

// Public modules from npm
const { app, BrowserWindow, ipcMain, dialog, autoUpdater } = require("electron");
const logger = require("electron-log");
const Store = require("electron-store");

// Modules from file
const { run, openLink } = require("./src/scripts/io-operations.js");
const shared = require("./src/scripts/classes/shared.js");
const localization = require("./src/scripts/localization.js");
const windowCreator = require("./src/scripts/window-creator.js");
const GameDataStore = require("./db/stores/game-data-store.js");
const ThreadDataStore = require("./db/stores/thread-data-store.js");
const updater = require("./src/scripts/updater.js");

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

// Databases used by the app
const gameStore = new GameDataStore(shared.gameDbPath);
const threadStore = new ThreadDataStore(shared.threadDbPath);
const updateStore = new GameDataStore(shared.updateDbPath);

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

// Return the app version
ipcMain.handle("app-version", function ipcMainHandleVersionRequest() {
    return app.getVersion();
});

// Return the OS-based application data directory
ipcMain.handle("user-data", function ipcOnUserData() {
    return app.getPath("userData");
});

// Manage DB operations
ipcMain.handle("database-operation", function ipcMainOnDBOp(e, db, op, args) {
    let selectedDB = null;
    if(db === "game") selectedDB = gameStore;
    else if (db === "thread") selectedDB = threadStore;
    else if (db === "update") selectedDB = updateStore;
    else throw Error(`Database not recognized: ${db}`);

    // Esecute the operation
    return executeDbQuery(selectedDB, op, args);
});

//#region Database Operations
/**
 * @private
 * Performs an operation on the database and returns the results.
 * @param {GameDataStore|ThreadDataStore} db 
 * Database on which to perform operations.
 * @param {String} operation 
 * Operation to be performed among the following:
 * `insert`, `delete`, `read`, `write`, `search`, `count`
 * @param {Object} args 
 * Arguments to pass to the database
 * @param {GameInfo|ThreadInfo} [args.data]
 * Data to be saved in the database. Used with `insert` and `write`
 * @param {Number} [args.id] 
 * ID of a record in the database. Used with `read` and `delete`
 * @param {Object} [args.query] 
 * Query to use in the database. Used with `search` and `count`
 * @param {Object} [args.sortQuery] 
 * Query used to sort the results. Used with `search`
 * @param {Object} [args.pagination]
 * Object containing the data for paging the results. Used with `search`
 * @param {Number} [args.pagination.index]
 * Index of the page to prepare
 * @param {Number} [args.pagination.size]
 * Size of each page
 * @param {Number} [args.pagination.limit]
 * Max number of element in the results
 * @returns {Promise<Any>} Results of the query
 */
async function executeDbQuery(db, operation, args) {
    // Prepare the order query for the "search" operation
    const orderQuery = args.sortQuery ? args.sortQuery : {};

    // Execute the operation on the database
    switch (operation) {
    case "insert":
        if (!args.data) throw Error(`Invalid argument for '${operation}'`);
        return await db.insert(args.data);
    case "delete":
        if (!args.id) throw Error(`Invalid argument for '${operation}'`);
        return await db.delete(args.id);
    case "read":
        if (!args.id) throw Error(`Invalid argument for '${operation}'`);
        return await db.read(args.id);
    case "write":
        if (!args.data) throw Error(`Invalid argument for '${operation}'`);
        return await db.write(args.data);
    case "search":
        if (!args.query) throw Error(`Invalid argument for '${operation}'`);
        if (args.pagination) 
            return await db.search(args.query, 
                args.pagination.index, 
                args.pagination.size, 
                args.pagination.limit, 
                orderQuery);
        else return await db.search(args.query);
    case "count":
        if (!args.query) throw Error(`Invalid argument for '${operation}'`);
        return await db.count(args.query);
    default:
        throw Error(`Operation not recognized: ${operation}`);
    }
}
//#endregion Database Operations

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

ipcMain.handle("database-paths", function ipcMainOnHandleDatabasePaths() {
    return {
        games: shared.gameDbPath,
        threads: shared.threadDbPath,
        updates: shared.updateDbPath,
    };
});
//#endregion shared app variables

//#region IPC dialog for main window
// Called when the main window require a new messagebox
ipcMain.handle("require-messagebox", function ipcMainOnRequireMessagebox(e, args) {
    return windowCreator.createMessagebox(mainWindow, ...args, messageBoxCloseCallback).onclose;
});

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
 * @private
 * Check for app updates.
 */
function checkUpdates() {
    updater.check({
        onError: function(err) {
            logger.error(`Error during update check: ${err.message}\n${err.stack}`);
        },
        onUpdateDownloaded: async (event, releaseNotes, releaseName) => {
            const message = process.platform !== "linux" ?
                localization.getTranslation("update-message-windarwin", {
                    notes: releaseNotes
                }) :
                localization.getTranslation("update-message-linux");
            const args = {
                type: "info",
                title: localization.getTranslation("update-title", {
                    version: releaseName,
                }),
                message: message,
                buttons: ["update", "close"] 
            };
            const userSelection = await windowCreator.createMessagebox(mainWindow, args).onclose;

            // Quit and update the app
            if (userSelection.button === "update") {
                if (process.platform !== "linux") autoUpdater.quitAndInstall();
                else openLink("https://github.com/MillenniumEarl/YAM/releases");
            }
        }
    });
}

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
    await localization.initLocalization(langPath, lang);

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

    // Start checking for game updates
    checkUpdates();

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
