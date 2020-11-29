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

class CardPaginator extends HTMLElement {
    constructor() {
        super();

        /**
         * Maximum number of cards viewable per page, must be a multiple of 4.
         */
        this.CARDS_FOR_PAGE = 8;
        /**
         * Maximum number of selectors available at any time 
         * for the user to be used. It must be an odd value.
         */
        this.MAX_VISIBLE_PAGES = 5;
        /**
         * Dictionary used by NeDB to filter results from the database.
         * `{}` selects all records.
         * @type Object
         */
        this._searchQuery = {};
        /**
         * Dictionary used by NeDB to sort results from the database.
         * @type Object
         */
        this._sortQuery = {name: 1};
        /**
         * Function called when the `play` event occurs on a GameCard.
         * @type function
         */
        this._playEventListener = null;
        /**
         * Function called when the `update` event occurs on a GameCard.
         * @type function
         */
        this._updateEventListener = null;
        /**
         * Function called when the `delete` event occurs on a GameCard.
         * @type function
         */
        this._deleteEventListener = null;
        /**
         * Indicates whether the component is loading data.
         * @type Boolean
         */
        this._isLoading = false;
    }

    //#region Properties
    /**
     * Sets the function called when the `play` 
     * event occurs on a GameCard.
     * @param {function} f
     */
    set playListener(f) {
        this._playEventListener = f;
    }

    /**
     * Sets the function called when the `update` 
     * event occurs on a GameCard.
     * @param {function} f
     */
    set updateListener(f) {
        this._updateEventListener = f;
    }

    /**
     * Sets the function called when the `delete` 
     * event occurs on a GameCard.
     * @param {function} f
     */
    set deleteListener(f) {
        this._deleteEventListener = f;
    }
    //#endregion Properties

    /**
     * Triggered once the element is added to the DOM
     */
    connectedCallback() {
        // Prepare DOM
        this._prepareDOM();
        window.API.log.info("Paginator connected to DOM");
    }

    //#region Events
    /**
     * @private
     * Select the page following the one currently active.
     * @param {MouseEvent} e
     */
    _nextPage(e) {
        // Ignore event if the button is disabled
        if (e.target.parentNode.classList.contains("disabled")) return;

        // Obtain the ID of the currently selected page selector
        const index = this._getCurrentIndex();
        if (index === -1) return;
        this._switchContext(index + 1);
        window.API.log.info(`Switched context to ${index + 1} after user click (nextPage)`);
    }

    /**
     * @private
     * Select the page preceding the one currently active.
     * @param {MouseEvent} e
     */
    _prevPage(e) {
        // Ignore event if the button is disabled
        if(e.target.parentNode.classList.contains("disabled")) return;

        // Obtain the ID of the currently selected page selector
        const index = this._getCurrentIndex();
        if (index === -1) return;
        this._switchContext(index - 1);
        window.API.log.info(`Switched context to ${index - 1} after user click (prevPage)`);
    }

    /**
     * @private
     * Generated when clicking on a selector, changes the displayed page.
     * @param {MouseEvent} e
     */
    async _selectPage(e) {
        const selectorID = e.target.parentNode.id;
        const index = parseInt(selectorID.replace("selector_", ""));
        const shouldSwitch = await this._shouldISwitch(index);
        if (shouldSwitch) {
            this._switchContext(index);
            window.API.log.info(`Switched context to ${index} after user click`);
        }
    }

    /**
     * Switch page when the right/left arrow on keyboard are pressed.
     * @param {KeyboardEvent} e
     */
    _keyboardShortcut(e) {
        // Check if the key pressed is valid
        const validShortcut = ["ArrowRight", "ArrowLeft"].includes(e.key);
        if(!validShortcut) return;

        // Avoid new query if the component is already loading
        if (this._isLoading) return;

        // Obtain the ID of the currently selected page selector
        const index = this._getCurrentIndex();
        if (index === -1) return;
        
        // Calculate the new index
        let nextIndex = 0;
        if (e.key === "ArrowRight") nextIndex = index + 1;
        else if (e.key === "ArrowLeft") nextIndex = index - 1;

        // Switch page
        this._switchContext(nextIndex);
        window.API.log.info(`Switched context to ${nextIndex} after user shortcut`);
    }
    
    //#endregion Events

    //#region Public methods
    
