"use strict";

// Core modules
const path = require("path");
const fs = require("fs");

// Public modules from npm
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const logger = require("electron-log");
const Store = require("electron-store");

// Modules from file
const { run, openLink, readFileSync} = require("./src/scripts/io-operations.js");
const shared = require("./src/scripts/classes/shared.js");
const RecommendationEngine = require("./src/scripts/classes/recommendation-engine.js");
const localization = require("./src/scripts/localization.js");
const windowCreator = require("./src/scripts/window-creator.js");
const GameDataStore = require("./db/stores/game-data-store.js");
const ThreadDataStore = require("./db/stores/thread-data-store.js");
const updater = require("./src/scripts/updater.js");
const reportError = require("./src/scripts/error-manger.js").reportError;

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

// Global reference to the engine, it needs F95Zone credentials 
// so it will be initialized after the user login and at the first
// call
let recEngine = null;

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
ipcMain.on("exec", function ipcMainOnExec(e, args) {
    const filepath = [...args][0];
    logger.info(`Executing ${filepath}`);
    
    // Create and run child
    const child = run(filepath);

    // Write log on child error
    child.stderr.on("data", (data) => {
        logger.error(`Error running ${filepath}: ${data}`);
    });
});

// Open the directory path/URL in the default manner
ipcMain.on("open-link", function ipcMainOnOpenLink(e, args) {
    const link = [...args][0];
    logger.info(`Opening ${link}`);

    // Open link
    openLink(link).catch(e => reportError(e, "30000", "openLink", "ipcMainOnOpenLink", `Link: ${link}`));
});

// Close the application
ipcMain.on("app-quit", function ipcMainOnAppQuit() {
    logger.info("Closing application on IPC request");
    app.quit();
});

// Return the current root dir path (Current Working Directory)
ipcMain.handle("cwd", function ipcMainOnCWD() {
    return app.getAppPath();
});

// Return the app version
ipcMain.handle("app-version", function ipcMainHandleVersionRequest() {
    return app.getVersion();
});

// Return the OS-based application data directory
ipcMain.handle("user-data", function ipcOnUserData() {
    return app.getPath("userData");
});

//#region Recommendation engine
/**
 * @private
 * Load the credentials from disk.
 * @return {Promise<Object.<string, string>>}
 */
function getCredentials() {
    // Parse credentials
    const json = readFileSync(shared.credentialsPath);
    return json ? JSON.parse(json) : null;
}

/**
 * @private
 * Initialize the recommendation engine.
 */
function initializeRecommendationEngine() {
    // Load credentials
    const credentials = getCredentials();

    // Initialize engine
    if(credentials) recEngine = new RecommendationEngine(credentials, gameStore, threadStore);
    return credentials !== null;
}

// Return a list of recommended games
ipcMain.handle("recommend-games", async function ipcOnRecommendGames(e, limit) {
    if (!recEngine) {
        const initialized = initializeRecommendationEngine();
        if (!initialized) return [];
    }
    return await recEngine.recommend(limit);
});
//#endregion Recommendation engine

//#region Language
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
//#endregion Language

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
 * ID of a record in the database. Used with `read`
 * @param {Object} [args.query] 
 * Query to use in the database. Used with `search`, `count` and `delete`
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
    logger.silly(`Executing ${operation} on '${db}'`);
    
    // Prepare a dictionary of functions
    const operations = {
        insert: (args) => db.insert(args.data),
        delete: (args) => db.delete(args.query),
        read: (args) => db.read(args.id),
        write: (args) => db.write(args.data),
        count: (args) => db.count(args.query),
        search: (args) => {
            let promise = db.search(args.query);
            if (args.pagination) {
                promise = db.search(args.query,
                    args.pagination.index,
                    args.pagination.size,
                    args.pagination.limit,
                    args.sortQuery ?? {});
            } 
            return promise;
        },
    };

    // Verify the operation
    const validOperation = Object.keys(operations).includes(operation);
    if (!validOperation) throw Error(`Operation not recognized: ${operation}`);

    // Execute the operation on the database
    return await operations[operation](args);
}

/**
 * @private
 * Select a database given its name.
 * @param {String} name `game`, `thread`, `update`
 * @returns {GameDataStore|ThreadDataStore} Selected database
 */
function selectDatabase(name) {
    // Local variables
    const dbs = {
        game: gameStore,
        thread: threadStore,
        update: updateStore,
    };
    const validName = Object.keys(dbs).includes(name);

    // Check the name and return the store
    if (!validName) throw Error(`Database not recognized: ${name}`);
    return dbs[name];
}

// Manage DB operations
ipcMain.handle("database-operation", async function ipcMainOnDBOp(e, db, op, args) {
    // Select the database
    const selectedDB = selectDatabase(db);

    // Esecute the operation
    return executeDbQuery(selectedDB, op, args)
        .catch(e => reportError(e, "30001", "executeDbQuery", "ipcMainOnDBOp", `DB: ${db}, Operation: ${op}, Args: ${args}`));
});
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
ipcMain.handle("require-messagebox", function ipcMainOnRequireMessagebox(e, args) {
    logger.silly("Required messagebox");
    const destArgs = [...args][0];
    return windowCreator.createMessagebox(mainWindow, destArgs, messageBoxCloseCallback).onclose;
});

ipcMain.handle("message-dialog", function ipcMainHandleMessageDialog(e, options) {
    logger.silly("Required dialog");
    return dialog.showMessageBox(mainWindow, options[0]);
});

ipcMain.handle("open-dialog", function ipcMainHandleOpenDialog(e, options) {
    logger.silly("Required open-dialog");
    return dialog.showOpenDialog(mainWindow, options[0]);
});

ipcMain.handle("url-input", function ipcMainHandleURLInput() {
    logger.silly("Required url-input");
    return windowCreator.createURLInputbox(mainWindow).onclose;
});

ipcMain.handle("update-messagebox", function ipcMainHandleURLInput(e, options) {
    logger.silly("Required update-messagebox");
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
    logger.info("Checking updates...");
    
    updater.check({
        onError: function(err) {
            logger.error(`Error during update check: ${err.message}\n${err.stack}`);
        },
        onUpdateDownloaded: async (info) => {
            logger.info(`Update ${info.releaseName} downloaded and ready for installation`);
            const message = process.platform !== "linux" ?
                localization.getTranslation("update-message-windarwin", {
                    notes: decodeURIComponent(info.releaseNotes)
                }) :
                localization.getTranslation("update-message-linux");
            const args = {
                type: "info",
                title: localization.getTranslation("update-title", {
                    version: info.releaseName,
                }),
                message: message,
                buttons: [{name: "update"}, {name: "close"}] 
            };
            const userSelection = await windowCreator.createMessagebox(mainWindow, args).onclose;

            // Quit and update the app
            if (userSelection.button === "update") {
                logger.info("Performing update...");
                autoUpdater.quitAndInstall();
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

    logger.info(`Languages initialized (selected ${lang})`);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async function appOnReady() {
    logger.info(`Application ready (${app.getVersion()}) on ${process.platform} (${process.getSystemVersion()})`);
    logger.info(`Using Chrome ${process.versions.chrome}`);
    logger.info(`Using Electron ${process.versions.electron}`);

    // Wait for language initialization
    await initializeLocalization().catch(e => reportError(e, "30002", "initializeLocalization", "appOnReady"));

    logger.silly("Creating main window");
    mainWindow = windowCreator.createMainWindow(mainWindowCloseCallback).window;

    // Check updates
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
    logger.info("Trying to open a second instance");
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
