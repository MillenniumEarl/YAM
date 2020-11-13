"use strict";

class CardPaginator extends HTMLElement {
    constructor() {
        super();

        this.CARDS_FOR_PAGE = 8;
        this.MAX_VISIBLE_PAGES = 5;
        this._updated = false;
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
        const id = this._getCurrentSelectorID();
        if(id === -1) return;
        this._switchPage(id + 1);
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
        const id = this._getCurrentSelectorID();
        if (id === -1) return;
        this._switchPage(id - 1);
    }

    /**
     * @private
     * Generated when clicking on a selector, changes the displayed page.
     * @param {MouseEvent} e
     */
    _selectPage(e) {
        const selectorID = e.target.parentNode.id;
        const index = parseInt(selectorID.replace("selector_", ""));
        this._switchPage(index);
    }
    
    //#endregion Events

    //#region Public methods
    /**
     * @public
     * Create a paged DIV containing the cards passed by parameter.
     * @param {GameCard} cards List of cards to paginate
     */
    paginate(cards) {
        // Obtain a list of list of cards
        const chunks = this._chunkArray(cards, this.CARDS_FOR_PAGE);

        // Iterate the chunks and create a page for every chunk
        const pageList = [];
        for (const chunk of chunks) {
            const page = this._createPage();

            // Add cards to page
            chunk.forEach((card) => this._addGameCardToPage(card, page));

            // Add page to list
            pageList.push(page);
        }

        // Create and return the entire structure
        window.requestAnimationFrame(() => this._createIndexPage(pageList));
    }

    /**
     * @public
     * Find all games that contain the specified value in the title.
     * @param {String} name 
     */
    search(value) {
        // Order the gamecards TODO
        //this.sort();

        // Select all the gamecard
        const cards = this.querySelectorAll("game-card");
        
        // Search text
        let lastCompareIndex = cards.length;
        let cardMatches = 0;
        const searchTerm = value.toUpperCase();
        for(let i = 0; i < cards.length; i++) {
            // In-loop variables
            const gamename = cards[i].info.name.toUpperCase();
            const include = gamename.includes(searchTerm);

            // Hide/show card
            const display = include ? "block" : "none";
            window.requestAnimationFrame(() => cards[i].style.display = display);

            // The card match the search value, skip
            if (include) {
                cardMatches += 1;
                continue;
            }
            
            // Find the index of the last card that match the search string
            // From end to start
            let lastIndex = -1;
            for (let j = lastCompareIndex - 1; j > i; j--) {
                const gamenameInternal = cards[j].info.name.toUpperCase();
                if (gamenameInternal.includes(searchTerm)) {
                    lastIndex = j;
                    break;
                }
            }

            // Swap nodes
            lastCompareIndex = lastIndex;
            if (lastIndex === -1) continue;
            this._swapNodes(cards[i], cards[lastIndex]);
        }

        // After the search, we nedd to hide the "empty" selectors
        const pages = this.querySelectorAll("li[id^='selector_']");
        const lastVisibleSelectorID = Math.ceil(cardMatches/this.CARDS_FOR_PAGE);
        window.requestAnimationFrame(() => {
            for (const page of pages) {
                const id = parseInt(page.id.replace("selector_", ""));
                const visibility = id < lastVisibleSelectorID ? "inline-block" : "none";
                page.style.display = visibility;
            }
        });
    }

    add(card) {

    }

    remove(card) {

    }