    /**
     * @public
     * Load and show the first page of the records in the database.
     * @param {number} [index] Index of the page to show. Default: 0
     */
    async load(index = 0) {
        // Avoid new query if the component is already loading
        if(this._isLoading) return;

        // Check if the switch is necessary
        const shouldSwitch = await this._shouldISwitch(index);
        if (shouldSwitch) {
            window.API.log.info(`Loading paginator at page ${index}`);
            this._switchContext(index);
        }
    }

    /**
     * @public
     * Find all games that contain the specified value in the title.
     * @param {String} name Case-sensitive value to search
     */
    async search(value) {
        const FIRST_PAGE = 0;

        // Avoid new query if the component is already loading
        if (this._isLoading) return;

        // Build the query (regex with case insensitive)
        if(value.trim() !== "") {
            const re = new RegExp(value, "i");
            this._searchQuery = {
                name: re
            };
        } else this._searchQuery = {};
        
        // Check if the switch is necessary
        const shouldSwitch = await this._shouldISwitch(FIRST_PAGE);
        if (shouldSwitch) {
            window.API.log.info(`Searching for ${value} in paginator`);
            
            // Load the first page
            this._switchContext(FIRST_PAGE);
        }
    }

    /**
     * @public
     * Reload the current page.
     * Useful after adding/removing a card.
     */
    async reload() {
        // Avoid new query if the component is already loading
        if (this._isLoading) return;

        const currentIndex = this._getCurrentIndex();
        const index = currentIndex !== -1 ? currentIndex : 0;

        // Check if the switch is necessary
        const shouldSwitch = await this._shouldISwitch(index);
        if (shouldSwitch) {
            window.API.log.info(`Reloading page ${index}`);
            this._switchContext(index);
        }
    }

    /**
     * @public
     * Sort the gamecards with the specified method.
     * @deprecated Need improvement
     */
    sort(method) {
        // Avoid new query if the component is already loading
        if (this._isLoading) return;

        if(!method) this._sortQuery = {name: 1};
    }

