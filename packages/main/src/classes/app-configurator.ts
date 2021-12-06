// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Core modules
import path from "path";

// Public modules from npm
import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer";
import { CatchAll } from "@magna_shogun/catch-decorator";
import { app, BrowserWindow, protocol, shell } from "electron";
import { CancellationToken } from "electron-updater";

// Local modules
import * as localization from "../utility/localization";
import ehandler from "../utility/error-handling";
import shared from "../../../common/shared";
import EventManager from "./event-manager";
import { get } from "../utility/logging";
import Updater from "./updater";
import IPCHandler from "./ipc";

/**
 * Configure the application by setting its callbacks.
 */
export default class AppConfigurator {
  /**
   * Main logger for the application.
   */
  readonly #mlogger = get("main");

  /**
   * Handle the messages received on ipcMain.
   */
  readonly #ipc = new IPCHandler(this.#mlogger);

  /**
   * Handler for all events using `shared.appevents`.
   */
  readonly #emanager = new EventManager();

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

    // Manage the events through `shared.appevents`
    this.#emanager.initialize();

    // Scheme must be registered before the app is ready
    protocol.registerSchemesAsPrivileged([
      { scheme: "app", privileges: { secure: true, standard: true }}
    ]);

    // Set the callbacks for the app's events
    app.on("ready", () => {
      const handler = async () => await this.onReady.bind(this)();
      void handler();
    });
    app.on("window-all-closed", this.onWindowAllClosed.bind(this));
    app.on("activate", this.onActivate.bind(this));
    app.on("second-instance", this.onSecondInstance.bind(this));
    app.on("web-contents-created", this.onWebContentsCreated.bind(this));
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
    // Install VUEJS3 DevTools Extensions if in development mode
    if (shared.isDev) {
      await installExtension(VUEJS3_DEVTOOLS, {
        loadExtensionOptions: {
          allowFileAccess: true
        }
      });
    }

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

  @CatchAll(ehandler)
  private onWebContentsCreated(_e: Electron.Event, contents: Electron.WebContents) {
    contents.on("will-navigate", this.onContentWillNavigate);
    contents.setWindowOpenHandler(({ url }) => this.setWindowOpenHandlerForContent(url));
    contents.session.setPermissionRequestHandler((webContents, permission, callback) =>
      this.setPermissionRequestHandlerForContentSession(webContents, permission, callback)
    );
  }
  //#endregion App callbacks

  //#region WebContent
  /**
   * Block navigation to origins not on the allowlist.
   *
   * Navigation is a common attack vector. If an attacker can convince the app to navigate away
   * from its current page, they can possibly force the app to open web sites on the Internet.
   *
   * @see https://www.electronjs.org/docs/latest/tutorial/security#13-disable-or-limit-navigation
   */
  @CatchAll(ehandler)
  private onContentWillNavigate(event: Electron.Event, url: string) {
    // Do not use insecure protocols like HTTP.
    // See https://www.electronjs.org/docs/latest/tutorial/security#1-only-load-secure-content
    const allowedOrigins: ReadonlySet<string> = new Set<`https://${string}`>();
    const { origin, hostname } = new URL(url);

    // Permit live reload of index.html
    const isDevLocalhost = shared.isDev && hostname === "localhost";

    // Block navigation if necessary
    if (!allowedOrigins.has(origin) && !isDevLocalhost) {
      console.warn("Blocked navigating to an unallowed origin:", origin);
      event.preventDefault();
    }
  }

  /**
   * Hyperlinks to allowed sites open in the default browser.
   *
   * The creation of new `webContents` is a common attack vector. Attackers attempt to convince the app to create new windows,
   * frames, or other renderer processes with more privileges than they had before; or with pages opened that they couldn't open before.
   * You should deny any unexpected window creation.
   *
   * @see https://www.electronjs.org/docs/latest/tutorial/security#14-disable-or-limit-creation-of-new-windows
   * @see https://www.electronjs.org/docs/latest/tutorial/security#15-do-not-use-openexternal-with-untrusted-content
   */
  @CatchAll(ehandler)
  private setWindowOpenHandlerForContent(url: string): { action: "deny" } {
    const allowedOrigins: ReadonlySet<string> = new Set<`https://${string}`>([
      // Do not use insecure protocols like HTTP. https://www.electronjs.org/docs/latest/tutorial/security#1-only-load-secure-content
      "https://vitejs.dev",
      "https://github.com",
      "https://v3.vuejs.org"
    ]);
    const { origin } = new URL(url);
    if (allowedOrigins.has(origin)) {
      shell.openExternal(url);
    } else {
      console.warn(`Blocked the opening of an unallowed origin: ${origin}`);
    }
    return { action: "deny" };
  }

  /**
   * Block requested permissions not on the allowlist.
   *
   * @see https://www.electronjs.org/docs/latest/tutorial/security#5-handle-session-permission-requests-from-remote-content
   */
  @CatchAll(ehandler)
  private setPermissionRequestHandlerForContentSession(
    webContents: Electron.WebContents,
    permission: string,
    callback: (permissionGranted: boolean) => void
  ) {
    // Get origin of request
    const origin = new URL(webContents.getURL()).origin;

    // Create the map containing the permission for the allowed sites
    const allowedOriginsAndPermissions: Map<string, Set<string>> = new Map<
      `https://${string}`,
      Set<string>
    >([
      //['https://permission.site', new Set(['notifications', 'media'])],
    ]);

    // If necessary block the request
    if (allowedOriginsAndPermissions.get(origin)?.has(permission)) {
      callback(true);
    } else {
      console.warn(`${origin} requested permission for '${permission}', but was blocked.`);
      callback(false);
    }
  }
  //#endregion WebContent

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
}
