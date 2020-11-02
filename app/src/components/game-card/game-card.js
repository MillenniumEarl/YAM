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
        this._prepareDOM();

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
        this.querySelector("#gc-name").innerText = value.isMod ?
            `[MOD] ${value.name}` :
            value.name;
        this.querySelector("#gc-author").innerText = value.author;
        this.querySelector("#gc-f95-url").setAttribute("href", value.url);
        this.querySelector("#gc-overview").innerText = value.overview;
        this.querySelector("#gc-engine").innerText = value.engine;
        this.querySelector("#gc-status").innerText = value.status;
        this.querySelector("#gc-last-update").innerText = 
            value.lastUpdate.toISOString().replace(/T/, " ").replace(/\..+/, "");
        this.querySelector("#gc-installed-version").innerText = value.version;

        // Parse the relative path of the image (asynchronusly)
        this._parsePreviewPath(value.previewSrc).then((source) => {
            this.querySelector("#gc-preview").setAttribute("src", source);
        });
    }

    get info() {
        return this._info;
    }

    get changelog() {
        const value = this._updateInfo ?
            this._updateInfo.changelog :
            this.info.changelog;
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
        const launcherPath = await this._getGameLauncher(this._info.gameDir);

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
                url: this._info.url,
                gameDir: this._info.gameDir,
            },
        });
        this.dispatchEvent(updateClickEvent);
    }

    /**
     * @event
     * Triggered when user wants to delete the game.
     */
    async delete() {
        // Raise the event
        const deleteClickEvent = new CustomEvent("delete", {
            detail: {
                gameDir: this._info.gameDir,
                savePaths: await window.IO.findSavesPath(this._info),
            },
        });
        this.dispatchEvent(deleteClickEvent);
    }
    //#endregion Events

    //#region Private methods
    /**
     * Load the HTML file and define the buttons of the custom component.
     */
    _prepareDOM() {
        /* Defines the HTML code of the custom element */
        const template = document.createElement("template");

        /* Synchronous read of the HTML template */
        const pathHTML = window.API.join(
            window.API.appDir,
            "src",
            "components",
            "game-card",
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
        this._getDataJSONPath = this._getDataJSONPath.bind(this);
        this.deleteGameData = this.deleteGameData.bind(this);
        this.notificateUpdate = this.notificateUpdate.bind(this);
        this.finalizeUpdate = this.finalizeUpdate.bind(this);
        this.play = this.play.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);

        // Translate DOM
        this._translateElementsInDOM();
    }

    /**
     * @private
     * Translate the DOM elements in the current language.
     */
    async _translateElementsInDOM() {
        // Get only the localizable elements
        const elements = this.querySelectorAll(".localizable");

        // Translate elements
        for (const e of elements) {
            // Change text if no child elements are presents...
            if (e.childNodes.length === 0)
                e.textContent = await window.API.translate(e.id);
            // ... or change only the last child (the text)
            else
                e.childNodes[
                    e.childNodes.length - 1
                ].textContent = await window.API.translate(e.id);
        }
    }

    /**
     * Search for a compatible game launcher for the current OS.
     * @param {String} gameDir Directory where looking for the launcher
     * @returns {Promise<String>} Launcher of the game or null if no file are found
     */
    async _getGameLauncher(gameDir) {
        // Get the extension matching the current OS
        let extension = "";

        if (window.API.platform === "win32") extension = "exe";
        else if (window.API.platform === "darwin") extension = "sh";
        // TODO -> not so sure
        else if (window.API.platform === "linux") extension = "py";
        // TODO -> not so sure
        else return null;

        // Find the launcher
        let files = await window.IO.filter(`*.${extension}`, gameDir);

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
     * @param {String} previewSrc Current URL of the image
     * @returns {Promise<String>} Name of the image or null if it was not downloaded
     */
    async _downloadGamePreview(name, previewSrc) {
        // Check if it's possible to download the image
        if (previewSrc.trim() === "") return null;
        if (previewSrc.trim() === "../../resources/images/f95-logo.jpg")
            return null;

        const gameCacheDir = await window.API.invoke("games-data-dir");
        const localPath = window.API.join(gameCacheDir, previewSrc);
        if (await window.IO.pathExists(localPath)) return null; // Already downloaded

        // Get image extension
        const splitted = previewSrc.split(".");
        const extension = splitted.pop();
        let imageName = `${name.replaceAll(" ", "")}_preview.${extension}`;
        const rx = /[/\\?%*:|"<>]/g; // Remove invalid chars
        imageName = imageName.replace(rx, "");

        // Download image
        const path = await window.API.downloadImage(
            previewSrc,
            window.API.join(gameCacheDir, imageName)
        );

        if (path) return imageName;
        else return null;
    }

    /**
     * @private
     * Obtain the save data path for the game info.
     */
    async _getDataJSONPath() {
        const base = await window.API.invoke("games-data-dir");
        let cleanFilename = this._info.name.replaceAll(" ", "");
        cleanFilename = cleanFilename.replace(/[/\\?%*:|"<>]/g, "").trim(); // Remove invalid chars
        const filename = `${cleanFilename}_data.json`;
        return window.API.join(base, filename);
    }

    /**
     * Get the path to the preview source of the game.
     * @param {String} src Saved preview source in the game's data
     * @returns {String} Path to the preview (online or offline)
     */
    async _parsePreviewPath(src) {
        // First check if the source is valid, if not return the default image
        if (!src) return "../../resources/images/f95-logo.jpg";

        // Then check if it's a URL
        try {
            // It's a URL
            const url = new URL(src);
            return url.toString();
        } catch {
            // It's an image name
            const gamesDir = await window.API.invoke("games-data-dir");
            const previewPath = window.API.join(gamesDir, src);

            // Check if the image exists
            const exists = await window.IO.pathExists(previewPath);
            if (exists) return previewPath;

            // Something wrong, return the default image
            else return "../../resources/images/f95-logo.jpg";
        }
    }

    async getSaveGameDataPaths() {

    }
    //#endregion Private methods

    //#region Public methods
    /**
     * @public
     * Save component data to disk as a JSON string.
     */
    async saveGameData() {
        // Download preview image
        if (this._info.previewSrc) {
            const imageName = await this._downloadGamePreview(
                this._info.name,
                this._info.previewSrc
            );
            if (imageName) this._info.previewSrc = imageName;
        }

        // Save the serialized JSON
        window.IO.write(await this._getDataJSONPath(), JSON.stringify(this._info));
    }
    /**
     * @public
     * Load component data from disk.
     * @param {String} path Path where the data to be loaded are located
     */
    async loadGameData(path) {
        // Load the serialized JSON
        const json = await window.IO.read(path);
        const obj = window.F95.deserialize(json);

        // Load object
        this.info = obj;
    }
    /**
     * @public
     * Delete the stored game data.
     */
    async deleteGameData() {
        // Delete the file data
        window.IO.deleteFile(await this._getDataJSONPath());

        // Check the cached preview
        if (!this.info.previewSrc) return;

        // Delete the cached preview
        const previewPath = this._parsePreviewPath(this.info.previewSrc);
        const exists = await window.IO.pathExists(previewPath);
        if (exists) window.IO.deleteFile(previewPath);
    }
    /**
     * @public
     * Used to notificate the GameCard of a new version of the game.
     * @param {Promise<GameInfo>} promise promise Promise of the game data scraping
     */
    async notificateUpdate(promise) {
        // Show the progress bar
        this.progressbar.style.display = "block";

        // Await game data
        const info = await promise;

        // An update is available, show the button
        this.querySelector(".update-p").style.display = "block";

        // Change the text of the button
        const lenght = this.updateBtn.childNodes.length;
        const element = this.updateBtn.childNodes[lenght - 1];
        const translation = await window.API.translate("GC update", {
            "version": info.version
        });
        element.textContent = translation;

        // Set update data
        this._updateInfo = info;

        // Hide progressbar
        this.progressbar.style.display = "none";
    }
    /**
     * @public
     * Finalize the update renaming the game folder and showing the new info.
     * @return {Boolean} Result of the operation
     */
    async finalizeUpdate() {
        if (!this._updateInfo) {
            window.API.log.warn(
                "No need to finalize the GameCard, no update notified"
            );
            return false;
        }

        // Prepare the directory paths
        const oldDirName = this.info.gameDir.split("\\").pop();
        const dirpath = this.info.gameDir.replace(oldDirName, "");
        const modVariant = this._updateInfo.isMod ? "[MOD]" : "";

        // Clean the path
        let dirname = `${this._updateInfo.name} [v.${this._updateInfo.version}] ${modVariant}`;
        dirname = dirname.replace(/[/\\?%*:|"<>]/g, " ").trim(); // Remove invalid chars
        const newpath = window.API.join(dirpath, dirname);

        // Rename the old path
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
