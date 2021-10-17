// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Public modules from npm
import { BrowserWindow } from "electron";

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
