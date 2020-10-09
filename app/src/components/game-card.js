"use strict";

class GameCard extends HTMLElement {
  constructor() {
    super();

    /* Use the F95API classes (Need main-preload) */
    this._info = window.F95.GameInfo;
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

  /**
   * Triggered when a observed attribute change
   * @param {String} name 
   * @param {*} oldValue 
   * @param {*} newValue 
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (name == 'updateAvailable' && oldValue !== newValue) {
      console.log(newValue);
      // An update is available, show the button
      this.updateBtn.style.display = "block";

      // Change the text of the button
      this.updateBtn.innerText = "Update (" + newValue + ")";
    }
  }

  //#region Attributes
  static get observedAttributes() {
    // Specify the attributes that, when changed, trigger the 'attributeChangedCallback'
    return ['updateAvailable'];
  }

  /**
   * @param {Boolean} value
   */
  set updateAvailable(value) {
    this.setAttribute('updateAvailable', Boolean(value));
  }
  //#endregion Attributes

  //#region Properties
  set info(value) {
    if (!value) return;
    this._info = value;

    // Set HTML elements
    this.querySelector("#name").innerText = value.isMod
      ? "[MOD] " + value.name
      : value.name;
    this.querySelector("#author").innerText = value.author;
    this.querySelector("#f95-url").setAttribute("href", value.f95url);
    this.querySelector("#overview").innerText = value.overview;
    this.querySelector("#engine").innerText = value.engine;
    this.querySelector("#status").innerText = value.status;
    const source = value.previewSource
      ? value.previewSource
      : "../../resources/images/f95-logo.jpg";
    this.querySelector("#preview").setAttribute("src", source);
    this.querySelector("#installed-version").innerText = value.version;
    this.querySelector("#last-update").innerText = value.lastUpdate;
  }

  get info() {
    return this._info;
  }
  //#endregion Properties

  //#region Events
  /**
   * @event
   * Triggered when user wants to play the game.
   */
  async play() {
    // Get the game launcher
    let launcherPath = await this.getGameLauncher(this._info.gameDir);

    // Raise the event
    let playClickEvent = new CustomEvent("play", {
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
    updateClickEvent = new CustomEvent("update", {
      detail: {
        downloadInfo: this._info.downloadInfo,
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
    deleteClickEvent = new CustomEvent("delete", {
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
    let template = document.createElement("template");

    /* Synchronous read of the HTML template */
    let pathHTML = window.API.join(
      window.API.appDir,
      "src",
      "components",
      "game-card.html"
    );
    template.innerHTML = window.IO.readSync(pathHTML);
    this.appendChild(template.content.cloneNode(true));

    /* Define buttons in DOM */
    this.playBtn = this.querySelector("#play-game-btn");
    this.updateBtn = this.querySelector("#update-game-btn");
    this.deleteBtn = this.querySelector("#delete-game-btn");

    /* Bind function to use this */
    this.loadGameData = this.loadGameData.bind(this);
    this.saveGameData = this.saveGameData.bind(this);
    this.play = this.play.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
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
    if(files.length === 0) files = await window.IO.filter("*.html", gameDir);

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
    if (previewSource.trim() === "../../resources/images/f95-logo.jpg") return null;
    if (await window.IO.fileExists(previewSource)) return null; // Already downloaded

    // Get image extension
    let splitted = previewSource.split(".");
    let extension = splitted.pop();
    let imageName = name.replaceAll(" ", "") + "_preview." + extension;

    // Download image
    let cawd = await window.API.invoke("cawd");
    let gameCacheDir = await window.API.invoke("games-data-dir");
    let localPreviewPath = window.API.join(cawd, gameCacheDir, imageName);
    let path = await window.API.downloadImage(previewSource, localPreviewPath);
    
    if (path) return localPreviewPath;
    else return null;
  }
  //#endregion Private methods

  //#region Public methods
  /**
   * @public
   * Save component data to disk as a JSON string.
   */
  async saveGameData() {
    // Download preview image
    let previewLocalPath = await this.downloadGamePreview(
      this._info.name,
      this._info.previewSource
    );
    if (previewLocalPath) this._info.previewSource = previewLocalPath;

    // Join save path
    const BASE_DIR = await window.API.invoke("games-data-dir");
    const FILE_NAME = this._info.name.replaceAll(" ", "").trim() + "_data.json";
    let savePath = window.API.join(BASE_DIR, FILE_NAME);

    // Save the serialized JSON
    window.IO.write(savePath, JSON.stringify(this._info));
  }
  /**
   * @public
   * Load component data from disk.
   * @param {String} path Path where the data to be loaded are located
   */
  async loadGameData(path) {
    // Load the serialized JSON
    let json = await window.IO.read(path);
    let obj = JSON.parse(json);

    // Load object
    this.info = obj;
  }
  //#endregion Public methods
}

// Let the browser know that <game-card> is served by our new class
customElements.define("game-card", GameCard);
