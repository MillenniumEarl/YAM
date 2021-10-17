// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Public modules from npm
import {
  configure,
  getLogger,
  Configuration,
  Appender,
  Layout,
  Logger
} from "log4js";
import isDev from "electron-is-dev";

// Local modules
import { LogPath } from "./constants";
import { TLoggerCategory } from "./types";

//#region Global variables
let initialized: boolean = false;

/**
 * Common layout of the loggers.
 */
const LAYOUT: Layout = {
  type: "pattern",
  pattern: "[%d{yyyy/MM/dd-hh.mm.ss}] (%p - %c) %m%n"
};
//#endregion Global variables

//#region Private methods
/**
 * Create a standard appender that writes to the path passed by parameter.
 * @param filename Path to write log to
 */
function createCommonAppender(filename: string): Appender {
  return {
    type: "file", // Write log to file
    filename: filename, // Write to log to
    layout: LAYOUT, // Use the common layout for messages
    keepFileExt: true, // Use filename.1.log instead of filename.log.1
    maxLogSize: 10485760, // 10 MB
    backups: 3, // Keep max 3 files (for this appender)
    compress: true // Compress the files in .gz after they reach 10 MB
  };
}
//#endregion Private methods

//#region Public methods
/**
 * Initialize the loggers for the current session.
 */
export function init(): void {
  // Create the appenders
  const DEFAULT_APPENDER: Appender = createCommonAppender(LogPath.DEFAULT);
  const MAIN_APPENDER: Appender = createCommonAppender(LogPath.MAIN);
  const RENDERER_APPENDER: Appender = createCommonAppender(LogPath.RENDERER);
  const F95_APPENDER: Appender = createCommonAppender(LogPath.F95API);

  // Set the level for the appenders
  const level = isDev ? "debug" : "warn";

  // Create the configuration object
  const configuration: Configuration = {
    appenders: {
      default: DEFAULT_APPENDER,
      main: MAIN_APPENDER,
      renderer: RENDERER_APPENDER,
      f95: F95_APPENDER
    },
    categories: {
      default: {
        appenders: ["default"],
        level: level
      },
      app: {
        appenders: ["main", "renderer"],
        level: level
      },
      "app.main": {
        appenders: ["main"],
        level: level
      },
      "app.renderer": {
        appenders: ["renderer"],
        level: level
      },
      modules: {
        appenders: ["f95"],
        level: level
      },
      "modules.f95": {
        appenders: ["f95"],
        level: level
      }
    }
  };

  // Load the configuration
  configure(configuration);
  initialized = true;
}

/**
 * Gets the logger with the requested category.
 */
export function get(category: TLoggerCategory): Logger {
  if (!initialized) throw new Error("Loggers not initiailized");

  return getLogger(category);
}
//#endregion Public methods
