"use strict";

/**
 * This class deals with visualizing, managing, modifying 
 * the data related to a game. It is also used to search 
 * for updates on the same.
 */
class GameCard extends HTMLElement {
    constructor() {
        super();

        /**
         * @private
         * Information about the game shown by this card.
         * @type GameInfoExtended
         */
        this._info = null;
        /**
         * @private
         * Information about the latest version of the game shown by this card.
         * Used only when is necessary to update a game.
         * @type GameInfoExtended
         */
        this._updateInfo = null;
        /** 
         * @private
         * Indicates whether the DOM was successfully loaded.
         * @type Boolean
        */
        this._loadedDOM = false;
    }

    /**
     * Triggered once the element is added to the DOM
     */
    connectedCallback() {
        // Prepare DOM
        if (!this._loadedDOM) this._prepareDOM();
        this._loadedDOM = true;

        /* Set events listeners for the buttons */
        this.playBtn.addEventListener("click", this.playEvent);
        this.updateBtn.addEventListener("click", this.updateEvent);
        this.deleteBtn.addEventListener("click", this.deleteEvent);

        // Refresh data
        window.requestAnimationFrame(() => this._refreshUI());
    }

    /**
     * Triggered once the element is removed from the DOM
     */
    disconnectedCallback() {
        /* Remove events listeners for the buttons*/
        this.playBtn.removeEventListener("click", this.playEvent);
        this.updateBtn.removeEventListener("click", this.updateEvent);
        this.deleteBtn.removeEventListener("click", this.deleteEvent);
    }

    //#region Properties
    /**
     * Game information shown on this card
     */
    set info(value) {
        if (!value) throw new Error("Invalid value");
        this._info = value;

        // DOM not ready, cannot update information
        if(!this._loadedDOM) return;

        // Refresh data
        window.requestAnimationFrame(() => this._refreshUI());
    }

    /**
     * Game information shown on this card.
     */
    get info() {
        return this._info;
    }

    /**
     * Obtain the last changelog available for the game.
     * @return {String}
     */
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
    playEvent() {
        // Save the current date as last played session
        this.info.lastPlayed = new Date(Date.now());

        // Raise the event
        const playClickEvent = new CustomEvent("play", {
            detail: {
                name: this.info.name,
                launcher: window.GIE.launcher(this.info),
            },
        });
        this.dispatchEvent(playClickEvent);
    }

