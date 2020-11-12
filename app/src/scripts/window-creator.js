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

// Variable used to close the main windows
let closeMainWindow = false;

//#region Public methods
/**
 * @public
 * Create the main window of the application.
 * @returns {BrowserWindow} The main window object
 */
module.exports.createMainWindow = function () {
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
    const w = createBaseWindow(size, minSize, preload);

    // Detect if the user maximized the window in a previous session
    const maximize = store.has("main-maximized") ?
        store.get("main-maximized") :
        false;
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
    const htmlPath = path.join(HTML_DIR, "index.html");
    w.loadFile(htmlPath);

    return w;
};

/**
 * @public
 * Create the login window for the application.
 * @param {BrowserWindow} parent The parent window
 * @returns {BrowserWindow} The login window object
 */
module.exports.createLoginWindow = function (parent) {
    // Local variables
    const preload = path.join(PRELOAD_DIR, "login", "login-preload.js");

    // Set size
    const size = {
        width: 400,
        height: 250
    };

    // Create the browser window (minSize = size)
    const w = createBaseWindow(size, size, preload, false, parent);

    // Set window properties
    w.setResizable(false);

    // Disable default menu
    if (!isDev) w.setMenu(null);

    // Load the html file
    const htmlPath = path.join(HTML_DIR, "login.html");
    w.loadFile(htmlPath);

    return w;
};

/**
 * @public
 * Create a messagebox with the specified parameters.
 * @param {BrowserWindow} parent The parent window
 * @param {String} type Select the icon of the messagebox between `info`/`warning`/`error`
 * @param {String} title Title of the window
 * @param {String} message Message of the window
 * @returns {BrowserWindow} The messagebox
 */
module.exports.createMessagebox = function (parent, type, title, message) {
    // Local variables
    const preload = path.join(PRELOAD_DIR, "messagebox", "messagebox-preload.js");

    // Set size
    const size = {
        width: 450,
        height: 150
    };

    // Create the browser window (minSize = size)
    const w = createBaseWindow(size, size, preload, false, parent);

    // Set window properties
    w.setResizable(false);

    // Disable default menu
    if (!isDev) w.setMenu(null);

    // adapt size to content
    w.webContents.once("dom-ready", () => {
        w.webContents.send("messagebox-arguments", type, title, message);
    });

    // Load the html file
    const htmlPath = path.join(HTML_DIR, "messagebox.html");
    w.loadFile(htmlPath);

    return w;
};

/**
 * @public
 * Create a URL input messagebox.
 * @param {BrowserWindow} parent The parent window
 * @returns {BrowserWindow} The URL input window object
 */
module.exports.createURLInputbox = function(parent) {
    // Local variables
    const preload = path.join(PRELOAD_DIR, "url-input", "url-input-preload.js");

    // Set size
    const size = {
        width: 450,
        height: 150
    };

    // Create the browser window (minSize = size)
    const w = createBaseWindow(size, size, preload, false, parent);
    
    // Set window properties
    w.setResizable(false);

    // Disable default menu
    if (!isDev) w.setMenu(null);

    // Load the html file
    const htmlPath = path.join(HTML_DIR, "url-input.html");
    w.loadFile(htmlPath);

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
 * @returns {BrowserWindow} The messagebox
 */
module.exports.createUpdateMessagebox = function (parent, title, version, changelog, url, folder) {
    // Local variables
    const preload = path.join(PRELOAD_DIR, "update-messagebox", "um-preload.js");

    // Set size
    const size = {
        width: 850,
        height: 500
    };

    // Create the browser window (minSize = size)
    const w = createBaseWindow(size, size, preload, false, parent);

    // Set window properties
    w.setResizable(false);

    // Disable default menu
    if (!isDev) w.setMenu(null);

    // adapt size to content
    w.webContents.once("dom-ready", () => {
        w.webContents.send("um-arguments", title, version, changelog, url, folder);
    });

    // Load the html file
    const htmlPath = path.join(HTML_DIR, "update-messagebox.html");
    w.loadFile(htmlPath);

    return w;
};
//#endregion Public methods

//#region Private methods
/**
 * @private
 * Create a simple window.
 * @param {Object.<string, number>} size Default size of the window
 * @param {Object.<string, number>} minSize Minimum size of the window
 * @param {Boolean} hasFrame Set if the window has a non-Chrome contourn
 * @param {BrowserWindow} parent Parent window for modal dialog
 * @param {String} preloadPath Path to the preload script
 */
function createBaseWindow(size, minSize, preloadPath, hasFrame, parent) {
    // Create the browser window.
    const w = new BrowserWindow({
        // Set window size
        width: size.width,
        height: size.height,
        minWidth: minSize.width,
        minHeight: minSize.height,
        useContentSize: true,

        // Set "style" settings
        icon: APP_ICON,
        backgroundColor: BASE_COLOR, // Used to simulate loading and not make the user wait
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
    w.webContents.on("did-finish-load", () => w.show());

    // Intercept ipc messages for window command
    w.webContents.on("ipc-message", function ipcMessage(e, channel, args) {
        switch (channel) {
        case "window-resize":
            w.setSize(args[0], args[1], false);
            w.center();
            break;
        default:
            break;
        }
    });

    return w;
}
//#endregion Private methods