// Copyright (c) 2021 MillenniumEarl
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Public modules from npm
import ErrorStackParser from "error-stack-parser";

// Local modules
import { get } from "../modules/logging";
import { TLoggerCategory } from "./types";

/**
 * Generic handler for errors in the application.
 * @param error Error thrown from decorated method
 * @param context `this` value from decorated method
 * @param args Spreaded arguments from decorated method
 */
export default function handler(error: Error, context: unknown, ...args: unknown[]): void {
    // Parse the error
    const stack = ErrorStackParser.parse(error);

    // Obtains the correct logger
    const category = getLoggerCategory(stack);
    const logger = get(category);

    // Write message
    logger.error(`${error.name}: ${error.message} in ${(context as Function).name}\n${stack}`);
}

/**
 * Extracts from the stack the category of logger to use to write the error.
 */
function getLoggerCategory(
  stack: ErrorStackParser.StackFrame[]
): TLoggerCategory {
  return "app.main";
}