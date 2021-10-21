// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Core modules
import path from "path";

// Public modules from npm
import { app, BrowserWindow } from "electron";
import { CancellationToken } from "electron-updater";
import { CatchAll } from "@magna_shogun/catch-decorator";

// Local modules
import { get } from "../utility/logging";
import * as localization from "../utility/localization";
import Updater from "./updater";
import shared from "../shared";
import IPCHandler from "./ipc";
import ehandler from "../utility/error-handling";
import { IRendererLog } from "../interfaces";

/**
 * Configure the application by setting its callbacks.
 */
export default class AppConfigurator {
  /**
   * Main logger for the application.
   */
  readonly #mlogger = get("main");

  /**
   * Logger used by the renderer processes.
   */
  readonly #rlogger = get("renderer");

  /**
   * Handle the messages received on ipcMain.
   */
  readonly #ipc = new IPCHandler(this.#mlogger);

  /**
   * Initialize the class and the application.
   */
  @CatchAll(ehandler)
  public init() {
    // Get a lock instance to prevent multiple instance from running
    const instanceLock = app.requestSingleInstanceLock();

    // There is another instance running, close this instance
    if (!instanceLock) app.quit();

    // Disable hardware acceleration for better performance
    // as we don't use animations.
    // Fix also strange graphical artifacts
    app.disableHardwareAcceleration();

    // Set the callbacks for the app's events
    app.on("ready", () => {
      const handler = async () => await this.onReady.bind(this)();
      void handler();
    });
    app.on("window-all-closed", this.onWindowAllClosed.bind(this));
    app.on("activate", this.onActivate.bind(this));
    app.on("second-instance", this.onSecondInstance.bind(this));

    // Manage the events through `shared.appevents`
    this.manageGenericSharedEvents();
  }

  //#region App callbacks
  /**
   * Quit when all windows are closed, except on macOS. There, it's common
   * for applications and their menu bar to stay active until the user quits
   * explicitly with Cmd + Q.
   */
  @CatchAll(ehandler)
  private onWindowAllClosed() {
    this.#mlogger.info("Closing application");
    if (process.platform !== "darwin") app.quit();
  }

  /**
   * On macOS it's common to re-create a window in the app when the
   * dock icon is clicked and there are no other windows open.
   */
  @CatchAll(ehandler)
  private onActivate() {
    if (BrowserWindow.getAllWindows().length === 0) this.createMainWindow();
  }

  /**
   * This method will be called when Electron has finished
   * initialization and is ready to create browser windows.
   * Some APIs can only be used after this event occurs.
   */
  @CatchAll(ehandler)
  private async onReady() {
    this.#mlogger.info(
      `Application ready (${app.getVersion()}) on ${
        process.platform
      } (${process.getSystemVersion()})`
    );
    this.#mlogger.info(`Using Chrome ${process.versions.chrome}`);
    this.#mlogger.info(`Using Electron ${process.versions.electron}`);

    // Wait for language initialization
    //await this.initializeLocalization();

    // Create main window
    this.#mlogger.info("Creating main window");
    this.createMainWindow();

    // Check updates
    await this.checkUpdates();
  }

  @CatchAll(ehandler)
  private onSecondInstance() {
    this.#mlogger.info("Trying to open a second instance");

    // Try to get the main window
    const w = shared.wmanager.get("main");

    // Someone tried to run a second instance, we should focus our window.
    if (!w) return; // No window to focus on

    // Show and focus on the main window
    if (w.isMinimized()) w.restore();
    w.focus();
  }
  //#endregion App callbacks

  //#region Utility
  /**
   * Create the main window of this application.
   */
  private createMainWindow() {
    // ****************************************
    //@todo
    const mainWindowCloseCallback = () => null;
    // ****************************************

    void shared.wmanager.createMainWindow(mainWindowCloseCallback);
  }

  /**
   * Check for app updates and, if present, ask the user to install it.
   */
  @CatchAll(ehandler)
  private async checkUpdates() {
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
      this.#mlogger.info(`User decided to: ${action.toUpperCase()}`);

      // Update or cancel the download
      if (action === "update") downloadPromise.then(() => u.install()).catch(ehandler);
      else token.cancel();
    }
  }

  /**
   * Load the files containing the translations for the interface.
   */
  @CatchAll(ehandler)
  private async initializeLocalization() {
    this.#mlogger.info("Initializing languages...");

    // Obtain the language to display
    const lang = shared.store.get("language-iso", null) as string;

    // Get the data file
    const langPath = path.join(app.getAppPath(), "resources", "lang");
    await localization.initLocalization(langPath, lang);

    this.#mlogger.info(`Languages initialized (selected: ${lang ?? "SYSTEM"})`);
  }
  //#endregion Utility

  //#region Private methods
  private manageGenericSharedEvents() {
    shared.appevents.addListener("renderer-log", (data: IRendererLog) => {
      const map = {
        info: (message: string) => this.#rlogger.info(message),
        warn: (message: string) => this.#rlogger.warn(message),
        error: (message: string) => this.#rlogger.error(message)
      };

      map[data.type](`[From ${data.wname}] ${data.message}`);
      const x = 0;
    });
  }
  //#endregion
}
