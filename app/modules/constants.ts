// Copyright (c) 2021 MillenniumEarl
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Core modules
import { join } from "path";

// Public modules from npm
import { app } from "electron";


/**
 * Per-user application data directory, which by default points to:
 * - `%APPDATA%` on Windows
 * - `$XDG_CONFIG_HOME` or `~/.config` on Linux
 * - `~/Library/Application Support` on macOS
 */
const APPDATA = app.getPath("appData");

/**
 * Path to the directory that contains the log files.
 */
const APP_LOGS_DIR = app.getPath("logs");

/**
 * Namespace that collects all log file paths.
 */
export namespace LogPath {
    /**
     * Path of the log file where all uncategorized information will be written.
     */
    export const DEFAULT = join(APP_LOGS_DIR, "default.log");
    /**
     * Path to the log file that records all information about the main process.
     */
    export const MAIN = join(APP_LOGS_DIR, "main.log");
    /**
     * Path to the log file that records all information about the window renderer process.
     */
    export const RENDERER = join(APP_LOGS_DIR, "renderer.log");
    /**
     * Path to the log file that records all information of the F95API library.
     */
    export const F95API = join(APP_LOGS_DIR, "f95api.log");
}