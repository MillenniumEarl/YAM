// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Public modules from npm
import ErrorStackParser from "error-stack-parser";

// Local modules
import { get } from "./logging";
import { TLoggerCategory } from "./types";
import Shared from "./shared";

/**
 * Generic handler for errors in the application.
 * @param error Error thrown from decorated method
 * @param context `this` value from decorated method
 * @param args Spreaded arguments from decorated method
 */
export default function handler(error: Error): void {
  // Parse the error
  const stack = ErrorStackParser.parse(error);

  // Obtains the correct logger
  const category = getLoggerCategory(stack);
  const logger = get(category);

  // Parse data from stack
  const fname = stack[0].getFunctionName();
  const fline = stack[0].getLineNumber();
  const fcolumn = stack[0].getColumnNumber();
  const info = stack
    .map(
      (e) =>
        `--> ${e.getFunctionName()} (${e.getLineNumber()}:${e.getColumnNumber()}) in ${e.getFileName()}`
    )
    .join("\n");

  // Write message
  logger.error(
    `${error.name}: ${error.message} in ${fname} (${fline}:${fcolumn}):\n${info}`
  );

  // Notify error with emitter
  Shared.appevents.emit("error", {
    name: error.name,
    message: error.message,
    stack: stack
  });
}

/**
 * Extracts from the stack the category of logger to use to write the error.
 */
function getLoggerCategory(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line no-unused-vars
  stack: ErrorStackParser.StackFrame[]
): TLoggerCategory {
  // Array containing the script's names
  //const MAIN_SCRIPTS: string[] = [];
  const RENDERER_SCRIPTS: string[] = [];

  // Check for the type of script
  const filename = stack[0].getFileName();
  // const isMain = MAIN_SCRIPTS.some((scriptName) =>
  //   filename.includes(scriptName)
  // );
  const isRenderer = RENDERER_SCRIPTS.some((scriptName) =>
    filename.includes(scriptName)
  );
  const isF95 =
    filename.includes("F95API") && filename.includes("node_modules");

  return isF95 ? "modules.f95" : isRenderer ? "app.renderer" : "app.main";
}
