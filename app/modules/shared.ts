// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Core modules
import { EventEmitter } from "events";

// Public modules from npm
import Store from "electron-store";

// Local modules
import WindowManager from "./classes/window-manager";
import Paths from "./app-paths";

export default class Shared {
  /**
   * Event emitter common to all modules of the app and
   * used to exchange information following an event.
   */
  public static appevents = new EventEmitter();

  /**
   * Window manager for the current application.
   */
  public static wmanager = new WindowManager();

  /**
   * Store used to keep user settings.
   */
  public static store = new Store();

  /**
   * Define if the instance is running in development environment.
   */
  public static isDev = false;

  /**
   * Class containing all the paths used in this application.
   */
  public static paths: Paths;
}
