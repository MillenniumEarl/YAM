"use strict";

class GameCard extends HTMLElement {
    constructor() {
        super();

        /* Use the F95API classes (Need main-preload.js) */
        this._info = window.GIE.gamedata;
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

        // Refresh data
        this._refreshUX();
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
    play() {
        // Save the current date as last played session
        this.info.lastPlayed = Date.now();

        // Raise the event
        const playClickEvent = new CustomEvent("play", {
            detail: {
                launcher: window.GIE.launcher(this.info),
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
                url: this.info.url,
                gameDirectory: this.info.gameDirectory,
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
                gameDirectory: this.info.gameDirectory,
                savePaths: await window.GIE.saves(this.info),
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
        this._refreshUX = this._refreshUX.bind(this);
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
     * Update the data shown on the item.
     */
    async _refreshUX() {
        // Show the preload circle and hide the data
        this.querySelector("#gc-card-preloader").style.display = "block";
        this.querySelector("#gc-card").style.display = "none";

        // Set HTML elements
        this.querySelector("#gc-name").innerText = this.info.isMod ?
            `[MOD] ${this.info.name}` :
            this.info.name;
        this.querySelector("#gc-author").innerText = this.info.author;
        this.querySelector("#gc-f95-url").setAttribute("href", this.info.url);
        this.querySelector("#gc-overview").innerText = this.info.overview;
        this.querySelector("#gc-engine").innerText = this.info.engine;
        this.querySelector("#gc-status").innerText = this.info.status;
        this.querySelector("#gc-last-update").innerText = this.info.lastUpdate ?
            this.info.lastUpdate.toISOString().split("T")[0] : // Date in format YYYY-mm-dd
            "No info";
        this.querySelector("#gc-installed-version").innerText = this.info.version;

        // Parse the relative path of the image (asynchronusly)
        const path = this.info.localPreviewPath ? this.info.localPreviewPath : this.info.previewSrc;
        const source = await this._parsePreviewPath(path);
        this.querySelector("#gc-preview").setAttribute("src", source);

        // Hide the preload circle and show the data
        this.querySelector("#gc-card-preloader").style.display = "none";
        this.querySelector("#gc-card").style.display = "block";
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
            if (e.childNodes.length === 0) e.textContent = await window.API.translate(e.id);
            // ... or change only the last child (the text)
            else e.childNodes[e.childNodes.length - 1].textContent = await window.API.translate(e.id);
        }
    }

    /**
     * @private
     * Download the game cover image.
     * @param {String} name Game name
     * @param {String} source Current URL of the image
     * @returns {Promise<String>} Name of the image or `null` if it was not downloaded
     */
    async _downloadGamePreview(name, source) {
        // Check if it's possible to download the image
        if (source.trim() === "") return null;
        if (source.trim() === "../../resources/images/f95-logo.webp")
            return null;

        const gameCacheDir = await window.API.invoke("games-data-dir");
        const localPath = window.API.join(gameCacheDir, source);
        if (await window.IO.pathExists(localPath)) return null; // Already downloaded

        // Get image extension
        const splitted = source.split(".");
        const extension = splitted.pop();
        let imageName = `${name.replaceAll(" ", "")}_preview.${extension}`;
        const rx = /[/\\?%*:|"<>]/g; // Remove invalid chars
        imageName = imageName.replace(rx, "");

        // Download image
        const path = await window.API.downloadImage(
            source,
            window.API.join(gameCacheDir, imageName)
        );

        if (path) return imageName;
        else return null;
    }

    /**
     * @private
     * Obtain the save data path for the game info.
     * @param {String} gamename
     * @returns {Promise<String>} Path to JSON
     */
    async _getDataJSONPath(gamename) {
        const base = await window.API.invoke("games-data-dir");
        const cleanFilename = gamename.replace(/[/\\?%*:|"<> ]/g, "").trim(); // Remove invalid chars
        const filename = `${cleanFilename}_data.json`;
        return window.API.join(base, filename);
    }

    /**
     * @private
     * Get the path to the preview source of the game.
     * @param {String} src Saved preview source in the game's data
     * @returns {Promise<String>} Path to the preview (online or offline)
     */
    async _parsePreviewPath(src) {
        // First check if the source is valid, if not return the default image
        if (!src) return "../../resources/images/f95-logo.webp";

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
            else return "../../resources/images/f95-logo.webp";
        }
    }
    //#endregion Private methods

    //#region Public methods
    /**
     * @public
     * Save component data to disk as a JSON string.
     */
    async saveGameData() {
        // Download preview image
        if (!this.info.localPreviewPath && this.info.previewSrc) {
            const imageName = await this._downloadGamePreview(this.info.name, this.info.previewSrc);
            if (imageName) this.info.localPreviewPath = imageName;
        }
        
        // Save the serialized JSON
        const savepath = await this._getDataJSONPath(this.info.name);
        window.GIE.save(this.info, savepath);
    }

    /**
     * @public
     * Load component data from disk.
     * @param {String} path Path where the data to be loaded are located
     */
    async loadGameData(path) {
        this.info = window.GIE.load(path);
    }

    /**
     * @public
     * Delete the stored game data.
     */
    async deleteGameData() {
        // Delete the file data
        window.IO.deleteFile(await this._getDataJSONPath(this.info.name));

        // Check the cached preview
        if (!this.info.localPreviewPath) return;

        // Delete the cached preview
        const previewPath = this._parsePreviewPath(this.info.localPreviewPath);
        const exists = await window.IO.pathExists(previewPath);
        if (exists) window.IO.deleteFile(previewPath);
    }

    /**
     * @public
     * Used to notificate the GameCard of a new version of the game.
     * @param {GameInfoExtended} promise promise Promise of the game data scraping
     */
    async notificateUpdate(gameinfo) {
        // Show the progress bar
        this.progressbar.style.display = "block";

        // An update is available, show the button
        this.querySelector(".update-p").style.display = "block";

        // Change the text of the button
        const lenght = this.updateBtn.childNodes.length;
        const element = this.updateBtn.childNodes[lenght - 1];
        const translation = await window.API.translate("GC update", {
            "version": gameinfo.version
        });
        element.textContent = translation;

        // Set update data
        this._updateInfo = gameinfo;

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
        const oldDirName = this.info.gameDirectory.split("\\").pop();
        const dirpath = this.info.gameDirectory.replace(oldDirName, "");
        const modVariant = this._updateInfo.isMod ? "[MOD]" : "";

        // Clean the path
        let dirname = `${this._updateInfo.name} [v.${this._updateInfo.version}] ${modVariant}`;
        dirname = dirname.replace(/[/\\?%*:|"<>]/g, " ").trim(); // Remove invalid chars
        const newpath = window.API.join(dirpath, dirname);

        // Rename the old path
        if (await window.IO.pathExists(newpath)) return false;
        window.IO.renameDir(this.info.gameDirectory, newpath);

        // Update info
        this._updateInfo.gameDirectory = newpath;
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
