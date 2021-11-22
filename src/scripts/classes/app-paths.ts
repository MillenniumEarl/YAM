// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Core modules
import { join } from "path";

export default class Paths {
  /**
   * Per-user application data directory, which by default points to:
   * - `%APP_DATA%` on Windows
   * - `$XDG_CONFIG_HOME` or `~/.config` on Linux
   * - `~/Library/Application Support` on macOS
   */
  #APP_DATA: string;

  /**
   * Path to the directory that contains the log files.
   */
  #APP_LOGS_DIR: string;

  /**
   * Get the current working directory (the directory that contains package.json).
   */
  #APP_PATH: string;

  /**
   * Path to assets.
   */
  #ASSETS_PATH: string;

  /**
   * Per-user application data directory, which by default points to:
   * - `%APP_DATA%` on Windows
   * - `$XDG_CONFIG_HOME` or `~/.config` on Linux
   * - `~/Library/Application Support` on macOS
   */
  public get APP_DATA() {
    return this.#APP_DATA;
  }

  constructor(app: string, logs: string, data: string) {
    this.#APP_PATH = app;
    this.#APP_LOGS_DIR = logs;
    this.#APP_DATA = data;
    this.#ASSETS_PATH = join(this.#APP_PATH, "dist", "assets");
  }

  /**
   * Object that collects all log file paths.
   */
  public LogPath = {
    /**
     * Path of the log file where all uncategorized information will be written.
     */
    DEFAULT: () => join(this.#APP_LOGS_DIR, "default.log"),
    /**
     * Path to the log file that records all information about the main process.
     */
    MAIN: () => join(this.#APP_LOGS_DIR, "main.log"),
    /**
     * Path to the log file that records all information about the window renderer process.
     */
    RENDERER: () => join(this.#APP_LOGS_DIR, "renderer.log"),
    /**
     * Path to the log file that records all information of the F95API library.
     */
    F95API: () => join(this.#APP_LOGS_DIR, "f95api.log")
  };

  /**
   * Object that collects all database's paths.
   */
  public DatabasePath = {
    /**
     * Path to the database that contains the data of the installed games.
     */
    GAMES: () => join(this.#APP_DATA, "db", "games.json"),
    /**
     * Path to the database that contains the data of the watched threads.
     */
    THREADS: () => join(this.#APP_DATA, "db", "threads.json"),
    /**
     * Path to the database that contains the data of the installed mods and the overwrite data.
     */
    MODS: () => join(this.#APP_DATA, "db", "mods.json")
  };

  /**
   * Default paths where the games are stored.
   */
  public GAME_FOLDER_PATH = () => join(this.#APP_DATA, "games");

  /**
   * Path to the directory that contains all the window's HTML and scripts.
   */
  public WINDOWS_DATA_PATH = () => join(this.#APP_PATH, "dist", "windows");

  /**
   * Path to this application's icon (`ico` file).
   */
  public APP_ICON = () => join(this.#APP_PATH, "resources", "img", "icon", "icon.ico");
}
