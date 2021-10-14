// Copyright (c) 2021 MillenniumEarl
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Core modules
import path from "path";

// Public modules from npm
import { app, BrowserWindow} from "electron";
import { autoUpdater } from "electron-updater";
import Store from "electron-store";

// Local modules
import * as logging from "./modules/logging";

// Initialize the loggers
logging.init();

// Get the loggers
const mainLogger = logging.get("app.main");

// Manage errors, warning and unhandled promises at application level
process.on("uncaughtException", (e) => {
    // If we reach this callback, something critically
    // wrong happended in the application and it is
    // necessary to terminate the process
    // See: https://nodejs.org/api/process.html#process_warning_using_uncaughtexception_correctly
    mainLogger.fatal(`This is a CRITICAL message, an uncaught error was throw in the main process and no handler where defined:\n${e}\nThe application will now be closed`);
    app.quit();
});
process.on("unhandledRejection", (reason, promise) => mainLogger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`));
process.on("warning", (warning) => mainLogger.warn(`${warning.name}: ${warning.message}\n${warning.stack ?? "No stack to display"}`));

//#region Global variables

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow: BrowserWindow | undefined;

// Global store, keep user-settings
const store = new Store();

// Databases used by the app
const gameStore = new GameDataStore(shared.gameDbPath);
const threadStore = new ThreadDataStore(shared.threadDbPath);
const updateStore = new GameDataStore(shared.updateDbPath);

// F95API Wrapper
const f95 = new F95Wrapper();

//#endregion Global variables

// Get a lock instance to prevent multiple instance from running
const instanceLock = app.requestSingleInstanceLock();

// There is another instance running, close this instance
if (!instanceLock) app.quit();

// Disable hardware acceleration for better performance
// as we don't use animations. 
// Fix also strange graphical artifacts
app.disableHardwareAcceleration();

//#region App-related events
/**
 * Check for app updates.
 */
function checkUpdates() {
    mainLogger.info("Checking updates...");

    updater.check({
        onError: function(err) {
            logger.error(`Error during update check: ${err.message}\n${err.stack}`);
        },
        onUpdateDownloaded: async (info) => {
            logger.info(`Update ${info.releaseName} downloaded and ready for installation`);
            const cleanNotes = info.releaseNotes.replace(/<\/?[^>]+(>|$)/gu, "").replace(/\s\s+/gu, " ").trim();
            const message = process.platform !== "linux" ?
                localization.getTranslation("update-message-windarwin", {
                    notes: cleanNotes
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
    mainLogger.info("Initializing languages...");

    // Obtain the language to display
    const lang = store.has("language-iso") ?
        store.get("language-iso") :
        "DEFAULT";

    // Get the data file
    const langPath = path.join(app.getAppPath(), "resources", "lang");
    await localization.initLocalization(langPath, lang);

    mainLogger.info(`Languages initialized (selected ${lang})`);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
    mainLogger.info(`Application ready (${app.getVersion()}) on ${process.platform} (${process.getSystemVersion()})`);
    mainLogger.info(`Using Chrome ${process.versions.chrome}`);
    mainLogger.info(`Using Electron ${process.versions.electron}`);

    // Wait for language initialization
    await initializeLocalization()
    .catch(e => reportError(e, "30002", "initializeLocalization", "appOnReady"));

    mainLogger.info("Creating main window");
    mainWindow = windowCreator.createMainWindow(mainWindowCloseCallback).window;

    // Check updates
    checkUpdates();

    app.on("activate", () => {
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
    mainLogger.info("Closing application");
    if (process.platform !== "darwin") app.quit();
});

app.on("second-instance", function appOnSecondInstance() {
    mainLogger.info("Trying to open a second instance");
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
