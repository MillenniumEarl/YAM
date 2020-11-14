"use strict";

class CardPaginator extends HTMLElement {
    constructor() {
        super();

        this.CARDS_FOR_PAGE = 8;
        this.MAX_VISIBLE_PAGES = 5;
        this._searchQuery = {};
        this._sortQuery = {name: 1};
    }

    /**
     * Triggered once the element is added to the DOM
     */
    connectedCallback() {
        // Prepare DOM
        this._prepareDOM();
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
    }

    /**
     * @private
     * Generated when clicking on a selector, changes the displayed page.
     * @param {MouseEvent} e
     */
    _selectPage(e) {
        const selectorID = e.target.parentNode.id;
        const index = parseInt(selectorID.replace("selector_", ""));
        this._switchContext(index);
    }
    
    //#endregion Events

    //#region Public methods
    
    /**
     * @public
     * Load and show the first page of the records in the database.
     */
    load() {
        this._switchContext(0);
    }

    /**
     * @public
     * Find all games that contain the specified value in the title.
     * @param {String} name Case-sensitive value to search
     */
    search(value) {
        // Build the query
        if(value.trim() !== "") {
            const re = new RegExp(value);
            this._searchQuery = {
                name: re
            };
        } else this._searchQuery = {};

        // Load the first page
        this._switchContext(0);
    }

    /**
     * @public
     * Reload the current page.
     * Useful after adding/removing a card.
     */
    reload() {
        const index = this._getCurrentIndex();
        this._switchContext(index);
    }

    /**
     * @public
     * Sort the gamecards with the specified method.
     * @deprecated Need improvement
     */
    sort(method) {
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

        /* Bind function to use this */
        this._getCurrentIndex = this._getCurrentIndex.bind(this);
        this._manageNextPrecButtons = this._manageNextPrecButtons.bind(this);
        this._createSelectorButton = this._createSelectorButton.bind(this);
        this._createPrevButton = this._createPrevButton.bind(this);
        this._createNextButton = this._createNextButton.bind(this);
        this._prevPage = this._prevPage.bind(this);
        this._nextPage = this._nextPage.bind(this);
        this._switchPage = this._switchPage.bind(this);
        this._selectPage = this._selectPage.bind(this);
        this._getStartEndPages = this._getStartEndPages.bind(this);
        this._switchContext = this._switchContext.bind(this);
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
    _manageNextPrecButtons() {
        // Get the elements
        const index = this._getCurrentIndex();
        if(index === -1) return;

        // Get elements
        const selectorsCount = this.querySelectorAll("li[id^='selector']").length;
        const prevPageSelector = this.querySelector("#prev-page");
        const nextPageSelector = this.querySelector("#next-page");
        
        // Manage the prev button
        let toAdd = index === 0 ? "disabled" : "enabled";
        let toRemove = index === 0 ? "enabled" : "disabled";
        prevPageSelector.classList.remove(toRemove);
        prevPageSelector.classList.add(toAdd);

        // Manage the next button
        toAdd = index === selectorsCount - 1 ? "disabled" : "enabled";
        toRemove = index === selectorsCount - 1 ? "enabled" : "disabled";
        nextPageSelector.classList.remove(toRemove);
        nextPageSelector.classList.add(toAdd);
    }

    /**
     * @private
     * Obtains the records of the page specified by `index`.
     * @param {number} index Index of the page to prepare
     * @param {number} size Size of each page
     */
    async _paginate(index, size) {
        return await window.DB.search(this._searchQuery)
            .skip(index * size) // Skip the first "index" pages
            .limit(size) // Get the next "size" records
            .sort(this._sortQuery); // Sort (default: alphabetically)
    }

    /**
     * @private
     * Load the page with the index used as argument.
     * @param {number} index Index of the page to load
     */
    async _switchPage(index) {
        // Get the properties of the selected records
        const records = await this._paginate(index, this.CARDS_FOR_PAGE);

        // Remove all columns containing game cards
        this.content.querySelectorAll("div.col").forEach(n => n.remove());

        // Create the game-cards
        for (const r of records) {
            // Create gamecard
            const gamecard = document.createElement("game-card");

            // Load info
            gamecard.loadData(r._id);

            // Add cards to page
            this._addGameCardToPage(gamecard, this.content);
        }
    }

    /**
     * @private
     * Gets the range of page indexes to display "around" the index passed as a parameter.
     * @param {number} index Index of the page to be displayed
     */
    async _getStartEndPages(index) {
        // Local variables
        const recordsNumber = await window.DB.countAll();
        const nPages = Math.ceil(recordsNumber / this.CARDS_FOR_PAGE);

        // If there aren't enough pages...
        if (nPages < this.MAX_VISIBLE_PAGES) {
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
        if (end > nPages) {
            start = nPages - this.MAX_VISIBLE_PAGES;
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
        window.requestAnimationFrame(async () => {
            // Load the first page
            await this._switchPage(index);

            // Prepare the page selectors
            const limitPages = await this._getStartEndPages(index);
            this._createPageSelectors(limitPages.start, limitPages.end, index);

            // Enable/disable the next/prev buttons
            this._manageNextPrecButtons();
        });
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
     * Adds a gamecard to the specified page by creating a new responsive column.
     * @param {GameCard} card 
     * @param {HTMLDivElement} page 
     */
    _addGameCardToPage(card, page) {
        // Create a simil-table layout with materialize-css
        // "s6" means that the element occupies 6 of 12 columns with small screens
        // "m5" means that the element occupies 5 of 12 columns with medium screens
        // "l4" means that the element occupies 4 of 12 columns with large screens
        // "xl3" means that the element occupies 3 of 12 columns with very large screens
        // The 12 columns are the base layout provided by materialize-css
        const column = document.createElement("div");
        column.setAttribute("class", "col s6 m5 l4 xl3");

        // Append GameCard
        column.appendChild(card);
        
        // Connect the new column in DOM
        page.appendChild(column);
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

        // Remove all the page selectors
        this.pageSelectorsParent.querySelectorAll("li[id^='selector']").forEach(n => n.remove());
        
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