// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Public modules from npm
import "source-map-support/register";
import { app } from "electron";

// Local modules
import * as logging from "./modules/utility/logging";
import AppConfigurator from "./modules/classes/app-configurator";

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

// Start the app
new AppConfigurator().init();