    /**
     * @public
     * Sort the gamecards with the specified sort function. 
     * @param {Function} sortFunction Sorting function
     */
    sort(sortFunction) {
        if (!sortFunction) throw new Error("Missing sorting function");

        // Select all the gamecard
        const cards = this.querySelectorAll("game-card");

        // Sort
        const sorted = Array.from(cards).sort((a, b) => sortFunction(a, b));

        for (let i = 0; i < cards.length; i++) {
            // Ignore same element
            if(cards[i].info.id === sorted[i].info.if) continue;

            // Swap
            this._swapNodes(cards[i], sorted[i]);
        }
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
        this.container = this.querySelector("#pagination-content");

        /* Bind function to use this */
        this._getCurrentSelectorID = this._getCurrentSelectorID.bind(this);
        this._getMinIDMissingRight = this._getMinIDMissingRight.bind(this);
        this._showNearSelectors = this._showNearSelectors.bind(this);
        this._manageNextPrecButtons = this._manageNextPrecButtons.bind(this);
        this._createSelectorButton = this._createSelectorButton.bind(this);
        this._createIndexPage = this._createIndexPage.bind(this);
        this._createPrevButton = this._createPrevButton.bind(this);
        this._createNextButton = this._createNextButton.bind(this);
        this._prevPage = this._prevPage.bind(this);
        this._nextPage = this._nextPage.bind(this);
        this._switchPage = this._switchPage.bind(this);
        this._selectPage = this._selectPage.bind(this);
    }

    //#region Utility
    /**
     * @private
     * Returns an array with arrays of the given size.
     * @param {Array} array Array to split
     * @param {number} size Size of every group
     */
    _chunkArray(array, size) {
        const results = [];

        while (array.length) {
            results.push(array.splice(0, size));
        }

        return results;
    }

    /**
     * @private
     * Gets the ID of the currently selected page selector.
     */
    _getCurrentSelectorID() {
        const activePage = this.querySelector("li.active");
        if(!activePage) return -1;
        const currentSelectorID = parseInt(activePage.id.replace("selector_", ""), 10);
        return currentSelectorID;
    }

    /**
     * @private
     * Calculates the minimum ID that an element must have to 
     * be included in visible selectors when the desired selector 
     * is near the last selector available
     * @param {number} n Total number of page selectors
     * @param {number} i Index of the selected page selector
     */
    _getMinIDMissingRight(n, i) {
        // Number of elements to the right and
        // to the left of the desired selector
        const nRight = n - i - 1;
        const nLeft = this.MAX_VISIBLE_PAGES - nRight - 1;
        const minLeftID = i - nLeft;
        return minLeftID;
    }

    /**
     * @private
     * Show page selectors next to the one indicated by `index`, hide the others.
     * @param {number} index ID of the currently selected page selector
     */
    _showNearSelectors(index) {
        // Local variables
        const pageSelectors = this.querySelectorAll("li[id^='selector']");
        const MAX_VISIBLE_PAGES = 5;
        const elementForSide = Math.floor((MAX_VISIBLE_PAGES - 1) / 2);
        const leftMissing = index - elementForSide < 0;
        const rightMissing = index + elementForSide > pageSelectors.length - 1;
        const minLeftID = this._getMinIDMissingRight(pageSelectors.length, index);

        // Select the page selectors
        for (const selector of pageSelectors) {
            // Extract ID
            const id = parseInt(selector.id.replace("selector_", ""), 10);

            // Evaluate positional distance between 
            // desired selector and current loop selector
            const distance = Math.abs(index - id);

            if (distance === 0) continue;
            else if (distance <= elementForSide) {
                selector.style.display = "inline-block";
            } else if (leftMissing && id < MAX_VISIBLE_PAGES) {
                selector.style.display = "inline-block";
            } else if (rightMissing && id >= minLeftID) {
                selector.style.display = "inline-block";
            } else selector.style.display = "none";
        }
    }

    /**
     * @private
     * Shows or hides the buttons for the previous/next page 
     * depending on the currently selected page selector.
     */
    _manageNextPrecButtons() {
        // Get the elements
        const id = this._getCurrentSelectorID();
        if(id === -1) return;

        const pageSelectors = this.querySelectorAll("li[id^='selector']");
        const prevPageSelector = this.querySelector("#prev-page");
        const nextPageSelector = this.querySelector("#next-page");
        
        // Manage the prev button
        if(id === 0) {
            prevPageSelector.classList.remove("enabled");
            prevPageSelector.classList.add("disabled");
        }
        else {
            prevPageSelector.classList.add("enabled");
            prevPageSelector.classList.remove("disabled");
        }

        // Manage the next button
        if (id === pageSelectors.length - 1) {
            nextPageSelector.classList.remove("enabled");
            nextPageSelector.classList.add("disabled");
        } else {
            nextPageSelector.classList.add("enabled");
            nextPageSelector.classList.remove("disabled");
        }
    }

