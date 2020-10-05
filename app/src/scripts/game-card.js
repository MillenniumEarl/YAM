"use strict";

/* Defines the HTML code of the custom element */
const template = document.createElement("template");

/* Synchronous read of the HTML template */
template.innerHTML = window.api.send("read-file", "../components/game-card.html");

class GameCard extends HTMLElement {
    constructor() {
        super();

        /* Use the F95API classes (Need main-preload) */
        this.info = new window.api.GameInfo();
        
        /* Binds the methods to the class's methods */
        this.play = playGame.bind(this);
        this.update = updateGame.bind(this);
        this.delete = deleteGame.bind(this);

        this.attachShadow({
            mode: 'open'
        });
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        this.playBtn = this.shadowRoot.getElementById("play-game-btn");
        this.updateBtn = this.shadowRoot.getElementById("update-game-btn");
        this.deleteBtn = this.shadowRoot.getElementById("delete-game-btn");
    }

    /**
     * Triggered once the element is added to the DOM 
     */
    connectedCallback() {
        /* Set events listeners for the buttons */
        this.playBtn.addEventListener('click', this.play);
        this.updateBtn.addEventListener('click', this.update);
        this.deleteBtn.addEventListener('click', this.delete);
    }

    /**
    * Triggered once the element is removed from the DOM
    */
    disconnectedCallback() {
        /* Remove events listeners for the buttons*/
        this.playBtn.removeEventListener('click', this.play);
        this.updateBtn.removeEventListener('click', this.update);
        this.deleteBtn.removeEventListener('click', this.delete);
    }

    set info(value) {
        if (!value) return;
        this.info = value;

        // Set HTML elements
        this.querySelector('#gameName').innerText = value.isMod ? '[MOD] ' + value.name : value.name;
        this.querySelector('#gameAuthor').innerText = value.author;
        this.querySelector('#f95GameURL').setAttribute('href', value.f95url);
        this.querySelector('#gameOverview').innerText = value.overview;
        this.querySelector('#gameEngine').innerText = value.engine;
        this.querySelector('#gameStatus').innerText = value.status;
        const source = value.previewSource ? value.previewSource : '../../../resources/images/f95-logo.jpg';
        this.querySelector('#gameImage').setAttribute('src', source);
        this.querySelector('#gameInstalledVersion').innerText = value.version;
        this.querySelector('#gameLastUpdate').innerText = value.lastUpdate;
    }

    get info() {
        return this.info;
    }
}

// Let the browser know that game-card> is served by our new class
customElements.define("game-card", GameCard);

//#region Events
/**
 * @event
 * Triggered when user wants to play the game.
 */
function playGame() {
    console.log("play");
    // Get the game launcher
    let launcherPath = getGameLauncher(this.info.gameDir);

    // Raise the event
    this.playClickEvent = new CustomEvent("play", {
        detail: {
            launcher: launcherPath
        }
    });
    this.dispatchEvent(playClickEvent);
}

/**
 * @event
 * Triggered when user wants to update the game (and an update is available).
 */
function updateGame() {
    console.log("update");
    // Raise the event
    this.updateClickEvent = new CustomEvent("update", {
        detail: {
            gameDir: this.info.gameDir
        }
    });
    this.dispatchEvent(updateClickEvent);
}

/**
 * @event
 * Triggered when user wants to delete the game.
 */
function deleteGame() {
    console.log("delete");
    // Raise the event
    this.deleteClickEvent = new CustomEvent("delete", {
        detail: {
            gameDir: this.info.gameDir
        }
    });
    this.dispatchEvent(deleteClickEvent);
}
//#endregion Events

//#region Private methods
/**
 * Search for a compatible game launcher for the current OS.
 * @param {String} gameDir Directory where looking for the launcher
 * @returns {String} Launcher of the game or null if no file are found
 */
function getGameLauncher(gameDir) {
    // Get the extension matching the current OS
    var extension = "";

    if (window.osPlatform == "win32") extension = "exe";
    else if (window.osPlatform == "darwin") extension = "sh"; // TODO -> not so sure
    else if (window.osPlatform = "linux") extension = "py"; // TODO -> not so sure
    else return null;

    // Find the launcher
    let files = window.glob.sync("*." + extension, {
        cwd: gameDir
    });
    if (files.length === 0) {
        // Try with HTML
        files = window.glob.sync("*.html", {
            cwd: gameDir
        });
    }

    if (files.length === 0) return null;
    else return window.join(gameDir, files[0]);
}

/**
 * @private
 * Download the game cover image.
 * @param {String} name Game name
 * @param {URL} previewSource Current URL of the image
 * @returns {String} Local path to the image or null if it was not downloaded
 */
function downloadGamePreview(name, previewSource) {
    // Check if it's possible to download the image
    if (previewSource.toString() === '') return null;
    if (previewSource.toString() === './images/f95CompactLogo.jpg') return null;
    if (window.existsSync(previewSource.toString())) return null; // Already downloaded

    // Get image extension
    var splitted = previewSource.toString().split('.');
    var extension = splitted.pop();
    const IMAGE_NAME = name.replaceAll(' ', '') + '_preview.' + extension;

    // Download image
    const BASE_DIR = window.AppCostant.GAME_DATA_DIR;
    var localPreviewPath = window.join(BASE_DIR, IMAGE_NAME);
    var downloaded = window.downloadImage(previewSource, localPreviewPath);

    if (downloaded) return localPreviewPath;
    else return null;
}

/**
 * @private
 * Save component data to disk as a JSON string.
 * @param {GameCard} gameCard Component to save data for
 */
function saveGameData(gameCard) {
    // Download preview image
    var previewLocalPath = downloadGamePreview(gameCard.info.name, gameCard.info.previewSource);
    if (previewLocalPath) gameCard.info.previewSource = previewLocalPath;

    // Join save path
    const BASE_DIR = window.AppCostant.GAME_DATA_DIR;
    const FILE_NAME = gameCard.info.name.replaceAll(' ', '') + '_data.json';
    var savePath = window.join(BASE_DIR, FILE_NAME);

    // Save the serialized JSON
    window.writeFileSync(savePath, JSON.stringify(gameCard.info));
}

/**
 * @private
 * Load component data from disk.
 * @param {String} path Path where the data to be loaded are located
 * @param {GameCard} gameCard Component to load data for
 */
function loadGameData(path, gameCard) {
    // Load the serialized JSON
    var json = window.readFileSync(path);
    var obj = JSON.parse(json);

    // Load object
    gameCard.info = obj;
}
//#endregion Private methods