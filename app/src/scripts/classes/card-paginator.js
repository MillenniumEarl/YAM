"use strict";

// Module from files
const sorter = require("../cards-sorter.js");

class CardPaginator {
    constructor() {
        this.CARDS_FOR_PAGE = 12;
        this.MAX_VISIBLE_PAGES = 5;
        this._root = null;
        this._updated = false;
        this._defaultSortFunction = sorter.alphabetically;
    }

    //#region Public methods
    /**
     * @public
     * Create a paged DIV containing the cards passed by parameter.
     * @param {GameCard} cards List of cards to paginate
     * @returns {HTMLDivElement} Paginated DIV to add to DOM
     */
    paginate(cards) {
        // If the root is not edited, avoid to reelaborate the pagination
        if(!this._updated) return this._root;

        // Create and return the entire structure
        this._root = this._preparePaginationDiv(cards);
        this._updated = false;

        return this._root;
    }

    /**
     * @public
     * Find all games that contain the specified value in the title.
     * @param {String} name 
     */
    search(value) {
        // Order the gamecards
        this.order();

        // Select all the gamecard
        const cards = this._root.querySelectorAll("game-card");

        // Display all the gamecards
        window.requestAnimationFrame(() => cards.forEach((card) => card.style.display = "block"));
        
        // Search text
        let lastCompareIndex = cards.length;
        const searchTerm = value.toUpperCase();
        for(let i = 0; i < cards.length; i++) {
            const gamename = cards[i].info.name.toUpperCase();
            if(gamename.includes(searchTerm)) {
                // Hide element
                window.requestAnimationFrame(() => cards[i].style.display = "none");
                continue;
            }
            
            // Find the index of the last card that match the search string
            // From end to start
            let lastIndex = i + 1;
            for (let j = lastCompareIndex; j > i; j--) {
                const gamenameInternal = cards[j].info.name.toUpperCase();
                if (gamenameInternal.includes(searchTerm)) {
                    lastIndex = j;
                    break;
                }
            }

            // Swap nodes
            lastCompareIndex = lastIndex;
            this._swapNodes(cards[i], cards[lastIndex]);
        }
    }

    add(card) {

    }

    remove(card) {

    }

    /**
     * @public
     * Sort the gamecards with the specified sort function. 
     * If not specified, the sort is alphabetical by name.
     * @param {Function} sortFunction Sorting function
     */
    sort(sortFunction) {
        if(!sortFunction) {
            sortFunction = this._defaultSortFunction;
        }

        // Select all the gamecard
        const cards = this._root.querySelectorAll("game-card");

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
        const activePage = document.getElementsByClassName("active")[0];
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
        const pageSelectors = document.querySelectorAll("li[id^='selector']");
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
        const pageSelectors = document.querySelectorAll("li[id^='selector']");
        const prevPageSelector = document.getElementById("prev-page");
        const nextPageSelector = document.getElementById("next-page");
        

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
        prev.onclick = this._prevPage();

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
        next.onclick = this._nextPage();

        // Create and add the icon
        const icon = document.createElement("a");
        icon.classList.add("material-icons");
        icon.innerText = "chevron_right";
        next.appendChild(icon);

        return next;
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
     * @returns {HTMLDivElement} DIV containing both the content and the selector
     */
    _createIndexPage(pages) {
        // Local variables
        let lastID = 0;
        
        // Create the root element
        const root = document.createElement("div");
        root.classList.add("card-paginator");

        // No pages, return emtpy div
        if (pages.length === 0) return root;

        // Create the container element for the pages
        const container = document.createElement("div");
        container.id = "pagination-content";

        // Create the selector element with materializecss
        const ul = document.createElement("ul");
        ul.classList.add("pagination", "center-align");
        
        // Create and add the previous page selector
        const prev = this._createPrevButton();
        ul.appendChild(prev);

        // Add the single page
        for(const page of pages) {
            // Create the selector
            const li = document.createElement("li");
            li.classList.add("waves-effect");
            li.id = `selector_${lastID}`;
            li.onclick = this._selectPage(lastID);

            // Add the selector
            ul.appendChild(li);

            // Prepare the page and append it
            page.style.display = "none";
            page.id = `page_${lastID}`;
            container.appendChild(page);

            // Increment counter
            lastID += 1;
        }

        // Create and add the next page selector
        const next = this._createNextButton();
        ul.appendChild(next);

        return root;
    }

    /**
     * @private
     * Create a paged DIV containing the cards passed by parameter.
     * @param {GameCard} cards List of cards to paginate
     * @returns {HTMLDivElement} Paginated struct
     */
    _preparePaginationDiv(cards) {
        // Obtain a list of list of cards
        const chunks = this._chunkArray(cards, this.CARDS_FOR_PAGE);

        // Iterate the chunks and create a page for every chunk
        const pageList = [];
        for (const chunk of chunks) {
            const page = this._createPage();

            // Add cards to page
            chunk.forEach((card) => page.appendChild(card));
            
            // Add page to list
            pageList.push(page);
        }

        // Create and return the entire structure
        return this._createIndexPage(pageList);
    }
    //#endregion Creation

    //#region Events
    /**
     * @private
     * Select the page following the one currently active.
     */
    _nextPage() {
        // Obtain the ID of the currently selected page selector
        const id = this._getCurrentSelectorID();
        this._selectPage(id + 1);
    }

    /**
     * @private
     * Select the page preceding the one currently active.
     */
    _prevPage() {
        // Obtain the ID of the currently selected page selector
        const id = this._getCurrentSelectorID();
        this._selectPage(id - 1);
    }

    /**
     * @private
     * Select the page with the index used as argument.
     * @param {number} index Index of the page to select
     */
    _selectPage(index) {
        // Obtain the selectors and the contents
        const activePage = document.getElementsByClassName("active")[0];
        const currentPage = document.getElementById(`selector_${index}`);
        const activeContent = document.getElementsByClassName("page-selected")[0];
        const currentContent = document.getElementById(`page_${index}`);
        
        // Show/hide elements in a optimized way
        window.requestAnimationFrame(() => {
            // First check if there is an active page
            if (activePage) activePage.classList.remove("active");
            if (activeContent) {
                activeContent.classList.remove("page-selected");
                activeContent.style.display = "none";
            }

            // Then select the current content
            currentPage.classList.add("active");
            currentContent.classList.add("page-selected");
            currentContent.style.display = "block";

            // Enable/disable the next/prev buttons
            this._manageNextPrecButtons();

            // Show the nearest page selectors
            this._showNearSelectors(index);
        });
    }
    //#endregion Events

    //#endregion Private methods
}

module.exports = CardPaginator;