"use strict";

// Manage unhandled errors
window.onerror = function (message, source, lineno, colno, error) {
    window.API.log.error(`${message} at line ${lineno}:${colno}.\n${error.stack}`);
};

//#region Global variables
var _url, _folder;
//#endregion Global variables

window.API.once("um-arguments", async function (title, version, changelog, url, folder) {
    // Translate the DOM
    await translateElementsInDOM();

    // Set the data
    const translation = await window.API.translate("UM description", {"title": title, "version": version});
    document.getElementById("um-description").textContent = translation;
    document.getElementById("um-changelog").textContent = changelog;

    // Set global variables
    _url = url;
    _folder = folder;
});

//#region Events
document.querySelector("#um-close-btn").addEventListener("click", function close() {
    // Close the dialog without updating
    window.API.send("um-closing");
});

document.querySelector("#um-download-btn").addEventListener("click", function openDownloadLink() {
    // Open the thread link on F95Zone
    window.API.send("exec", _url);
});

document.querySelector("#um-open-folder-btn").addEventListener("click", function openGameFolder() {
    // Open the folder of the game
    window.API.send("exec", _folder);
});

document.querySelector("#um-finalize-btn").addEventListener("click", function finalizeUpdate() {
    // Rename the folder
    window.API.send("um-finalized");
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
        // Select the element to translate
        const toTranslate = e.childNodes.length === 0 ?
            // Change text if no child elements are presents...
            e :
            // ... or change only the last child (the text)
            e.childNodes[e.childNodes.length - 1];

        // Translate
        toTranslate.textContent = await window.API.translate(e.id);
    }
}
//#endregion Private methods
