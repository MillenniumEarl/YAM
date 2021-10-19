// Copyright (c) 2021 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// Public modules from npm
import { CatchAll } from "@magna_shogun/catch-decorator";
import { autoUpdater, CancellationToken, UpdateInfo } from "electron-updater";

// Local modules
import { get } from "../utility/logging";
import ehandler from "../utility/error-handling";

export default class Updater {
  /**
   * Logger used to notify errors or other information.
   */
  #logger = get("main");

  /**
   * Local cache containing the latest version data available online.
   */
  #onlineData: UpdateInfo | null = null;

  /**
   * Indicates whether the application update was downloaded successfully.
   */
  #updateDownloaded = false;

  /**
   * It exposes the main functions to use for app updates.
   *
   * It automatically provides log messages (errors, warns and infos).
   */
  constructor() {
    autoUpdater.logger = this.#logger;
    autoUpdater.allowDowngrade = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.autoDownload = false;
  }

  /**
   * Check if a new version of the app is available
   */
  @CatchAll(ehandler)
  public async check() {
    // Check for update (does not download)
    const result = await autoUpdater.checkForUpdates();

    // Cache the result
    this.#onlineData = result.updateInfo;

    // Alias to reduce row length
    const current = autoUpdater.currentVersion;
    const online = result.updateInfo.version;

    // Compare and return boolean
    return current.compare(online) === -1;
  }

  /**
   * Gets information about the latest version available online.
   */
  @CatchAll(ehandler)
  public async info() {
    // Got online version data
    if (!this.#onlineData) await this.check();

    // Return only the info
    return this.#onlineData;
  }

  /**
   * Download the update.
   * @param token Token used for canceling the download.
   */
  @CatchAll(ehandler)
  public async download(token?: CancellationToken) {
    await autoUpdater.downloadUpdate(token);
    this.#updateDownloaded = true;
  }

  /**
   * Quit the application and install the update.
   */
  @CatchAll(ehandler)
  public install() {
    if (!this.#updateDownloaded) throw new Error("Update not downloaded, cannot install");
    autoUpdater.quitAndInstall();
  }
}
