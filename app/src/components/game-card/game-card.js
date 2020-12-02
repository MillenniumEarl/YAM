"use strict";

// Manage unhandled errors
window.onerror = function (message, source, lineno, colno, error) {
    window.API.log.error(`${message} at line ${lineno}:${colno}.\n${error.stack}`);

    window.API.invoke("require-messagebox", {
        type: "error",
        title: "Unhandled error",
        message: `${message} at line ${lineno}:${colno}.\n
        It is advisable to terminate the application to avoid unpredictable behavior.\n
        ${error.stack}\n
        Please report this error on https://github.com/MillenniumEarl/F95GameUpdater`,
        buttons: [{
            name: "close"
        }]
    });
};

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
        /**
         * Default image to use when the game preview is not available.
         */
        this.DEFAULT_IMAGE = "../../resources/images/f95-logo.webp";
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

        // Prepare the preview (download and compress)
        if (this.info.previewSrc) this._preparePreview();

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
    async playEvent() {
        // Save the current date as last played session
        this.info.lastPlayed = new Date(Date.now());
        await this.saveData();

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
        this._checkForCachedUpdateThenOnline = this._checkForCachedUpdateThenOnline.bind(this);
        this._fetchUpdate = this._fetchUpdate.bind(this);
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
        this.querySelector("#gc-game-folder").setAttribute("href", `file:///${this.info.gameDirectory}`);
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
        const source = await this._parsePreviewPath();
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
     * Parse a path and return the name of that image.
     * @param {String} name Custom name to prepend
     * @param {String} source Path/URL of the image
     * @param {String} [customExtension] Custom extension to set for the image name
     */
    _parseImageName(name, source, customExtension) {
        // Get image extension
        const splitted = source.split(".");
        const extension = customExtension ? customExtension : splitted.pop();

        // Parse the name
        const imageName = `${name.replaceAll(" ", "")}_preview.${extension}`;
        const rx = /[/\\?%*:|"<>]/g; // Remove invalid chars
        return imageName.replace(rx, "");
    }

    /**
     * @private
     * Download the game cover image.
     * @param {String} source Current URL of the image
     * @param {String} dest Path where save the downloaded image
     */
    async _downloadGamePreview(source, dest) {
        // Check if it's possible to download the image
        if (source.trim() === "") return false;
        if (source.trim() === this.DEFAULT_IMAGE)
            return false;

        // Download image
        let path = null;
        try {
            path = await window.API.downloadImage(source, dest);
            if (!path.filename) {
                window.API.log.error(`Something went wrong when downloading ${source}`);
                return false; // Something went wrong
            }
        }
        catch(e) {
            window.API.log.error(`Cannot download ${source}: ${e}`);
            return false;
        }

        // Downloaded succesfully
        return true;
    }

    /**
     * @private
     * Convert an image to Webp or compress it if it's a GIF.
     * @param {*} source Path to the image to compress
     * @param {*} folder Path to save folder
     * @returns {Promise<String|null>} Path to the compressed file or `null` if something went wrong
     */
    async _compressGamePreview(source, folder) {
        // Compress image (given path and destination folder)
        const compressionResult = await window.API.compress(source, folder);

        // Something wrong with compression
        if (compressionResult.length !== 1) {
            window.API.log.error(`Something went wrong when compressing ${source}`);
            return null;
        }

        // Delete original image
        if (compressionResult[0].sourcePath !== compressionResult[0].destinationPath) {
            window.IO.deleteFile(source);
        }

        // Return image name
        const isGIF = source.endsWith(".gif");
        const ext = isGIF ? "gif" : "webp";
        return window.API.join(folder, this._parseImageName(name, source, ext));
    }

    /**
     * @private
     * Get the path to the preview source of the game.
     * @returns {Promise<String>} Path to the preview (online or offline)
     */
    async _parsePreviewPath() {
        // First check the cached preview
        if(this.info.localPreviewPath) {
            const previewDir = await window.API.invoke("preview-dir");
            const previewPath = window.API.join(previewDir, this.info.localPreviewPath);

            // Check if the image exists
            const exists = await window.IO.pathExists(previewPath);
            if (exists) return previewPath;
        }

        // Then check the online preview
        try {
            // It's a URL
            const url = new URL(this.info.previewSrc);
            return url.toString();
        }
        catch {
            // It's not a URL, return the default image
            return this.DEFAULT_IMAGE;
        }
    }

    /**
     * @private
     * Prepare the preview of the game, download and compressing it.
     */
    async _preparePreview() {
        // Create the download path for the preview
        const previewDir = await window.API.invoke("preview-dir");
        const imageName = this._parseImageName(this.info.name, this.info.previewSrc);
        const downloadDest = window.API.join(previewDir, imageName);

        // Check if the image already exists
        if (this.info.localPreviewPath) {
            const localPath = window.API.join(previewDir, this.info.localPreviewPath);
            const exists = await window.IO.pathExists(localPath);
            if (exists) return true; // Preview already exists
        }

        // Download the image
        const downloadResult = await this._downloadGamePreview(this.info.previewSrc, downloadDest);
        if (!downloadResult) return false;

        // Compress the image
        const compressDest = await this._compressGamePreview(downloadDest, previewDir);
        if(!compressDest) return false;
        const compressedImageName = this._parseImageName(this.info.name, compressDest);

        // All right, set the new preview path and save data
        if (compressedImageName) this.info.localPreviewPath = compressedImageName;
        await this.saveData();
        return true;
    }

    /**
     * @private
     * Get the difference in days between two dates.
     * @param {Date} a 
     * @param {Date} b 
     */
    _dateDiffInDays(a, b) {
        const MS_PER_DAY = 1000 * 60 * 60 * 24;

        // Discard the time and time-zone information.
        const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
        const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

        return Math.floor((utc2 - utc1) / MS_PER_DAY);
    }

    /**
     * @private
     * Check for the cached update in the database 
     * and if it's not present or it is too old 
     * check update online.
     * @return {Promise<Boolean>}
     */
    async _checkForCachedUpdateThenOnline() {
        // Local variables
        const MAX_CACHE_DAYS = 3;

        // Check for updates in the database
        const updateDB = await window.UpdateDB.search({
            id: this.info.id
        });

        if (updateDB.length === 1) {
            // Check if the cache is valid, i.e. is not too old
            const diff = this._dateDiffInDays(new Date(Date.now()), updateDB[0].createdAt);
            if (diff <= MAX_CACHE_DAYS) return true;
            // Cache too old, delete from db
            else await window.UpdateDB.delete(updateDB[0]._id);
        }

        // Check for updates online...
        return await window.F95.checkGameUpdates(this.info);
    }

    /**
     * @private
     * Fetch the game update from the database (if exists) or online.
     * @return {Promise<GameInfoExtended>}
     */
    async _fetchUpdate() {
        // Local variables
        let gameinfo = null;

        // Get the update from the database
        const updateDB = await window.UpdateDB.search({
            id: this.info.id
        });

        // Get the update from the DB or online
        if (updateDB.length === 0) {
            // Update available online, fetch data...
            const result = await window.F95.getGameDataFromURL(this.info.url);
            gameinfo = window.GIE.convert(result);

            // Save the update to database
            await window.UpdateDB.insert(gameinfo);
        } else gameinfo = updateDB[0];
        return gameinfo;
    }
    //#endregion Private methods

    //#region Public methods
    /**
     * @public
     * Save game data in the database.
     */
    async saveData() {
        // Save in the database
        await window.GameDB.write(this.info);
    }

    /**
     * @public
     * Load game data from database.
     * @param {number} id ID of the game as record in the database
     */
    async loadData(id) {
        this.info = await window.GameDB.read(id);
    }

    /**
     * @public
     * Delete the stored game data.
     */
    async deleteData() {
        // Delete the record in the database
        await window.GameDB.delete(this.info._id);

        // Check the cached preview
        if (!this.info.localPreviewPath) return;

        // Delete the cached preview
        const previewPath = await this._parsePreviewPath();
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

        // Check update...
        const update = await this._checkForCachedUpdateThenOnline();
        if(!update) {
            // Hide progressbar
            this.progressbar.style.display = "none";
            return;
        }

        // Get update
        const gameinfo = await this._fetchUpdate();
        
        // Change the text of the button
        const length = this.updateBtn.childNodes.length;
        const element = this.updateBtn.childNodes[length - 1];
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
        const oldDirName = window.API.getDirName(this.info.gameDirectory);
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
        const dbid = this.info._id;
        this._updateInfo.gameDirectory = newpath;
        this.info = this._updateInfo;
        this.info.updateAvailable = false;
        this.info._id = dbid;

        // Save info
        await this.saveData();

        // Delete entry from cahced update DB
        const entry = await window.UpdateDB.search({id: this.info.id});
        if (entry.length === 1) await window.UpdateDB.delete(entry[0]._id);

        // Hide the update button
        this.querySelector(".update-p").style.display = "none";
        return true;
    }
    //#endregion Public methods
}

// Let the browser know that <game-card> is served by our new class
customElements.define("game-card", GameCard);
