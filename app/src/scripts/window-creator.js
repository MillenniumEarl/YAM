"use strict";

// Core modules
const path = require("path");

// Public modules from npm
const {
    app,
    BrowserWindow,
    shell,
} = require("electron");
const isDev = require("electron-is-dev");
const Store = require("electron-store");

// Global variables
const BASE_COLOR = "#262626";
const APP_PATH = app.getAppPath();
const PRELOAD_DIR = path.join(APP_PATH, "app", "electron");
const HTML_DIR = path.join(APP_PATH, "app", "src");
const APP_ICON = path.join(APP_PATH, "resources", "images", "icon.ico");

// Global store, keep user-settings
const store = new Store();

//#region Public methods
/**
 * @public
 * Create the main window of the application.
 * @param {Function} onclose Callback executed when the window is closed
 * @returns Window created and promise fulfilled when the window is closed
 */
module.exports.createMainWindow = function (onclose) {
    // Local variables
    const preload = path.join(PRELOAD_DIR, "main", "main-preload.js");

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
    const w = createBaseWindow({
        size: size,
        minSize: minSize,
        preloadPath: preload,
        onclose: onclose
    });

    // Detect if the user maximized the window in a previous session
    const maximize = store.has("main-maximized") ?
        store.get("main-maximized") :
        false;
    if (maximize) w.window.maximize();

    // Whatever URL the user clicks will open the default browser for viewing
    w.window.webContents.on("new-window", function mainWindowOnNewWindow(e, url) {
        e.preventDefault();
        shell.openExternal(url);
    });

    // Disable default menu
    if (!isDev) w.window.setMenu(null);

    // Load the index.html of the app.
    const htmlPath = path.join(HTML_DIR, "index.html");
    w.window.loadFile(htmlPath);

    return w;
};

/**
 * @public
 * Create the login window for the application.
 * @param {BrowserWindow} parent The parent window
 * @param {Function} onclose Callback executed when the window is closed
 * @returns Window created and promise fulfilled when the window is closed
 */
module.exports.createLoginWindow = function (parent, onclose) {
    // Local variables
    const preload = path.join(PRELOAD_DIR, "login", "login-preload.js");

    // Set size
    const size = {
        width: 400,
        height: 250
    };

    // Create the browser window (minSize = size)
    const w = createBaseWindow({
        size: size,
        minSize: size,
        preloadPath: preload,
        hasFrame: false,
        parent: parent,
        onclose: onclose
    });

    // Set window properties
    w.window.setResizable(false);

    // Disable default menu
    if (!isDev) w.window.setMenu(null);

    // Load the html file
    const htmlPath = path.join(HTML_DIR, "login.html");
    w.window.loadFile(htmlPath);

    return w;
};

/**
 * @public
 * Create a messagebox with the specified parameters.
 * @param {BrowserWindow} parent The parent window
 * @param {String} type Select the icon of the messagebox between `info`/`warning`/`error`
 * @param {String} title Title of the window
 * @param {String} message Message of the window
 * @param {Function} onclose Callback executed when the window is closed
 * @returns Window created and promise fulfilled when the window is closed
 */
module.exports.createMessagebox = function (parent, type, title, message, onclose) {
    // Local variables
    const preload = path.join(PRELOAD_DIR, "messagebox", "messagebox-preload.js");

    // Set size
    const size = {
        width: 450,
        height: 150
    };

    // Create the browser window (minSize = size)
    const w = createBaseWindow({
        size: size,
        minSize: size,
        preloadPath: preload,
        hasFrame: false,
        parent: parent,
        onclose: onclose
    });

    // Set window properties
    w.window.setResizable(false);

    // Disable default menu
    if (!isDev) w.window.setMenu(null);

    // adapt size to content
    w.window.webContents.once("dom-ready", () => {
        w.window.webContents.send("messagebox-arguments", type, title, message);
    });

    // Load the html file
    const htmlPath = path.join(HTML_DIR, "messagebox.html");
    w.window.loadFile(htmlPath);

    return w;
};

/**
 * @public
 * Create a URL input messagebox.
 * @param {BrowserWindow} parent The parent window
 * @param {Function} onclose Callback executed when the window is closed
 * @returns Window created and promise fulfilled when the window is closed
 */
