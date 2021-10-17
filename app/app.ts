// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Core modules
import path from "path";

// Public modules from npm
import "source-map-support/register";
import { app, BrowserWindow } from "electron";
import { CancellationToken } from "electron-updater";
import Store from "electron-store";

// Local modules
import * as logging from "./modules/utility/logging";
import ehandler from "./modules/utility/error-handling";
import * as localization from "./modules/utility/localization";
import WindowManager from "./modules/classes/window-manager";
import Updater from "./modules/classes/updater";

// Initialize the loggers
logging.init();

// Get the main logger
const mainLogger = logging.get("app.main");
mainLogger.level = "info";

//#region Process error's handlers
// Manage errors, warning and unhandled promises at application level
process.on("uncaughtException", (e) => {
  // If we reach this callback, something critically
  // wrong happended in the application and it is
  // necessary to terminate the process
  // See: https://nodejs.org/api/process.html#process_warning_using_uncaughtexception_correctly
  mainLogger.fatal(
    `This is a CRITICAL message, an uncaught error was throw in the main process and no handler where defined:\n${e}\nThe application will now be closed`
  );
  app.quit();
});
process.on("unhandledRejection", (reason, promise) =>
  mainLogger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`)
);
process.on("warning", (warning) =>
  mainLogger.warn(`${warning.name}: ${warning.message}\n${warning.stack ?? "No stack to display"}`)
);
//#endregion Process error's handlers

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
const wmanager = new WindowManager();

// Global store, keep user-settings
const store = new Store();

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
 * Check for app updates and, if present, ask the user to install it.
 */
async function checkUpdates() {
  // Create the updater and check for updates
  const u = new Updater();
  const hasUpdate = await u.check();

  // Check for update
  if (hasUpdate) {
    // Prepare a cancellation token
    const token = new CancellationToken();

    // Get the info and download the update
    //const info = await u.info();
    const downloadPromise = u.download(token);

    // Ask the user if he/she want to update
    // @todo SEND NOTIFICATION AND OPEN UPDATE TAB
    // const action = askUserWhatHeWantToDo(info);
    const action = "update";
    mainLogger.info(`User decided to: ${action.toUpperCase()}`);

    // Update or cancel the download
    if (action === "update") downloadPromise.then(() => u.install());
    else token.cancel();
  }
}

/**
 * Load the files containing the translations for the interface.
 */
async function initializeLocalization() {
  mainLogger.info("Initializing languages...");

  // Obtain the language to display
  const lang = store.get("language-iso", null) as string;

  // Get the data file
  const langPath = path.join(app.getAppPath(), "resources", "lang");
  await localization.initLocalization(langPath, lang);

  mainLogger.info(`Languages initialized (selected: ${lang ?? "SYSTEM"})`);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  mainLogger.info(
    `Application ready (${app.getVersion()}) on ${process.platform} (${process.getSystemVersion()})`
  );
  mainLogger.info(`Using Chrome ${process.versions.chrome}`);
  mainLogger.info(`Using Electron ${process.versions.electron}`);

  // Wait for language initialization
  await initializeLocalization().catch((e) => ehandler(e));

  // ****************************************
  //@todo
  const mainWindowCloseCallback = () => null;
  // ****************************************

  mainLogger.info("Creating main window");
  wmanager.createMainWindow(mainWindowCloseCallback);

  // Check updates
  await checkUpdates();

  app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      wmanager.createMainWindow(mainWindowCloseCallback);
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

  // Try to get the main window
  const w = wmanager.get("main");

  // Someone tried to run a second instance, we should focus our window.
  if (!w) return; // No window to focus on

  // Show and focus on the main window
  if (w.isMinimized()) w.restore();
  w.focus();
});
//#endregion App-related events
