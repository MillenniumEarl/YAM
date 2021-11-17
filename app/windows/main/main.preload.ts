/* eslint-disable @typescript-eslint/no-unsafe-argument */
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

/**
 * !!! IMPORTANT !!!
 * In preload files it is not possible to use some elements
 * of the electron module including app. This also prevents
 * importing modules that use app (or other unusable items)
 */

// Public modules from npm
import { contextBridge } from "electron";

// Local modules
import { IDialogOptions, IRendererIPCHandler, IRendererLogger } from "../../common/interfaces";
import RendererIPCHandler from "../../classes/renderer-ipc";
import DialogHandler from "../../classes/dialog";

// Create a handler that will manage the logic
// of the methods passed via ContextBridge
const handler = new RendererIPCHandler();

// Create a handler for the dialogs
const dialog = new DialogHandler(handler);

/**
 * Since it is not possible to pass the classes directly
 * in the ContextBridge because they are executed in a
 * separate context (so this is divertso, the imports are
 * not detected and the class prototype is not passed),
 * wrapper objects are created that will allow you to use
 * the functions of the classes.
 */

const handlerWrapper: IRendererIPCHandler = {
  configure: () => handler.configure(),
  send: (c: string, ...args: any[]) => handler.send(c, ...args),
  receive: (c: string, f: Function) => handler.receive(c, f),
  invoke: (c: string, ...args: any[]) => handler.invoke(c, ...args)
};

const loggerWrapper: IRendererLogger = {
  info: (m: string) => handler.logger.info(m),
  warn: (m: string) => handler.logger.warn(m),
  error: (m: string) => handler.logger.error(m)
};

const dialogWrapper = {
  file: (o: IDialogOptions) => dialog.selectFile(o),
  folder: (o: IDialogOptions) => dialog.selectFolder(o)
};

// Expose the following objects to the render process
contextBridge.exposeInMainWorld("API", {
  Handler: handlerWrapper,
  Logger: loggerWrapper,
  Dialog: dialogWrapper
});
