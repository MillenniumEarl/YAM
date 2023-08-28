// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Core modules
import { EventEmitter } from "events";

// Public modules from npm
import Store from "electron-store";
import type { Low } from "lowdb/lib";

// Local modules
import WindowManager from "../main/src/classes/window-manager";
import type { IGameDatabase } from "./interfaces";
import type Paths from "../main/src/classes/app-paths";

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

  /**
   * Database containing all the data regarding the games.
   */
  public static gamedb: Low<IGameDatabase>;
}
