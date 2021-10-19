// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Core modules
import path from "path";

// Public modules from npm
import { BrowserWindow, shell, clipboard } from "electron";
import { CatchAll } from "@magna_shogun/catch-decorator";
import isDev from "electron-is-dev";

// Modules from files
import { Paths, Colors, WindowMinimumSize } from "../constants";
import { TCloseWindowCallbackRest, TCloseWindowCallbackNull } from "../types";
import { IWindowData, IWindowOptions } from "../interfaces";
import ehandler from "../utility/error-handling";
import shared from "../shared";

export default class WindowManager {
  //#region Properties
  /**
   * List of windows open in the application.
   */
  #WindowsList: Record<string, IWindowData> = {};
  //#endregion Properties

  //#region Public methods
  /**
   * Get the window with the given name.
   *
   * If it doesn't exists, return `null`
   */
  // eslint-disable-next-line no-unused-vars
  public get(name: string): BrowserWindow | null;
  /**
   * Get the window with the given ID.
   *
   * If it doesn't exists, return `null`
   */
  // eslint-disable-next-line no-unused-vars
  public get(id: number): BrowserWindow | null;
  @CatchAll(ehandler)
  public get(arg: string | number): BrowserWindow | null {
    // Found window
    let window = null;

    if (typeof arg === "string") {
      // Get window by name
      window = this.#WindowsList[arg].window ?? null;
    } else if (typeof arg === "number") {
      // Get all the windows
      const windows = Object.values(this.#WindowsList).map((wd) => wd.window);

      // Search for the specified ID
      window = windows.find((w) => w.id === arg) ?? null;
    }

    return window;
  }

  /**
   * Get the name of a given window (if it was created with this manager).
   */
  public getName(w: BrowserWindow): string | null {
    const name = Object.entries(this.#WindowsList)
      .map(([name, wd]) => {
        if (wd.window.id === w.id) return name;
      })
      .filter((e) => !!e)
      .shift();

    return name ?? null;
  }

  /**
   * Create the main window of the application.
   * @param onclose Callback executed when the window is closed
   * @returns Window created and promise fulfilled when the window is closed
   */
  @CatchAll(ehandler)
  public createMainWindow(onclose: TCloseWindowCallbackRest | TCloseWindowCallbackNull) {
    // Local variables
    const preload = path.join(Paths.WINDOWS_SCRIPTS_PATH, "main", "preload.js");

    // Set size
    const width = shared.store.get("main-width", WindowMinimumSize.MAIN.width);
    const height = shared.store.get("main-height", WindowMinimumSize.MAIN.height);
    const size = {
      width: width as number,
      height: height as number
    };

    // Create the browser window
    const onClosePromise = this.createBaseWindow({
      name: "main",
      size: size,
      minSize: WindowMinimumSize.MAIN,
      preloadPath: preload,
      onclose: onclose,
      args: {
        menubar: shared.store.get("menubar", false),
        "open-copy-links": shared.store.get("open-links-in-default-browser", true)
      }
    });
    const w = this.get("main") as BrowserWindow;

    // Detect if the user maximized the window in a previous session
    const maximize = shared.store.get("main-maximized", false);
    if (maximize) w.maximize();

    // Whatever URL the user clicks will open the default browser for viewing
    // or copy the URL to clipboard
    w.webContents.setWindowOpenHandler((details) => {
      // Detect the choice of the user
      const openLink = shared.store.get("open-links-in-default-browser", true);

      // Open URL in default browser
      if (openLink) shell.openExternal(details.url);
      // Copy URL to clipboard
      else clipboard.writeText(details.url, "selection");

      // Deny new window
      return { action: "deny" };
    });

    // Load the index.html of the app.
    const htmlPath = path.join(Paths.WINDOWS_HTML_PATH, "main.html");
    w.loadFile(htmlPath);

    return onClosePromise;
  }
  //#endregion Public methods

  //#region Private methods
  /**
   * Create a simple window
   * @returns The created window and a promise fulfilled when the window is closed
   */
  @CatchAll(ehandler)
  private createBaseWindow(options: IWindowOptions) {
    // Create the browser window.
    const bw = new BrowserWindow({
      // Set window size
      width: options.size.width,
      height: options.size.height,
      ...(options.minSize && {
        minWidth: options.minSize.width,
        minHeight: options.minSize.height
      }),
      ...(options.maxSize && {
        maxWidth: options.maxSize.width,
        maxHeight: options.maxSize.height
      }),
      useContentSize: true,

      // Set "style" settings
      icon: Paths.APP_ICON,
      backgroundColor: Colors.BASE, // Used to simulate loading and not make the user wait
      frame: options.hasFrame ?? true,

      // Set window behaviour
      parent: options.parent,
      modal: !!options.parent,

      // Set security settings
      webPreferences: {
        allowRunningInsecureContent: false,
        contextIsolation: true,
        webSecurity: true,
        nodeIntegration: false,
        preload: options.preloadPath
      }
    });

    // Save the window in the list and reload
    this.#WindowsList[options.name] = {
      window: bw,
      options: options
    };
    const w = this.#WindowsList[options.name].window;

    // Disable default menu
    const enableMenuBar = shared.store.has(`menubar-${options.name}`) ?? false;
    w.setMenuBarVisibility(isDev || enableMenuBar);

    //#region Window WebContent messages
    // Show the window when is fully loaded (set the listener)
    w.webContents.on("did-finish-load", () => w.show());

    // Send custom arguments to window when ready
    w.webContents.once("dom-ready", () => {
      if (options.args) {
        w.webContents.send("window-arguments", options.args);
      }
    });

    // Send notification and new size when user resize window
    w.on("resize", () => {
      const size = w.getSize();
      w.webContents.send("window-resized", size);
    });

    // Intercept ipc messages for window command
    w.webContents.on("ipc-message", (_e, channel, args) =>
      this.windowIPCHandler(this.#WindowsList[options.name], channel, args)
    );
    //#endregion Window WebContent messages

    return options.onclose ? this.createClosePromise(w, options.onclose) : null;
  }

  /**
   * Create a new promise that resolves when the window closes.
   * @param window Window to associate the closing promise
   * @param onclose Callback to be executed on closing
   */
  @CatchAll(ehandler)
  private createClosePromise(
    window: BrowserWindow,
    onclose: TCloseWindowCallbackRest | TCloseWindowCallbackNull
  ) {
    return new Promise((resolve) => {
      // Local variables
      let closeWithIPC = false;

      window.webContents.on("ipc-message", (e, channel, args) => {
        if (channel === "window-close") {
          // Assign the function to be performed
          // when the window is closed (via IPC message)
          if (onclose) {
            if (args) onclose(...args);
            else onclose();
          }

          // Closes the window explicitly
          closeWithIPC = true;
          window.close();

          // Resolve the promise
          resolve([...args] ?? null);
        }
      });

      // Assign the function to perform when
      // the window is closed (via standard button)
      window.on("close", () => {
        if (onclose && !closeWithIPC) {
          // Execute the callback
          onclose(null);

          // Resolve the close promise
          resolve(null);
        }
      });
    });
  }

  /**
   * Handles IPC messages arriving from the window (excluding the closing ones).
   */
  @CatchAll(ehandler)
  private windowIPCHandler(w: IWindowData, channel: string, args: any[]) {
    const resize = () => {
      // Destructure the size and check for min/max size
      let [width, height] = args;
      if (w.options.minSize) {
        width = Math.max(width, w.options.minSize.width);
        height = Math.max(height, w.options.minSize.height);
      }

      if (w.options.maxSize) {
        width = Math.min(width, w.options.maxSize.width);
        height = Math.min(height, w.options.maxSize.height);
      }

      // Set the size
      w.window.setSize(width, height);
    };

    const size = () => {
      const size = w.window.getSize();
      w.window.webContents.send("window-size", size);
    };

    const center = () => w.window.center();

    // Create a function map
    const map: Record<string, () => void> = {
      "window-resize": resize,
      "window-size": size,
      "window-center": center
    };

    const validChannel = Object.keys(map).includes(channel);
    if (validChannel) map[channel]();
  }
  //#endregion Private methods
}

//#region Legacy
// /**
//  * @public
//  * Create the login window for the application.
//  * @param {BrowserWindow} parent The parent window
//  * @param {Function} onclose Callback executed when the window is closed
//  * @returns Window created and promise fulfilled when the window is closed
//  */
// module.exports.createLoginWindow = function (parent, onclose) {
//   // Local variables
//   const preload = path.join(PRELOAD_DIR, "login", "login-preload.js");

//   // Set size
//   const size = {
//     width: 400,
//     height: 250
//   };

//   // Create the browser window (minSize = size)
//   const w = createBaseWindow({
//     size: size,
//     minSize: size,
//     preloadPath: preload,
//     hasFrame: false,
//     parent: parent,
//     onclose: onclose
//   });

//   // Set window properties
//   if (!isDev) w.window.setResizable(false);

//   // Load the html file
//   const htmlPath = path.join(HTML_DIR, "login.html");
//   w.window.loadFile(htmlPath);

//   return w;
// };

// /**
//  * @public
//  * Create a messagebox with the specified parameters.
//  * @param {BrowserWindow} parent The parent window
//  * @param {Object} args Arguments to pass to the window
//  * @param {String} args.type Select the icon of the messagebox between `info`/`warning`/`error`
//  * @param {String} args.title Title of the window
//  * @param {String} args.message Message of the window
//  * @param {Function} [onclose] Callback executed when the window is closed
//  * @returns Window created and promise fulfilled when the window is closed
//  */
// module.exports.createMessagebox = function (parent, args, onclose) {
//   // Local variables
//   const preload = path.join(PRELOAD_DIR, "messagebox", "messagebox-preload.js");

//   // Set size
//   const size = {
//     width: 450,
//     height: 230
//   };

//   const maxSize = {
//     width: 700,
//     height: 500
//   };

//   // Create the browser window (minSize = size)
//   const w = createBaseWindow({
//     size: size,
//     minSize: size,
//     maxSize: maxSize,
//     preloadPath: preload,
//     hasFrame: false,
//     parent: parent,
//     args: args,
//     onclose: onclose
//   });

//   // Set window properties
//   if (!isDev) w.window.setResizable(false);

//   // Load the html file
//   const htmlPath = path.join(HTML_DIR, "messagebox.html");
//   w.window.loadFile(htmlPath);

//   return w;
// };

// /**
//  * @public
//  * Create a URL input messagebox.
//  * @param {BrowserWindow} parent The parent window
//  * @param {Function} onclose Callback executed when the window is closed
//  * @returns Window created and promise fulfilled when the window is closed
//  */
// module.exports.createURLInputbox = function (parent, onclose) {
//   // Local variables
//   const preload = path.join(PRELOAD_DIR, "url-input", "url-input-preload.js");

//   // Set size
//   const size = {
//     width: 450,
//     height: 150
//   };

//   // Create the browser window (minSize = size)
//   const w = createBaseWindow({
//     size: size,
//     minSize: size,
//     preloadPath: preload,
//     hasFrame: false,
//     parent: parent,
//     onclose: onclose
//   });

//   // Set window properties
//   if (!isDev) w.window.setResizable(false);

//   // Load the html file
//   const htmlPath = path.join(HTML_DIR, "url-input.html");
//   w.window.loadFile(htmlPath);

//   return w;
// };
//#endregion Legacy
