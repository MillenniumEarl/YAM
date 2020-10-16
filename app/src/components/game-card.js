"use strict";

class GameCard extends HTMLElement {
  constructor() {
    super();

    /* Use the F95API classes (Need main-preload) */
    this._info = window.F95.GameInfo;
    this._updateInfo = null; // Used only when is necessary to update a game
  }

  /**
   * Triggered once the element is added to the DOM
   */
  connectedCallback() {
    // Prepare DOM
    this.prepareDOM();

    /* Set events listeners for the buttons */
    this.playBtn.addEventListener("click", this.play);
    this.updateBtn.addEventListener("click", this.update);
    this.deleteBtn.addEventListener("click", this.delete);
  }

  /**
   * Triggered once the element is removed from the DOM
   */
  disconnectedCallback() {
    /* Remove events listeners for the buttons*/
    this.playBtn.removeEventListener("click", this.play);
    this.updateBtn.removeEventListener("click", this.update);
    this.deleteBtn.removeEventListener("click", this.delete);
  }

  //#region Properties
  set info(value) {
    if (!value) return;
    this._info = value;

    // Set HTML elements
    this.querySelector("#gc-name").innerText = value.isMod
      ? "[MOD] " + value.name
      : value.name;
    this.querySelector("#gc-author").innerText = value.author;
    this.querySelector("#gc-f95-url").setAttribute("href", value.f95url);
    this.querySelector("#gc-overview").innerText = value.overview;
    this.querySelector("#gc-engine").innerText = value.engine;
    this.querySelector("#gc-status").innerText = value.status;
    this.querySelector("#gc-last-update").innerText = value.lastUpdate;

    const source = value.previewSource
      ? value.previewSource
      : "../../resources/images/f95-logo.jpg";
    this.querySelector("#gc-preview").setAttribute("src", source);

    window.API.translate("GC installed version")
    .then((translation) =>
      this.querySelector("#gc-installed-version").innerText =
        translation + ": " + value.version
    );
  }

  get info() {
    return this._info;
  }

  get changelog() {
    const value = this._updateInfo
      ? this._updateInfo.changelog
      : this.info.changelog;
    return value;
  }
  //#endregion Properties

  //#region Events
  /**
   * @event
   * Triggered when user wants to play the game.
   */
  async play() {
    // Get the game launcher
    const launcherPath = await this.getGameLauncher(this._info.gameDir);

    // Raise the event
    const playClickEvent = new CustomEvent("play", {
      detail: {
        launcher: launcherPath,
      },
    });
    this.dispatchEvent(playClickEvent);
  }

  /**
   * @event
   * Triggered when user wants to update the game (and an update is available).
   */
  update() {
    // Raise the event
    const updateClickEvent = new CustomEvent("update", {
      detail: {
        downloadInfo: this._updateInfo.downloadInfo,
        url: this._info.f95url,
        gameDir: this._info.gameDir,
      },
    });
    this.dispatchEvent(updateClickEvent);
  }

  /**
   * @event
   * Triggered when user wants to delete the game.
   */
  delete() {
    // Raise the event
    const deleteClickEvent = new CustomEvent("delete", {
      detail: {
        gameDir: this._info.gameDir,
      },
    });
    this.dispatchEvent(deleteClickEvent);
  }
  //#endregion Events

  //#region Private methods
  /**
   * Load the HTML file and define the buttons of the custom component.
   */
  prepareDOM() {
    /* Defines the HTML code of the custom element */
    const template = document.createElement("template");

    /* Synchronous read of the HTML template */
    const pathHTML = window.API.join(
      window.API.appDir,
      "src",
      "components",
      "game-card.html"
    );
    template.innerHTML = window.IO.readSync(pathHTML);
    this.appendChild(template.content.cloneNode(true));

    /* Define elements in DOM */
    this.playBtn = this.querySelector("#gc-play-game-btn");
    this.updateBtn = this.querySelector("#gc-update-game-btn");
    this.deleteBtn = this.querySelector("#gc-delete-game-btn");
    this.progressbar = this.querySelector("#gc-card-progressbar");

    /* Bind function to use this */
    this.loadGameData = this.loadGameData.bind(this);
    this.saveGameData = this.saveGameData.bind(this);
    this.getDataJSONPath = this.getDataJSONPath.bind(this);
    this.deleteGameData = this.deleteGameData.bind(this);
    this.notificateUpdate = this.notificateUpdate.bind(this);
    this.notificateUpdateOnPromise = this.notificateUpdateOnPromise.bind(this);
    this.finalizeUpdate = this.finalizeUpdate.bind(this);
    this.play = this.play.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);