module.exports.createURLInputbox = function(parent, onclose) {
    // Local variables
    const preload = path.join(PRELOAD_DIR, "url-input", "url-input-preload.js");

    // Set size
    const size = {
        width: 450,
        height: 150
    };

    // Create the browser window (minSize = size)
    const w = createBaseWindow({
        size: size,
        minSize: size,
        preloadPath: preload,
        hasFrame: false,
        parent: parent,
        onclose: onclose
    });
    
    // Set window properties
    w.window.setResizable(false);

    // Disable default menu
    if (!isDev) w.window.setMenu(null);

    // Load the html file
    const htmlPath = path.join(HTML_DIR, "url-input.html");
    w.window.loadFile(htmlPath);

    return w;
};

/**
 * @public
 * Create a messagebox with the specified parameters used for the game update.
 * @param {BrowserWindow} parent The parent window
 * @param {String} title Name of the game
 * @param {String} version New version of the game
 * @param {String} changelog Changelog for the new version of the game
 * @param {String} url URL to the F95Zone thread of the game
 * @param {String} folder Path to folder containing the game
 * @param {Function} onclose Callback executed when the window is closed
 * @returns Window created and promise fulfilled when the window is closed
 */
module.exports.createUpdateMessagebox = function (parent, title, version, changelog, url, folder, onclose) {
    // Local variables
    const preload = path.join(PRELOAD_DIR, "update-messagebox", "um-preload.js");

    // Set size
    const size = {
        width: 850,
        height: 500
    };

    // Create the browser window (minSize = size)
    const w = createBaseWindow({
        size: size,
        minSize: size,
        preloadPath: preload,
        hasFrame: false,
        parent: parent,
        onclose: onclose
    });

    // Set window properties
    w.window.setResizable(false);

    // Disable default menu
    if (!isDev) w.window.setMenu(null);

    // adapt size to content
    w.window.webContents.once("dom-ready", () => {
        w.window.webContents.send("um-arguments", title, version, changelog, url, folder);
    });

    // Load the html file
    const htmlPath = path.join(HTML_DIR, "update-messagebox.html");
    w.window.loadFile(htmlPath);

    return w;
};
//#endregion Public methods

//#region Private methods
/**
 * @private
 * Create a simple window.
 * @param {Object} options Options used for creating windows
 * @param {Object.<string, number>} options.size Default size of the window
 * @param {Object.<string, number>} options.minSize Minimum size of the window
 * @param {String} options.preloadPath Path to the preload script
 * @param {Boolean} [options.hasFrame] Set if the window has a non-Chrome contourn
 * @param {BrowserWindow} [options.parent] Parent window for modal dialog
 * @param {Function} [options.onclose] Callback executed when the window is closed. It receives a return value from the window as the only parameter
 * @returns The created window and a promise fulfilled when the window is closed
 */
function createBaseWindow(options) {
    // Create the browser window.
    const w = new BrowserWindow({
        // Set window size
        width: options.size.width,
        height: options.size.height,
        minWidth: options.minSize.width,
        minHeight: options.minSize.height,
        useContentSize: true,

        // Set "style" settings
        icon: APP_ICON,
        backgroundColor: BASE_COLOR, // Used to simulate loading and not make the user wait
        frame: options.hasFrame !== undefined ? options.hasFrame : true,

        // Set window behaviour
        parent: options.parent !== undefined ? options.parent : null,
        modal: options.parent !== undefined,

        // Set security settings
        webPreferences: {
            allowRunningInsecureContent: false,
            worldSafeExecuteJavaScript: true,
            enableRemoteModule: false,
            contextIsolation: true,
            webSecurity: true,
            nodeIntegration: false,
            preload: options.preloadPath,
        },
    });

    // Show the window when is fully loaded (set the listener)
    w.webContents.on("did-finish-load", () => w.show());

    const promiseOnClose = new Promise((resolve) => {
        // Intercept ipc messages for window command
        w.webContents.on("ipc-message", function ipcMessage(e, channel, args) {
            switch (channel) {
            case "window-resize":
                w.setSize(args[0], args[1], false);
                w.center();
                break;
            case "window-close":
                // Assign the function to be performed 
                // when the window is closed (via IPC message)
                if (options.onclose) {
                    if (args[0]) options.onclose(args[0]);
                    else options.onclose();
                }

                // Closes the window explicitly
                w.close();
                if (args[0]) resolve(args[0]);
                else resolve();
                break;
            default:
                break;
            }
        });

        // Assign the function to perform when 
        // the window is closed (via standard button)
        if (options.onclose) {
            w.on("close", () => {
                options.onclose(null);
                resolve();
            });
        }
    });

    return {
        window: w,
        onclose: promiseOnClose,
    };
}
//#endregion Private methods