    //#endregion Public methods

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
            "card-paginator",
            "card-paginator.html"
        );
        template.innerHTML = window.IO.readSync(pathHTML);
        this.appendChild(template.content.cloneNode(true));
        
        /* Define elements in DOM */
        this.root = this.querySelector("#paginator-root");
        this.content = this.querySelector("#pagination-content");
        this.pageSelectorsParent = this.querySelector("#pagination-page-selectors");
        this.preload = document.querySelector(".pagination-preload");

        /* Bind function to use this */
        this._getCurrentIndex = this._getCurrentIndex.bind(this);
        this._manageNextPrecButtons = this._manageNextPrecButtons.bind(this);
        this._createSelectorButton = this._createSelectorButton.bind(this);
        this._createPrevButton = this._createPrevButton.bind(this);
        this._createNextButton = this._createNextButton.bind(this);
        this._keyboardShortcut = this._keyboardShortcut.bind(this);
        this._prevPage = this._prevPage.bind(this);
        this._nextPage = this._nextPage.bind(this);
        this._switchPage = this._switchPage.bind(this);
        this._selectPage = this._selectPage.bind(this);
        this._getStartEndPages = this._getStartEndPages.bind(this);
        this._switchContext = this._switchContext.bind(this);
        this._createPageSelectors = this._createPageSelectors.bind(this);

        /* Add keyboard hooks */
        window.addEventListener("keydown", this._keyboardShortcut, true);
        
        window.API.log.info("Paginator prepared");
    }

    //#region Utility
    
    /**
     * @private
     * Gets the ID of the currently selected page selector.
     */
    _getCurrentIndex() {
        // get the active page, if none is found return -1
        const activePage = this.querySelector("li.active");
        if(!activePage) return -1;

        // Parse and return the current index
        return parseInt(activePage.id.replace("selector_", ""), 10);
    }

    /**
     * @private
     * Shows or hides the buttons for the previous/next page 
     * depending on the currently selected page selector.
     */
    async _manageNextPrecButtons() {
        // Get the elements
        const index = this._getCurrentIndex();
        if(index === -1) return;

        // Get elements
        const prevPageSelector = this.querySelector("#prev-page");
        const nextPageSelector = this.querySelector("#next-page");
        
        // Manage the prev button
        let toAdd = index === 0 ? "disabled" : "enabled";
        let toRemove = index === 0 ? "enabled" : "disabled";
        prevPageSelector.classList.remove(toRemove);
        prevPageSelector.classList.add(toAdd);

        // Manage the next button
        const recordsNumber = await window.GameDB.count(this._searchQuery);
        const nPages = Math.ceil(recordsNumber / this.CARDS_FOR_PAGE);
        toAdd = index === nPages - 1 ? "disabled" : "enabled";
        toRemove = index === nPages - 1 ? "enabled" : "disabled";
        nextPageSelector.classList.remove(toRemove);
        nextPageSelector.classList.add(toAdd);
    }

    /**
     * @private
     * Obtains the records of the page specified by `index`.
     * @param {number} index Index of the page to prepare
     * @param {number} size Size of each page
     * @returns {Promise<Object[]>} List of records fetched from the database
     */
    async _paginate(index, size) {
        return await window.GameDB.search(this._searchQuery, index, size, size, this._sortQuery);
    }

    /**
     * @private
     * Load the page with the index used as argument.
     * @param {number} index Index of the page to load
     */
    async _switchPage(index) {
        // Get the properties of the selected records
        const records = await this._paginate(index, this.CARDS_FOR_PAGE);

        // Remove all columns containing game cards (and save the cards)
        const columns = this.content.querySelectorAll("div.col");
        columns.forEach((column) => column.remove());

        // Create the game-cards
        const newColumns = [];
        const cards = [];
        for (const r of records) {
            // Create gamecard
            const gamecard = document.createElement("game-card");

            // Load info
            await gamecard.loadData(r._id);

            // Add cards listeners
            gamecard.addEventListener("play", this._playEventListener);
            gamecard.addEventListener("update", this._updateEventListener);
            gamecard.addEventListener("delete", this._deleteEventListener);

            // Add cards to page
            const column = this._createGridColumn();
            column.appendChild(gamecard);
            
            newColumns.push(column);
            cards.push(gamecard);
        }

        // Add all the new created columns to the page
        this.content.append(...newColumns);

        // Check for game updates AFTER the card is attached to DOM
        for(const card of cards) {
            card.checkUpdate();
        }
    }

    /**
     * @private
     * Gets the range of page indexes to display "around" the index passed as a parameter.
     * @param {number} index Index of the page to be displayed
     */
    async _getStartEndPages(index) {
        // Local variables
        const recordsNumber = await window.GameDB.count(this._searchQuery);
        const nPages = Math.ceil(recordsNumber / this.CARDS_FOR_PAGE);

        // If there aren't enough pages...
        if (nPages <= this.MAX_VISIBLE_PAGES) {
            if (index < 0 || index > nPages) {
                throw new Error(`index (${index}) must be between (0) and (${nPages})`);
            }
            return {
                start: 0,
                end: nPages - 1,
            };
        }

        // ...else, get the side number of visible page selectors
        const pageSideRange = Math.floor((this.MAX_VISIBLE_PAGES / 2));
        let start = index - pageSideRange;
        let end = index + pageSideRange;

        // Manage the "border" cases
        if (start < 0) {
            start = 0;
            end = this.MAX_VISIBLE_PAGES - 1;
        }
        if (end > nPages - 1) {
            start = nPages - this.MAX_VISIBLE_PAGES - 1;
            end = nPages - 1;
        }

        return {
            start: start,
            end: end,
        };
    }

    /**
     * @private
     * Change the page, showing the content and setting the page selectors appropriately.
     * @param {number} index Index of the page to be displayed
     */
    _switchContext(index) {
        // Define function
        const animationOnSwitchContext = (async () => {
            // Set global variable
            this._isLoading = true;

            // Show a circle preload and hide the content
            this.preload.style.display = "flex";
            this.content.style.display = "none";

            // Load the first page
            await this._switchPage(index);

            // Prepare the page selectors
            const limitPages = await this._getStartEndPages(index);

            // Remove all the page selectors
            this.pageSelectorsParent.querySelectorAll("li").forEach(n => n.remove());

            // Avoid creating selectors if there are no pages
            if (limitPages.end - limitPages.start > 0) {
                this._createPageSelectors(limitPages.start, limitPages.end + 1, index);

                // Set the current page as active
                const current = this.pageSelectorsParent.querySelector(`#selector_${index}`);
                current.classList.add("active");

                // Enable/disable the next/prev buttons
                await this._manageNextPrecButtons();
            }

            // Hide the circle preload and show the content
            this.preload.style.display = "none";
            this.content.style.display = "block";

            // Set global variable
            this._isLoading = false;
        });

        // Execute switch
        window.requestAnimationFrame(animationOnSwitchContext);
    }

    /**
     * @private
     * Check if a query produces new results to be paged 
     * or if you can avoid doing so because the new values 
     * are the same as those already present.
     * @param {number} index Index of the new page to be displayed
     */
    async _shouldISwitch(index) {
        // Get the records that should be paginated
        const records = await this._paginate(index, this.CARDS_FOR_PAGE);
        const toPaginateIDs = records.map(r => r.id); // Obtains the game ID's

        // Get the records that are in the page
        const gamecards = this.content.querySelectorAll("div.col > game-card");
        const paginatedIDs = Array.from(gamecards).map(g => g.info.id); // Obtains the game ID's

        // Check the lenght because "checker" check only 
        // if an array contains, not if it is equals.
        // See https://stackoverflow.com/questions/53606337/check-if-array-contains-all-elements-of-another-array
        if(toPaginateIDs.length !== paginatedIDs.length) return true;

        /**
         * Check if the elements of `arr` are all contained in `target`.
         * @param {Array} arr 
         * @param {Array} target 
         */
        const checker = (arr, target) => target.every(v => arr.includes(v));

        return !checker(toPaginateIDs, paginatedIDs);
    }
    //#endregion Utility

    //#region Creation
    /**
     * @private
     * Create the button to select the previous page selector.
     */
    _createPrevButton() {
        const prev = document.createElement("li");
        prev.classList.add("waves-effect");
        prev.id = "prev-page";
        prev.onclick = this._prevPage;

        // Create and add the icon
        const icon = document.createElement("a");
        icon.classList.add("material-icons");
        icon.innerText = "chevron_left";
        prev.appendChild(icon);

        return prev;
    }

    /**
     * @private
     * Create the button to select the next page selector.
     */
    _createNextButton() {
        const next = document.createElement("li");
        next.classList.add("waves-effect");
        next.id = "next-page";
        next.onclick = this._nextPage;

        // Create and add the icon
        const icon = document.createElement("a");
        icon.classList.add("material-icons");
        icon.innerText = "chevron_right";
        next.appendChild(icon);

        return next;
    }

    /**
     * @private
     * Create a generic page selector.
     * @param {number} index Index of the page associated with the selector
     */
    _createSelectorButton(index) {
        const li = document.createElement("li");
        li.id = `selector_${index}`;
        li.classList.add("waves-effect");

        // Create the page number
        const a = document.createElement("a");
        a.innerText = index + 1;
        li.appendChild(a);

        // Add the event listener
        li.onclick = this._selectPage;
        return li;
    }

    /**
     * @private
     * Create a responsive column that will hold a single gamecard.
     */
    _createGridColumn() {
        // Create a simil-table layout with materialize-css
        // "s6" means that the element occupies 6 of 12 columns with small screens
        // "m5" means that the element occupies 5 of 12 columns with medium screens
        // "l4" means that the element occupies 4 of 12 columns with large screens
        // "xl3" means that the element occupies 3 of 12 columns with very large screens
        // The 12 columns are the base layout provided by materialize-css
        const column = document.createElement("div");
        column.setAttribute("class", "col s6 m5 l4 xl3");
        return column;
    }

    /**
     * @private
     * Creates page selectors with index between `start` and `end`.
     * @param {number} start Create pages from the one with this index
     * @param {number} end Create pages up to this index (excluded)
     * @param {number} selected Selector index to be selected from those created
     */
    _createPageSelectors(start, end, selected) {
        // Validate selected index
        if(selected < start || selected > end) 
            throw new Error(`selected (${selected}) must be between start (${start}) and end (${end})`);
        
        // Create and adds the page selectors
        for (let i = start; i < end; i++) {
            const li = this._createSelectorButton(i);
            this.pageSelectorsParent.appendChild(li);
        }

        // Create the previous/next page selector
        const prev = this._createPrevButton();
        const next = this._createNextButton();

        // Add the previous page selector as first child
        // then the next page selector
        this.pageSelectorsParent.insertBefore(prev, this.pageSelectorsParent.firstChild);
        this.pageSelectorsParent.appendChild(next);
    }
    //#endregion Creation

    //#endregion Private methods
}

// Let the browser know that <card-paginator> is served by our new class
customElements.define("card-paginator", CardPaginator);