    // Translate DOM
    this.translateElementsInDOM();
  }

  /**
   * @private
   * Translate the DOM elements in the current language.
   */
  async translateElementsInDOM() {
    // Get only the localizable elements
    const elements = this.querySelectorAll(".localizable");

    // Translate elements
    for (let e of elements) {
      // Change text if no child elements are presents...
      if (e.childNodes.length === 0) e.textContent = await window.API.translate(e.id);
      // ... or change only the last child (the text)
      else e.childNodes[e.childNodes.length - 1].textContent = await window.API.translate(e.id);
    }
  }

  /**
   * Search for a compatible game launcher for the current OS.
   * @param {String} gameDir Directory where looking for the launcher
   * @returns {Promise<String>} Launcher of the game or null if no file are found
   */
  async getGameLauncher(gameDir) {
    // Get the extension matching the current OS
    let extension = "";

    if (window.API.platform === "win32") extension = "exe";
    else if (window.API.platform === "darwin") extension = "sh";
    // TODO -> not so sure
    else if (window.API.platform === "linux") extension = "py";
    // TODO -> not so sure
    else return null;

    // Find the launcher
    let files = await window.IO.filter("*." + extension, gameDir);

    // Try with HTML
    if (files.length === 0) files = await window.IO.filter("*.html", gameDir);

    // Return executable
    if (files.length === 0) return null;
    else return window.API.join(gameDir, files[0]);
  }

  /**
   * @private
   * Download the game cover image.
   * @param {String} name Game name
   * @param {String} previewSource Current URL of the image
   * @returns {Promise<String>} Local path to the image or null if it was not downloaded
   */
  async downloadGamePreview(name, previewSource) {
    // Check if it's possible to download the image
    if (previewSource.trim() === "") return null;
    if (previewSource.trim() === "../../resources/images/f95-logo.jpg")
      return null;
    if (await window.IO.pathExists(previewSource)) return null; // Already downloaded

    // Get image extension
    const splitted = previewSource.split(".");
    const extension = splitted.pop();
    const imageName = name.replaceAll(" ", "") + "_preview." + extension;

    // Download image
    const gameCacheDir = await window.API.invoke("games-data-dir");
    const localPreviewPath = window.API.join(gameCacheDir, imageName);
    const path = await window.API.downloadImage(
      previewSource,
      localPreviewPath
    );

    if (path) return localPreviewPath;
    else return null;
  }
  /**
   * @private
   * Obtain the save data path for the game info.
   */
  async getDataJSONPath() {
    const base = await window.API.invoke("games-data-dir");
    const filename = this._info.name.replaceAll(" ", "").trim() + "_data.json";
    return window.API.join(base, filename);
  }
  //#endregion Private methods

  //#region Public methods
  /**
   * @public
   * Save component data to disk as a JSON string.
   */
  async saveGameData() {
    // Download preview image
    if (this._info.previewSource) {
      const previewLocalPath = await this.downloadGamePreview(
        this._info.name,
        this._info.previewSource
      );
      if (previewLocalPath) this._info.previewSource = previewLocalPath;
    }

    // Save the serialized JSON
    window.IO.write(await this.getDataJSONPath(), JSON.stringify(this._info));
  }
  /**
   * @public
   * Load component data from disk.
   * @param {String} path Path where the data to be loaded are located
   */
  async loadGameData(path) {
    // Load the serialized JSON
    const json = await window.IO.read(path);
    const obj = JSON.parse(json);

    // Load object
    this.info = obj;
  }
  /**
   * @public
   * Delete the stored game data.
   */
  async deleteGameData() {
    // Delete the file data
    window.IO.deleteFile(await this.getDataJSONPath());

    // Delete the cached preview
    if (!this.info.previewSource) return;
    if (window.IO.pathExists(this.info.previewSource))
      window.IO.deleteFile(this.info.previewSource);
  }
  /**
   * @public
   * Used to notificate the GameCard of a new version of the game.
   * @param {Promise<GameInfo>} promise Promise of the game data scraping
   */
  async notificateUpdateOnPromise(promise) {
    // Show the progress bar
    this.progressbar.style.display = "block";

    // Await game data
    const info = await promise;

    // Refresh data
    this.notificateUpdate(info);

    // Hide progressbar
    this.progressbar.style.display = "none";
  }
  /**
   * @public
   * Used to notificate the GameCard of a new version of the game.
   * @param {GameInfo} promise Game data updated
   */
  notificateUpdate(info) {
    // An update is available, show the button
    this.querySelector(".update-p").style.display = "block";

    // Change the text of the button
    window.API.translate("GC update").then((translation) => {
      let lenght = this.updateBtn.childNodes.length;
      let element = this.updateBtn.childNodes[lenght - 1];
      element.textContent = translation + " (" + info.version + ")";
    });

    // // Re-add the icon (innerText is overwritten)
    // const icon = document.createElement("i");
    // icon.classList.add("material-icons", "left");
    // icon.innerText = "file_download";
    // this.updateBtn.appendChild(icon);

    // Set update data
    this._updateInfo = info;
  }
  /**
   * @public
   * Finalize the update renaming the game folder and showing the new info.
   * @return {Boolean} Result of the operation
   */
  async finalizeUpdate() {
    if (!this._updateInfo) {
      window.API.log.warn("No need to finalize the GameCard, no update notified");
      return false;
    }

    // Rename the old path
    const oldDirName = this.info.gameDir.split("\\").pop();
    const dirpath = this.info.gameDir.replace(oldDirName, "");
    const modVariant = this._updateInfo.isMod ? " [MOD]" : ""; // Leave the trailing space!
    const dirname =
      this._updateInfo.name +
      " [v." +
      this._updateInfo.version +
      "]" +
      modVariant;
    const newpath = window.API.join(dirpath, dirname);
    if (await window.IO.pathExists(newpath)) return false;
    window.IO.renameDir(this.info.gameDir, newpath);

    // Update info
    this._updateInfo.gameDir = newpath;
    this.info = this._updateInfo;

    // Save info
    this.saveGameData();

    // Hide the button
    this.querySelector(".update-p").style.display = "none";
    return true;
  }
  //#endregion Public methods
}

// Let the browser know that <game-card> is served by our new class
customElements.define("game-card", GameCard);