    /**
     * @event
     * Triggered when user wants to update the game (and an update is available).
     */
    updateEvent() {
        // Raise the event
        const updateClickEvent = new CustomEvent("update", {
            detail: {
                name: this.info.name,
                version: this._updateInfo.version,
                changelog: this._updateInfo.changelog,
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
    async deleteEvent() {
        // Raise the event
        const deleteClickEvent = new CustomEvent("delete", {
            detail: {
                name: this.info.name,
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
        this.loadData = this.loadData.bind(this);
        this.saveData = this.saveData.bind(this);
        this._refreshUI = this._refreshUI.bind(this);
        this.deleteData = this.deleteData.bind(this);
        this.playEvent = this.playEvent.bind(this);
        this.updateEvent = this.updateEvent.bind(this);
        this.deleteEvent = this.deleteEvent.bind(this);

        // Translate DOM
        this._translateElementsInDOM();
    }

    /**
     * @private
     * Update the data shown on the item.
     */
    async _refreshUI() {
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

        // Show/hide last ipdate date
        const lastUpdateElement = this.querySelector("#gc-last-update");
        if (this.info.lastUpdate) {
            // Date in format YYYY-mm-dd
            const datestring = this.info.lastUpdate.toISOString().split("T")[0];
            lastUpdateElement.innerText = datestring;

            // Show element
            lastUpdateElement.style.display = "block";
        }
        else lastUpdateElement.style.display = "none";

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

    async _existsGamePreview(source) {
        const previewDir = await window.API.invoke("preview-dir");
        const localPath = window.API.join(previewDir, source);
        return await window.IO.pathExists(localPath);
    }

    _parseImageName(name, url, customExtension) {
        // Get image extension
        const splitted = url.split(".");
        const extension = customExtension ? customExtension : splitted.pop();

        // Parse the name
        const imageName = `${name.replaceAll(" ", "")}_preview.${extension}`;
        const rx = /[/\\?%*:|"<>]/g; // Remove invalid chars
        return imageName.replace(rx, "");
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

        // Check if the image already exists
        const exists = await this._existsGamePreview(source);
        if (exists) return null; // Already downloaded

        // Download image
        const previewDir = await window.API.invoke("preview-dir");
        const imageName = this._parseImageName(name, source);
        const dest = window.API.join(previewDir, imageName);
        let path = null;
        try {
            path = await window.API.downloadImage(source, dest);
            if (!path.filename) return null; // Something went wrong
        }
        catch(e) {
            window.API.log.error(`Cannot download ${source}: ${e}`);
            return null;
        }

        // Compress image
        const compressionResult = await window.API.compress(path.filename, previewDir);
      
        // Something wrong with compression
        if (compressionResult.length !== 1) return imageName;

        // Delete original image
        if(compressionResult[0].sourcePath !== compressionResult[0].destinationPath) {
            window.IO.deleteFile(path.filename);
        }

        // Return image name
        const isGIF = source.endsWith(".gif");
        return isGIF ? imageName : this._parseImageName(name, source, "webp");
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
            const previewDir = await window.API.invoke("preview-dir");
            const previewPath = window.API.join(previewDir, src);

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
     * Save game data in the database.
     */
    async saveData() {
        // Download preview image
        if (!this.info.localPreviewPath && this.info.previewSrc) {
            const imageName = await this._downloadGamePreview(this.info.name, this.info.previewSrc);
            if (imageName) this.info.localPreviewPath = imageName;
        }
        
        // Save in the database
        await window.DB.write(this.info);
    }

    /**
     * @public
     * Load game data from database.
     * @param {number} id ID of the game as record in the database
     */
    async loadData(id) {
        this.info = await window.DB.read(id);
    }

    /**
     * @public
     * Delete the stored game data.
     */
    async deleteData() {
        // Delete the record in the database
        await window.DB.delete(this.info._id);

        // Check the cached preview
        if (!this.info.localPreviewPath) return;

        // Delete the cached preview
        const previewPath = await this._parsePreviewPath(this.info.localPreviewPath);
        const exists = await window.IO.pathExists(previewPath);
        if (exists) await window.IO.deleteFile(previewPath);
    }

    /**
     * Check if there is an update for the game. 
     * If so, the card will show the 'Update' button.
     */
    async checkUpdate() {
        // Show the progress bar
        this.progressbar.style.display = "block";

        // Check for updates...
        const update = await window.F95.checkGameUpdates(this.info);
        if (!update) {
            // Hide progressbar
            this.progressbar.style.display = "none";
            return;
        }

        // Update available, fetch data...
        const result = await window.F95.getGameDataFromURL(this.info.url);
        const gameinfo = window.GIE.convert(result);

        // Change the text of the button
        const lenght = this.updateBtn.childNodes.length;
        const element = this.updateBtn.childNodes[lenght - 1];
        const translation = await window.API.translate("GC update", {
            "version": gameinfo.version
        });
        element.textContent = translation;

        // Set update data
        this._updateInfo = gameinfo;
        this.info.updateAvailable = true;

        // Hide progressbar
        this.progressbar.style.display = "none";

        // Show the update button
        this.querySelector(".update-p").style.display = "block";
    }
    
    /**
     * @public
     * Update the game renaming the game folder and showing the new info.
     * @return {Boolean} Result of the operation
     */
    async update() {
        // If no update available, return
        if(!this.info.updateAvailable) return false;

        // Prepare the directory paths
        const oldDirName = this.info.gameDirectory.split("\\").pop();
        const dirpath = this.info.gameDirectory.replace(oldDirName, "");
        const modVariant = this._updateInfo.isMod ? "[MOD]" : "";

        // Clean the path
        let dirname = `${this._updateInfo.name} [v.${this._updateInfo.version}] ${modVariant}`;
        dirname = dirname.replace(/[/\\?%*:|"<>]/g, " ").trim(); // Remove invalid chars
        const newpath = window.API.join(dirpath, dirname);

        // Rename the old path
        const exists = await window.IO.pathExists(newpath);
        if (exists) return false;
        window.IO.renameDir(this.info.gameDirectory, newpath);

        // Update info
        this._updateInfo.gameDirectory = newpath;
        this.info = this._updateInfo;
        this.info.updateAvailable = false;

        // Save info
        await this.saveData();

        // Hide the update button
        this.querySelector(".update-p").style.display = "none";
        return true;
    }
    //#endregion Public methods
}

// Let the browser know that <game-card> is served by our new class
customElements.define("game-card", GameCard);