    /**
     * @private
     * Swap two elements in the DOM.
     * @param {Element} first First element to swap
     * @param {Element} second Second element to swap
     * @see https://preview.tinyurl.com/y3jq5aur
     * @author br4nnigan
     */
    _swapNodes(first, second) {
        const parentFirst = first.parentNode;
        const parentSecond = second.parentNode;
        let indexFirst, indexSecond;

        // Return if parents are not defined or 
        // if one of the arguments is a parent
        if (!parentFirst || 
            !parentSecond || 
            parentFirst.isEqualNode(second) || 
            parentSecond.isEqualNode(first)) 
            return;

        // Find the index of the element in the list of it's parent childrens
        for (let i = 0; i < parentFirst.children.length; i++) {
            if (parentFirst.children[i].isEqualNode(first)) {
                indexFirst = i;
            }
        }
        
        // Find the index of the element in the list of it's parent childrens
        for (let i = 0; i < parentSecond.children.length; i++) {
            if (parentSecond.children[i].isEqualNode(second)) {
                indexSecond = i;
            }
        }

        // ?
        if (parentFirst.isEqualNode(parentSecond) && indexFirst < indexSecond) {
            indexSecond++;
        }

        // Swap nodes
        window.requestAnimationFrame(() => {
            parentFirst.insertBefore(second, parentFirst.children[indexFirst]);
            parentSecond.insertBefore(first, parentSecond.children[indexSecond]);
        });
    }

    /**
     * @private
     * Select the page with the index used as argument.
     * @param {number} index Index of the page to select
     */
    _switchPage(index) {
        // Obtain the selectors and the contents
        const activePage = this.querySelector("li.active");
        const currentPage = this.querySelector(`#selector_${index}`);
        const activeContent = this.querySelector(".page-selected");
        const currentContent = this.querySelector(`#page_${index}`);

        // Show/hide elements in a optimized way
        window.requestAnimationFrame(() => {
            // First check if there is an active page
            if (activePage) activePage.classList.remove("active");
            if (activeContent) {
                activeContent.classList.remove("page-selected");
                activeContent.style.display = "none";
            }

            // Then select the current content
            if (currentPage) currentPage.classList.add("active");
            if (currentContent) {
                currentContent.classList.add("page-selected");
                currentContent.style.display = "block";
            }

            // Enable/disable the next/prev buttons
            this._manageNextPrecButtons();

            // Show the nearest page selectors
            this._showNearSelectors(index);
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

        // The first page is selected by default
        //if (index === 0) li.classList.add("active");

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
     * Create a DIV element used as a single page for cards pagination.
     */
    _createPage() {
        // Create the div
        const div = document.createElement("div");

        // Add the materializecss class "row"
        div.classList.add("row");

        return div;
    }

    /**
     * @private
     * Create the HTML structure for pagination, with selectors and contents.
     * @param {HTMLDivElement[]} pages Pages to add as content
     */
    _createIndexPage(pages) {
        // Local variables
        let lastID = 0;

        // No pages, exit
        if (pages.length === 0) return;

        // Create the selector element with materializecss
        const ul = document.createElement("ul");
        ul.classList.add("pagination", "center-align");
        
        // Add the single page
        for(const page of pages) {
            // Prepare the page and append it
            page.id = `page_${lastID}`;

            // Show the first page
            page.style.display = "none";
            this.container.appendChild(page);

            // Create the selector
            const li = this._createSelectorButton(lastID);
            ul.appendChild(li);

            // Increment counter
            lastID += 1;
        }

        // Create the previous/next page selector
        const prev = this._createPrevButton();
        const next = this._createNextButton();

        // Add the previous page selector as first child
        // then the next page selector
        ul.insertBefore(prev, ul.firstChild);
        ul.appendChild(next);
        
        // Add the index to the root
        const root = this.querySelector(".card-paginator");
        root.appendChild(ul);

        // Select the first page
        this._switchPage(0);
    }
    //#endregion Creation

    //#endregion Private methods
}

// Let the browser know that <card-paginator> is served by our new class
customElements.define("card-paginator", CardPaginator);