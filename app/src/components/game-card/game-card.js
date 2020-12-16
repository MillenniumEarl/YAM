"use strict";

/**
 * @event
 * Handles errors generated by the application.
 * @param {String} message Error message
 * @param {String} source File where the error occurred
 * @param {number} lineno Line containing the instruction that generated the error
 * @param {number} colno Column containing the statement that generated the error
 * @param {Error} error Application generated error
 */
window.onerror = function (message, source, lineno, colno, error) {
    window.EM.onerror("game-card.js", {
        message: message,
        line: lineno,
        column: colno,
        error: error,
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
        this.info.gameSessions += 1;
        await this.saveData().catch(e => window.API.reportError(e, "20301", "this.saveData", "playEvent"));

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
                savePaths: await window.GIE.saves(this.info)
                    .catch(e => window.API.reportError(e, "20302", "window.GIE.saves", "deleteEvent", `Args: ${this.info}`))
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
        this._validateCache = this._validateCache.bind(this);
        this._updateName = this._updateName.bind(this);
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

        // Show/hide last update date
        const lastUpdateElement = this.querySelector("#gc-last-update");
        let display = "none";
        if (this.info.lastUpdate) {
            // Date in format YYYY-mm-dd
            const datestring = this.info.lastUpdate.toISOString().split("T")[0];
            lastUpdateElement.innerText = datestring;

            // Show element
            display = "block";
        }
        lastUpdateElement.style.display = display;

        this.querySelector("#gc-installed-version").innerText = this.info.version;

        // Parse the relative path of the image (asynchronusly)
        const source = await this._parsePreviewPath().catch(e => window.API.reportError(e, "20303", "this._parsePreviewPath", "_refreshUI"));
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
        const elements = document.querySelectorAll(".localizable");

        // Translate elements
        for (const e of elements) {
            // Select the element to translate (the last child or the element itself)
            const toTranslate = e.lastChild ?? e;
            toTranslate.textContent = await window.API.translate(e.id);
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
        // Local variables
        let returnValue = false;

        // Check if it's possible to download the image
        const trimmed = source.trim();
        if (trimmed !== "" && trimmed !== this.DEFAULT_IMAGE) {
            // Download image
            await window.API.downloadImage(source, dest)
                .catch(e => window.API.reportError(e, "20304", "window.API.downloadImage", "_downloadGamePreview", `Source: ${source}, Dest: ${dest}`));

            // Downloaded succesfully
            returnValue = true;
        }
        return returnValue;
    }

    /**
     * @private
     * Convert an image to WEBP or compress it if it's a GIF.
     * @param {String} source Path to the image to compress
     * @param {String} folder Path to save folder
     * @returns {Promise<String|null>} Path to the compressed file or `null` if something went wrong
     */
    async _compressGamePreview(source, folder) {
        // Compress image (given path and destination folder)
        const compressionResult = await window.API.compress(source, folder)
            .catch(e => window.API.reportError(e, "20305", "window.API.compress", "_compressGamePreview", `Source: ${source}, Folder: ${folder}`));

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
     * Download and compress the game preview.
     */
    async _savePreviewToDisk() {
        // Local variables
        let returnValue = false;

        // Create the download path for the preview
        const previewDir = await window.API.invoke("preview-dir");
        const imageName = this._parseImageName(this.info.name, this.info.previewSrc);
        const downloadDest = window.API.join(previewDir, imageName);

        // Download the image
        const downloadResult = await this._downloadGamePreview(this.info.previewSrc, downloadDest)
            .catch(e => window.API.reportError(e, "20306", "this._downloadGamePreview", "_preparePreview"));
        
        if (downloadResult) {
            // Compress the image
            const compressDest = await this._compressGamePreview(downloadDest, previewDir)
                .catch(e => window.API.reportError(e, "20307", "this._compressGamePreview", "_preparePreview"));
            
            if (compressDest) {
                const compressedImageName = this._parseImageName(this.info.name, compressDest);

                // All right, set the new preview path and save data
                this.info.localPreviewPath = compressedImageName;
                await this.saveData()
                    .catch(e => window.API.reportError(e, "20308", "this.saveData", "_preparePreview"));
                returnValue = true;
            }
        }
        return returnValue;
    }

    /**
     * @private
     * Check if the preview is to be downloaded to disk.
     */
    async _previewNeedToBeDownloaded() {
        // Local variables
        const previewDir = await window.API.invoke("preview-dir");
        let returnValue = false;

        if (!this.info.localPreviewPath) returnValue = true;
        else {
            const localPath = window.API.join(previewDir, this.info.localPreviewPath);
            const exists = await window.IO.pathExists(localPath);
            returnValue = !exists;
        }
        return returnValue;
    }

    /**
     * @private
     * Prepare the preview of the game, download and compressing it.
     */
    async _preparePreview() {
        // Local variables
        let returnValue = false;

        // Check if the image already exists
        const needToBeDownloaded = await this._previewNeedToBeDownloaded();

        // Download and compress the preview
        if (needToBeDownloaded) returnValue = await this._savePreviewToDisk();

        return returnValue;
    }

    /**
     * @private
     * Rename a file.
     * @param {String} newpath 
     * @param {String} oldpath 
     */
    async _rename(newpath, oldpath) {
        // Rename the old path
        const existsNew = await window.IO.pathExists(newpath);
        const existsOld = await window.IO.pathExists(oldpath);

        // Rename the directory if exists
        if (!existsNew && existsOld) window.IO.renameDir(oldpath, newpath);
        return !existsNew && existsOld;
    }

    /**
     * @private
     * Update the name of the directory containing the game data.
     * @param {String} name Name of the game
     * @param {String} version Version of the game
     * @param {Boolean} isMod Indicates if the game is a mod
     * @return {Promise<String|null>} 
     * New path of the game directory or `null` if the paths are the same
     */
    async _updateName(name, version, isMod) {
        // Local variablses
        let returnValue = null;

        // Prepare the directory paths
        const oldDirName = window.API.getDirName(this.info.gameDirectory);
        const dirpath = this.info.gameDirectory.replace(oldDirName, "");
        const modVariant = isMod ? "[MOD]" : "";

        // Clean the path
        let dirname = `${name} [v.${version}] ${modVariant}`.replace(/[/\\?%*:|"<>]/g, "").trim();
        dirname = dirname.replace(/[/\\?%*:|"<>]/g, "").trim(); // Remove invalid chars
        const newpath = window.API.join(dirpath, dirname);

        // Rename the directory
        if (oldDirName !== dirname && await this._rename(newpath, this.info.gameDirectory)) returnValue = newpath;
        return returnValue;
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
     * Check if the record is not too old and if so delete it from database.
     * @param {ThreadInfo} record 
     */
    async _validateCache(record) {
        // Local variables
        const MAX_CACHE_DAYS = 3;
        let returnValue = false;

        // Check if the cache is valid, i.e. is not too old
        const diff = this._dateDiffInDays(new Date(Date.now()), record.createdAt);

        // Cache too old, delete from db
        if (diff > MAX_CACHE_DAYS) {
            await window.UpdateDB.delete({id: record.id})
                .catch(e => window.API.reportError(e, "20309", 
                    "window.UpdateDB.delete", "_validateCache", `DBID: ${record._id}`));
            returnValue = true;
        }
        return returnValue;
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
        let returnValue = false;

        // Check for updates in the database
        const updateDB = await window.UpdateDB.search({
            id: this.info.id
        }).catch(e => window.API.reportError(e, "20310", "window.UpdateDB.search", "_checkForCachedUpdateThenOnline", `ID: ${this.info.id}`));

        if (updateDB.length === 1) returnValue = await this._validateCache(updateDB[0]);

        // Check for updates online...
        returnValue = await window.F95.checkGameUpdates(this.info)
            .catch(e => window.API.reportError(e, "20311", "this._compressGamePreview", "_checkForCachedUpdateThenOnline", `URL: ${this.info.url}`));
        return returnValue;
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
        }).catch(e => window.API.reportError(e, "20312", "window.UpdateDB.search", "_fetchUpdate"));
        
        // Get the update from the DB or online
        if (updateDB.length === 0) {
            // Update available online, fetch data...
            const result = await window.F95.getGameDataFromURL(this.info.url)
                .catch(e => window.API.reportError(e, "20313", "window.F95.getGameDataFromURL", "_fetchUpdate", `URL: ${this.info.url}`));
            gameinfo = window.GIE.convert(result);

            // Save the update to database
            await window.UpdateDB.insert(gameinfo)
                .catch(e => window.API.reportError(e, "20314", "window.UpdateDB.insert", "_fetchUpdate"));
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
        // Update the name of the directory containing the game
        const newpath = await this._updateName(
            this.info.name,
            this.info.version,
            this.info.isMod)
            .catch(e => window.API.reportError(e, "20315", "this._updateName", "saveData"));
        if (newpath) this.info.gameDirectory = newpath;

        // Save in the database
        await window.GameDB.write(this.info)
            .catch(e => window.API.reportError(e, "20316",
                "window.GameDB.write", "saveData", `Info: ${this.info}`));
    }

    /**
     * @public
     * Load game data from database.
     * @param {number} id ID of the game as record in the database
     */
    async loadData(id) {
        this.info = await window.GameDB.read(id)
            .catch(e => window.API.reportError(e, "20317", "window.GameDB.read", "loadData",`ID: ${id}`));
    }

    /**
     * @public
     * Delete the stored game data.
     */
    async deleteData() {
        // Delete the record in the database
        await window.GameDB.delete({id: this.info.id})
            .catch(e => window.API.reportError(e, "20318", "window.GameDB.delete", "deleteData", `DBID: ${this.info._id}`));

        // Check the cached preview
        if (!this.info.localPreviewPath) return;

        // Delete the cached preview
        const previewPath = await this._parsePreviewPath()
            .catch(e => window.API.reportError(e, "20319", "this._parsePreviewPath", "deleteData"));
        const exists = await window.IO.pathExists(previewPath);
        if (exists) await window.IO.deleteFile(previewPath)
            .catch(e => window.API.reportError(e, "20320", "await window.IO.deleteFile", "deleteData", `Path: ${previewPath}`));
    }

    /**
     * Check if there is an update for the game. 
     * If so, the card will show the 'Update' button.
     */
    async checkUpdate() {
        // Show the progress bar
        this.progressbar.style.display = "block";

        // Check update...
        const update = await this._checkForCachedUpdateThenOnline()
            .catch(e => window.API.reportError(e, "20321", "this._checkForCachedUpdateThenOnline", "checkUpdate"));
        if(!update) {
            // Hide progressbar
            this.progressbar.style.display = "none";
            return;
        }

        // Get update
        const gameinfo = await this._fetchUpdate()
            .catch(e => window.API.reportError(e, "20322", "this._fetchUpdate", "checkUpdate"));
        
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

        // Update the name of the directory containing the game
        const newpath = await this._updateName(
            this._updateInfo.name,
            this._updateInfo.version, 
            this._updateInfo.isMod)
            .catch(e => window.API.reportError(e, "20323", "this._updateName", "update"));

        // Update info
        const dbid = this.info._id;
        this._updateInfo.gameDirectory = newpath;
        this.info = this._updateInfo;
        this.info.updateAvailable = false;
        this.info._id = dbid;

        // Save info
        await this.saveData()
            .catch(e => window.API.reportError(e, "20324", "this.saveData", "update"));

        // Delete entry from cahced update DB
        const entry = await window.UpdateDB.search({id: this.info.id})
            .catch(e => window.API.reportError(e, "20325", "window.UpdateDB.search", "update", `ID: ${this.info.id}`));
        if (entry.length === 1) await window.UpdateDB.delete({id: entry[0].id})
            .catch(e => window.API.reportError(e, "20326", "window.UpdateDB.delete", "update", `DBID: ${entry[0]._id}`));

        // Hide the update button
        this.querySelector(".update-p").style.display = "none";
        return true;
    }
    //#endregion Public methods
}

// Let the browser know that <game-card> is served by our new class
customElements.define("game-card", GameCard);
