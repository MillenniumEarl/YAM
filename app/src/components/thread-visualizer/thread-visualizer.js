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

class ThreadVisualizer extends HTMLElement {
    constructor() {
        super();

        /**
         * @private
         * Information about the game shown by this component.
         * @type GameInfoExtended
         */
        this._info = null;
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

    //#region Properties
    /**
     * Game information shown on this card
     */
    set info(value) {
        if (!value) throw new Error("Invalid value");
        this._info = value;

        // DOM not ready, cannot update information
        if (!this._loadedDOM) return;

        // Refresh data
        window.requestAnimationFrame(() => this._refreshUI());
    }

    /**
     * Game information shown on this card.
     */
    get info() {
        return this._info;
    }
    ////#endregion Properties

    /**
     * Triggered once the element is added to the DOM
     */
    connectedCallback() {
        // Prepare DOM
        this._prepareDOM();

        /* Set events listeners for the buttons */
        this.markAsReadBtn.addEventListener("click", this._markAsRead);

        // Refresh data
        if(this.info) window.requestAnimationFrame(() => this._refreshUI());
    }

    /**
     * Triggered once the element is removed from the DOM
     */
    disconnectedCallback() {
        /* Remove events listeners for the buttons*/
        this.markAsReadBtn.removeEventListener("click", this._markAsRead);
    }

    //#region Events
    /**
     * @event
     * Triggered when user wants to play the game.
     */
    login() {
        // Raise the event
        this.loginClickEvent = new Event("login");
        this.dispatchEvent(this.loginClickEvent);
    }
    //#endregion Events

    //#region Private methods
    /**
     * @private
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
            "thread-visualizer",
            "thread-visualizer.html"
        );
        template.innerHTML = window.IO.readSync(pathHTML);
        this.appendChild(template.content.cloneNode(true));

        /* Define elements in DOM */
        this.openThreadBtn = this.querySelector("#tv-visit");
        this.markAsReadBtn = this.querySelector("#tv-mark-read");
        this.gamePreview = this.querySelector("#game-preview");
        this.gameInfo = this.querySelector("#game-info");

        /* Bind function to use this */
        this._markAsRead = this._markAsRead.bind(this);
        this._refreshUI = this._refreshUI.bind(this);

        /* Translate DOM */
        this._translateElementsInDOM();
        this._loadedDOM = true;
    }

    /**
     * @private
     * Translate the DOM elements in the current language.
     */
    async _translateElementsInDOM() {
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
     * @private
     * Mark the thread as read.
     */
    async _markAsRead() {
        // Update the value
        this.info.markedAsRead = true;
        await window.ThreadDB.write(this.info);

        // Hide the element
        this.style.display = "none";
    }

    /**
     * @private
     * Update the data shown on the item.
     */
    async _refreshUI() {
        this.openThreadBtn.setAttribute("href", this.info.url);
        const preview = this.info.previewSrc ? this.info.previewSrc : this.DEFAULT_IMAGE;
        this.gamePreview.setAttribute("src", preview);
        this.gameInfo.textContent = `${this.info.name} - ${this.info.author} (${this.info.version})`;
    }

    //#endregion Private methods
}

// Let the browser know that <thread-visualizer> is served by our new class
customElements.define("thread-visualizer", ThreadVisualizer);
