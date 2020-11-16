"use strict";

// Manage unhandled errors
window.onerror = function (message, source, lineno, colno, error) {
    window.API.log.error(`${message} at line ${lineno}:${colno}.\n${error.stack}`);
};

//#region Events
document.addEventListener("DOMContentLoaded", async function onDOMContentLoaded() {
    // This function runs when the DOM is ready, i.e. when the document has been parsed
    await translateElementsInDOM();

    // Get the body size
    const PADDING_FOR_SIDE = 15;
    const width = document.body.clientWidth + 3 * PADDING_FOR_SIDE;
    const height = document.body.clientHeight + 2 * PADDING_FOR_SIDE;
    window.API.send("window-resize", width, height);
});

document.querySelector("#urli-accept-btn").addEventListener("click", async function validateAndReturnURL() {
    // Get the URL
    const url = document.getElementById("urli-url-input").value;

    // Validate the URL
    if (!isStringAValidURL(url)) {
        const translation = await window.API.translate("URLI invalid url");
        document.getElementById("urli-url-msg-helper").innerText = translation;
        return;
    }

    // Send the URL and close the window
    window.API.send("window-close", url);
});

document.querySelector("#urli-cancel-btn").addEventListener("click", function close() {
    window.API.send("window-close");
});
//#endregion Events

//#region Private methods
/**
 * @private
 * Translate the DOM elements in the current language.
 */
async function translateElementsInDOM() {
    // Get only the localizable elements
    const elements = document.querySelectorAll(".localizable");

    // Translate elements
    for (const e of elements) {
        // Change text if no child elements are presents...
        if (e.childNodes.length === 0)
            e.textContent = await window.API.translate(e.id);
        // ... or change only the last child (the text)
        else
            e.childNodes[
                e.childNodes.length - 1
            ].textContent = await window.API.translate(e.id);
    }
}

/**
 * @private
 * Checks if the string passed by parameter has a 
 * properly formatted and valid path to a URL (HTTP/HTTPS).
 * @param {String} url String to check for correctness
 * @returns {Boolean} true if the string is a valid URL, false otherwise
 */
function isStringAValidURL(url) {
    // Many thanks to Daveo at StackOverflow (https://preview.tinyurl.com/y2f2e2pc)
    const expression = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;
    const regex = new RegExp(expression);
    if (url.match(regex)) return true;
    else return false;
}
//#endregion Private methods
