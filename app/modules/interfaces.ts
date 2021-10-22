// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Public modules from npm
import { BrowserWindow, FileFilter } from "electron";

// Local modules
import { TCloseWindowCallbackNull, TCloseWindowCallbackRest } from "./types";

/**
 * Options used for creating a new `BrowserWindow`.
 */
export interface IWindowOptions {
  /**
   * Unique name of the window.
   */
  name: string;
  /**
   * Default size of the window
   */
  size: { width: number; height: number };
  /**
   * Minimum size of the window.
   */
  minSize?: { width: number; height: number };
  /**
   * Maximum size of the window.
   */
  maxSize?: { width: number; height: number };
  /**
   * Set if the window has a non-Chrome contourn.
   */
  hasFrame?: boolean;
  /**
   * Parent window for the new window.
   *
   * If set, the new window will behave like a modal dialog.
   */
  parent?: BrowserWindow | undefined;
  /**
   * Path to the preload script.
   */
  preloadPath: string;
  /**
   * Dictionary of elements to pass to the window as arguments.
   */
  args?: Record<string, any>;
  /**
   * Callback executed when the window is closed.
   * It receives a return value from the window as the only parameter
   */
  onclose?: TCloseWindowCallbackRest | TCloseWindowCallbackNull;
}

export interface IWindowData {
  window: BrowserWindow;
  /**
   * Options used when creating this window.
   */
  options: IWindowOptions;
}

/**
 * Indicates that the object is a log message sent by a renderer process.
 */
export interface IRendererLog {
  /**
   * Name of the window that sent the message.
   */
  wname: string;
  /**
   * Level of the message sent by the renderer.
   */
  type: "info" | "warn" | "error";
  /**
   * Message sent by the renderer process.
   */
  message: string;
}

/**
 * Options for the dialog window.
 */
export interface IDialogOptions {
  /**
   * Title of the dialog window.
   */
  title: string;
  /**
   * Path where open the dialog.
   */
  defaultPath?: string;
  /**
   * Message to show in the dialog window.
   */
  message?: string;
  /**
   * Allow multiple paths to be selected.
   */
  multiple?: boolean;
  /**
   * Show the dialog as modal window.
   */
  modal?: boolean;
  /**
   * Array of file types that can be displayed or selected.
   */
  filters?: FileFilter[];
}

/**
 * Wrapper interface used to type an `IPCLogger` object
 * in the renderer process via `ContextBridge`.
 */
export interface IRendererLogger {
  info: (m: string) => void;
  warn: (m: string) => void;
  error: (m: string) => void;
}

/**
 * Wrapper interface used to type an `RendererIPCHandler`
 * object in the renderer process via `ContextBridge`.
 */
export interface IRendererIPCHandler {
  configure: () => Promise<void>;
  send: (channel: string, ...args: any[]) => void;
  receive: (channel: string, f: Function) => void;
  invoke: (channel: string, ...args: any[]) => void;
}

export interface IRendererDialog {
  file: (o: IDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
  folder: (o: IDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
}
