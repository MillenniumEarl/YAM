// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Public modules from npm
import "source-map-support/register";
import { app } from "electron";
import electronIsDev from "electron-is-dev";

// Local modules
import * as logging from "./utility/logging";
import AppConfigurator from "./classes/app-configurator";
import shared from "./common/shared";
import Paths from "./classes/app-paths";
import ehandler from "./utility/error-handling";

// Set the development environment
shared.isDev = electronIsDev;

// Assign the paths
shared.paths = new Paths(app.getAppPath(), app.getPath("logs"), app.getPath("appData"));

// Initialize the loggers
logging.init();

// Get the main logger
const mainLogger = logging.get("main");
mainLogger.level = "info";

// Manage errors, warning and unhandled promises at application level
process.on("uncaughtException", (e) => {
  // If we reach this callback, something critically
  // wrong happended in the application and it is
  // necessary to terminate the process
  // See: https://nodejs.org/api/process.html#process_warning_using_uncaughtexception_correctly
  mainLogger.fatal(
    "This is a CRITICAL message, an uncaught error was throw in the main process and no handler where defined:"
  );
  ehandler(e); // Better error handling
  mainLogger.fatal("The application will now be closed");

  // Close application
  app.exit();
});

process.on("unhandledRejection", (reason) =>
  mainLogger.error(`Unhandled Rejection, reason: ${(reason as string) ?? "Unknown"}`)
);

process.on("warning", (warning) =>
  mainLogger.warn(`${warning.name}: ${warning.message}\n${warning.stack ?? "No stack to display"}`)
);

// Start the app
new AppConfigurator().init();
