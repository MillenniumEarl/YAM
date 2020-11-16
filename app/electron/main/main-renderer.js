"use strict";

// Manage unhandled errors
window.onerror = function (message, source, lineno, colno, error) {
    window.API.log.error(`${message} at line ${lineno}:${colno}.\n${error.stack}`);

    window.API.send("require-messagebox",
        "error",
        "Unhandled error",
        `${message} at line ${lineno}:${colno}.\n
        It is advisable to terminate the application to avoid unpredictable behavior.\n
        ${error.stack}\n
        Please report this error on https://github.com/MillenniumEarl/F95GameUpdater`);
};

//#region Events
document.addEventListener("DOMContentLoaded", onDOMContentLoaded);

document.querySelector("#search-game-name").addEventListener("keyup", onSearchGameName);

document.querySelector("#user-info").addEventListener("login", login);

document.querySelector("#add-remote-game-btn").addEventListener("click", onAddRemoteGame);

document.querySelector("#add-local-game-btn").addEventListener("click", onAddLocalGame);

document.querySelector("#settings-password-toggle").addEventListener("click", onPasswordToggle);

document.querySelector("#settings-save-credentials-btn").addEventListener("click", onSaveCredentialsFromSettings);

document.querySelector("#main-language-select").addEventListener("change", updateLanguage);

document.querySelector("#main-navbar-games").addEventListener("click", openPage);

document.querySelector("#main-navbar-settings").addEventListener("click", openPage);

//#region Events listeners

/**
 * Initialize and perform preliminary operations once the DOM is fully loaded.
 */
async function onDOMContentLoaded() {
    // This function runs when the DOM is ready, i.e. when the document has been parsed
    window.API.log.info("DOM loaded, initializing elements");
    await translateElementsInDOM();
    await listAvailableLanguages();

    // Initialize the navigator-tab
    const tabNavigator = document.getElementById("tab-navigator");
    // eslint-disable-next-line no-undef
    M.Tabs.init(tabNavigator, {});

    // Initialize the floating button
    const fabs = document.querySelectorAll(".fixed-action-btn");
    // eslint-disable-next-line no-undef
    M.FloatingActionButton.init(fabs, {
        direction: "left",
        hoverEnabled: false,
    });

    // Initialize the <select> for languages
    const selects = document.querySelectorAll("select");
    // eslint-disable-next-line no-undef
    M.FormSelect.init(selects, {});

    // Load cards in the paginator
    const paginator = document.querySelector("card-paginator");
    paginator.playListener = gameCardPlay;
    paginator.updateListener = gameCardUpdate;
    paginator.deleteListener = gameCardDelete;
    paginator.load();
    
    // Load credentials
    await loadCredentials();

    // Login to F95Zone
    login();
}

/**
 * Displays games whose titles contain the value the user entered in the search box.
 * @param {KeyboardEvent}
 */
function onSearchGameName(e) {
    // Search only if the user press "enter"
    if(e.key !== "Enter") return;

    // Obtain the text
    const searchText = document
        .getElementById("search-game-name")
        .value;

    document.querySelector("card-paginator").search(searchText);
}

/**
 * Adds an undetectable game on the PC via the game URL.
 */
async function onAddRemoteGame() {
    // The user select a single folder
    const gameFolderPaths = await selectGameDirectories(false);
    if (gameFolderPaths.length === 0) return;
    const gamePath = gameFolderPaths[0];

    // Ask the URL of the game
    const url = await window.API.invoke("url-input");
    if (!url) return;

    const translation = await window.API.translate("MR adding game from url");
    sendToastToUser("info", translation);

    // Find game version
    const unparsedName = gamePath.split("\\").pop();
    const version = getGameVersionFromName(unparsedName);

    // Add game to list
    const info = await window.F95.getGameDataFromURL(url);

    // Add data to the parsed game info
    const converted = window.GIE.convert(info);
    converted.version = version;
    converted.gameDirectory = gamePath;

    // Save data to database
    await window.DB.insert(converted);

    // Game added correctly
    const translationSuccess = await window.API.translate("MR game successfully added", {
        "gamename": converted.name
    });
    sendToastToUser("info", translationSuccess);

    // Reload data in the paginator
    document.querySelector("card-paginator").reload();
}

/**
 * Add one or more games on the PC.
 */
async function onAddLocalGame() {
    // The user select a single folder
    const gameFolderPaths = await selectGameDirectories(true);
    if (gameFolderPaths.length === 0) return;

    // Obtain the data
    const translation = await window.API.translate("MR adding game from path");
    sendToastToUser("info", translation);
    await getGameFromPaths(gameFolderPaths);

    // Reload data in the paginator
    document.querySelector("card-paginator").reload();
}

/**
 * Show or hide the password when the user presses the appropriate button.
 */
function onPasswordToggle() {
    // Show/hide the password
    const input = document.getElementById("settings-password-txt");

    if (input.type === "password") input.type = "text";
    else input.type = "password";
}

/**
 * Save the credentials when the user changes them in the 'settings' tab.
 */
async function onSaveCredentialsFromSettings() {
    const credPath = await window.API.invoke("credentials-path");
    const username = document.getElementById("settings-username-txt").value;
    const password = document.getElementById("settings-password-txt").value;

    const credentials = {
        username: username,
        password: password,
    };
    const json = JSON.stringify(credentials);
    await window.IO.write(credPath, json);
    const translation = await window.API.translate("MR credentials edited");
    sendToastToUser("info", translation);
}

/**
 * Triggered when the user select a language from the <select> element.
 * Change the language for the elements in the DOM.
 */
async function updateLanguage() {
    // Parse user choice
    const e = document.getElementById("main-language-select");
    const selectedISO = e.options[e.selectedIndex].value;

    // Change language via IPC
    await window.API.changeLanguage(selectedISO);

    // Refresh strings
    await translateElementsInDOM();
}

/**
 * Select the tab with the specified ID in DOM.
 * @param {MouseEvent} e
 */
function openPage(e) {
    // Get the ID of the div to show
    const id = e.target.id === "main-navbar-settings" ? 
        "main-settings-tab" : 
        "main-games-tab";

    // Hide all elements with class="tabcontent" by default
    const tabcontent = document.getElementsByClassName("tabcontent");

    // Use requestAnimationFrame to reduce rendering time
    // see: https://stackoverflow.com/questions/37494330/display-none-in-a-for-loop-and-its-affect-on-reflow
    window.requestAnimationFrame(function () {
        // Hide the unused tabs
        for (let i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }

        // Show the specific tab content
        document.getElementById(id).style.display = "block";

        // Hide/show the add game button
        const fab = document.querySelector("#fab-add-game-btn");
        if (id === "main-games-tab" && window.F95.logged) fab.style.display = "block";
        else fab.style.display = "none";
    });
}
//#endregion

//#endregion Events

//#region Private methods

//#region Language
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
            e: 
            // ... or change only the last child (the text)
            e.childNodes[e.childNodes.length - 1]; 

        // Translate
        toTranslate.textContent = await window.API.translate(e.id);
    }
}

/**
 * @private
 * Select all the available languages for the app and create a <select>.
 */
async function listAvailableLanguages() {
    // Read all the available languages
    const cwd = await window.API.invoke("cwd");
    const langs = await window.IO.filter(
        "*.json",
        window.API.join(cwd, "resources", "lang")
    );
    const currentLanguageISO = (await window.API.currentLanguage()).toUpperCase();

    for (const lang of langs) {
        const iso = lang.replace(".json", "");

        // Create <option> for the combobox
        const option = document.createElement("option");
        option.setAttribute("class", "left"); // Icons on the left
        option.setAttribute("value", iso);
        const flagPath = window.API.join(
            cwd,
            "resources",
            "images",
            "flags",
            `${iso}.webp`
        );
        option.setAttribute("data-icon", flagPath);
        option.textContent = iso.toUpperCase();

        // If current language make the option selected
        if (currentLanguageISO === iso.toUpperCase())
            option.setAttribute("selected", "");

        // Add the option
        document.getElementById("main-language-select").appendChild(option);
    }
}
//#endregion Language

//#region Utility
/**
 * @private
 * Remove all the special characters from a string.
 * It remove all the characters (spaced excluded) that have the same "value" in upper and lower case.
 * @param {String} str String to parse
 * @param {String[]} allowedChars List of allowed special chars
 * @returns {String} Parsed string
 */
function removeSpecials(str, allowedChars) {
    const lower = str.toLowerCase();
    const upper = str.toUpperCase();

    if (!allowedChars) allowedChars = [];

    let res = "";
    for (let i = 0; i < lower.length; ++i) {
        if (lower[i] !== upper[i] || lower[i].trim() === "" || allowedChars.includes(lower[i]))
            res += str[i];
    }
    return res.trim();
}

/**
 * @private
 * Given a game name, remove all the special characters and various tag (*[tag]*).
 * @param {String} name
 * @returns {String}
 */
function cleanGameName(name) {
    // Remove special chars except for version and specific tag chars
    name = removeSpecials(name, [
        "-",
        "[",
        "]",
        ".",
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
    ]);

    // Remove mod tag and version
    const rxTags = /\[(.*?)\]/g;
    const rxSpecials = /[/\\?%*:|"<>]/g;
    name = name.replace(rxTags, "").replace(rxSpecials, "").trim();

    return name;
}

/**
 * @private
 * Show a toast in the top-right of the screen.
 * @param {String} type Type of message (*error/warning/...*)
 * @param {String} message Message to the user
 */
function sendToastToUser(type, message) {
    // Select various data based on the type of message
    let icon = "info";
    let htmlColor = "blue";
    let timer = 3000;
    if (type === "error") {
        icon = "error_outline";
        htmlColor = "red";
        timer = 15000;
    } else if (type === "warning") {
        icon = "warning";
        htmlColor = "orange";
        timer = 10000;
    }

    const htmlToast = `<i class='material-icons' style='padding-right: 10px'>${icon}</i><span>${message}</span>`;
    // eslint-disable-next-line no-undef
    M.toast({
        html: htmlToast,
        displayLength: timer,
        classes: htmlColor,
    });
}
//#endregion Utility

//#region Authentication
/**
 * @private
 * Load credentials in the settings input fields.
 */
async function loadCredentials() {
    // Check path
    const credPath = await window.API.invoke("credentials-path");
    const exists = await window.IO.pathExists(credPath);
    if (!exists) return;

    // Parse credentials
    const json = await window.IO.read(credPath);
    const credentials = JSON.parse(json);

    // Set values
    document.getElementById("settings-username-txt").value = credentials.username;
    document.getElementById("settings-password-txt").value = credentials.password;

    // "Select" the textboxes to not overlap textual values and placeholder text
    document
        .querySelector("label[for='settings-username-txt']")
        .classList.add("active");
    document
        .querySelector("label[for='settings-password-txt']")
        .classList.add("active");
}

/**
 * @private
 * It checks if a network connection is available
 * and notifies the main process to perform
 * the login procedure.
 */
async function login() {
    // Check network connection
    if (!window.API.isOnline) {
        window.API.log.warn("No network connection, cannot login");
        const translation = window.API.translate("MR no network connection");
        sendToastToUser("warning", translation);
        return;
    }

    // Show the spinner in the avatar component
    document.getElementById("user-info").showSpinner();

    // Request user input
    window.API.log.info("Send API to main process for auth request");
    const result = await window.API.invoke("login-required");

    window.API.log.info(`Authentication result: ${result}`);
    if (result !== "AUTHENTICATED") {
        // Hide "new game" button
        document.querySelector("#fab-add-game-btn").style.display = "none";

        // Hide spinner
        document.getElementById("user-info").hideSpinner();
        return;
    }

    // Load data (session not shared between windows)
    try {
        // Check path
        const credPath = await window.API.invoke("credentials-path");
        if (!window.IO.pathExists(credPath)) return;

        // Parse credentials
        const json = await window.IO.read(credPath);
        const credentials = JSON.parse(json);

        const res = await window.F95.login(credentials.username, credentials.password);
        if (!res.success) return;

        const translation = await window.API.translate("MR login successful");
        sendToastToUser("info", translation);

        // Show "new game" button
        document.querySelector("#fab-add-game-btn").style.display = "block";

        // Load user data
        getUserDataFromF95();

        // Reload paginator to allow search of updates
        document.querySelector("card-paginator").reload();

    } catch (e) {
        // Send error message
        const translation = await window.API.translate("MR cannot login", {
            "error": e
        });
        sendToastToUser("error", translation);
        window.API.log.error(`Cannot login: ${e}`);
    }
}
//#endregion Authentication

//#region Adding game
/**
 * @private
 * Let the user select one (or more) directory containing games.
 * @param {Boolean} multipleSelection If the user can select more than one directory
 * @returns {Promise<String[]>} List of directories
 */
async function selectGameDirectories(multipleSelection) {
    // Local variables
    const props = multipleSelection ? ["openDirectory", "multiSelections"] : ["openDirectory"];

    // The user selects one (or more) folders
    const openDialogOptions = {
        title: await window.API.translate("MR select game directory"),
        properties: props,
    };
    const data = await window.API.invoke("open-dialog", openDialogOptions);

    // No folder selected
    if (data.filePaths.length === 0) {
        const translation = await window.API.translate("MR no directory selected");
        sendToastToUser("warning", translation);
        return [];
    }

    // Check if the game(s) is already present
    const gameFolderPaths = await getUnlistedGamesInArrayOfPath(data.filePaths);
    if (gameFolderPaths.length === 0) return [];
    else return gameFolderPaths;
}

async function gameCardPlay(e) {
    if (!e.target) return;
    const launcherPath = e.detail.launcher;

    // Check if the path exists
    const exists = await window.IO.pathExists(launcherPath);
    if (!exists) {
        const translation = await window.API.translate("MR cannot find game path");
        window.API.log.error(`Cannot find game path: ${launcherPath}`);
        sendToastToUser("error", translation);
        return;
    }

    // Launch the game
    window.API.send("exec", launcherPath);
}

async function gameCardUpdate(e) {
    if (!e.target) return;

    // Let the user update the game
    const finalized = await window.API.invoke("update-messagebox",
        e.detail.name,
        e.detail.version,
        e.detail.changelog,
        e.detail.url,
        e.detail.gameDirectory);

    // The user didn't complete the procedure
    if (!finalized) return;

    // Finalize the update
    const result = await e.target.update();
    if (result) return;

    const translationError = await window.API.translate("MR error finalizing update");
    sendToastToUser("error", translationError);
    window.API.log.error(
        "Cannot finalize the update, please check if another directory of the game exists"
    );
}

async function gameCardDelete(e) {
    if (!e.target) return;
    const savesExists = e.detail.savePaths.length !== 0 ? true : false;

    // Ask the confirmation
    const titleTranslation = await window.API.translate("MR confirm deletion");
    const messageTranslation = await window.API.translate(
        "MR message confirm deletion"
    );
    const checkboxTranslation = await window.API.translate(
        "MR keep saves checkbox"
    );
    const removeOnlyTranslation = await window.API.translate(
        "MR remove only game button"
    );
    const deleteAlsoTranslation = await window.API.translate(
        "MR delete also button"
    );
    const cancelTranslation = await window.API.translate("MR cancel button");
    let dialogOptions = {
        type: "question",
        buttons: [
            removeOnlyTranslation,
            deleteAlsoTranslation,
            cancelTranslation,
        ],
        defaultId: 2, // Cancel
        title: titleTranslation,
        message: messageTranslation,
    };

    if (savesExists) {
        // Add option for save savegames
        dialogOptions.checkboxLabel = checkboxTranslation;
        dialogOptions.checkboxChecked = true;
    }

    const data = await window.API.invoke("message-dialog", dialogOptions);
    if (!data) return;

    // Cancel button
    if (data.response === 2) return;

    // Copy saves
    if (data.checkboxChecked && e.detail.savePaths && e.detail.name) {
        const savePaths = e.detail.savePaths;
        const exportedSavesDir = await window.API.invoke("savegames-data-dir");
        const gameDirectory = window.API.join(exportedSavesDir, cleanGameName(e.detail.name));
        await window.IO.mkdir(gameDirectory);
        savePaths.forEach(async function copySaveGame(path) {
            const name = path.split("\\").pop();
            const newName = window.API.join(gameDirectory, name);
            await window.IO.copy(path, newName);
        });
    }

    // Delete also game files
    if (data.response === 1) {
        const gameDirectory = e.detail.gameDirectory;
        await window.IO.deleteFolder(gameDirectory);
    }

    // Remove the game data
    await e.target.deleteData();

    // Reload data in the paginator
    document.querySelector("card-paginator").reload();
}

/**
 * @private
 * Given a directory listing, it gets information about the games contained in them.
 * @param {String[]} paths Path of the directories containg games
 */
async function getGameFromPaths(paths) {
    // Parse the game dir name(s)
    for (const path of paths) {
        await getGameFromPath(path)
            .catch(function catchErrorWhenAddingGameFromPath(error) {
                // Send error message
                window.API.send("require-messagebox", 
                    "error", 
                    "Unexpected error", 
                    `Cannot retrieve game data (${path}), unexpected error: ${error}`);
                window.API.log.error(
                    `Unexpected error while retrieving game data from path: ${path}. ${error}`
                );
            });
    }
}

/**
 * @async
 * @private
 * Given a directory path, parse the dirname, get the
 * game (if exists) info and add a *game-card* in the DOM.
 * @param {String} path Game directory path
 * @returns {Promise<Object>} GameCard created or null if no game was detected
 */
async function getGameFromPath(path) {
    // After the splitting, the last name is the directory name
    const unparsedName = path.split("\\").pop();

    // Check if it is a mod
    const MOD_TAG = "[MOD]";
    const includeMods = unparsedName.toUpperCase().includes(MOD_TAG);

    // Get only the game title
    const name = cleanGameName(unparsedName);

    // Search and add the game
    const promiseResult = await window.F95.getGameData(name, includeMods);

    // No/multiple game found
    if(promiseResult.length !== 1) {
        const key = promiseResult.length === 0 ? "MR no game found" : "MR multiple games found";
        const translation = await window.API.translate(key, {
            "gamename": name
        });
        sendToastToUser("warning", translation);
        return;
    }

    // Add data to the parsed game info
    const converted = window.GIE.convert(promiseResult[0]);
    converted.version = getGameVersionFromName(unparsedName);
    converted.gameDirectory = path;

    // Save data to database
    await window.DB.insert(converted);

    // Game added correctly
    const translation = await window.API.translate("MR game successfully added", {
        "gamename": name
    });
    sendToastToUser("info", translation);
}

/**
 * @private
 * Given a non-parsed game name, extract the version if a tag **[v.version]** is specified.
 * @example [v.1.2.3.4], [V.somevalue]
 * @param {String} name
 */
function getGameVersionFromName(name) {
    // Local variables
    let version = "Unknown";
    const PREFIX_VERSION = "[V."; // i.e. namegame [v.1.2.3.4]

    // Search the version tag, if any
    if (name.toUpperCase().includes(PREFIX_VERSION)) {
        const startIndex = name.toUpperCase().indexOf(PREFIX_VERSION) + PREFIX_VERSION.length;
        const endIndex = name.indexOf("]", startIndex);
        version = name.substr(startIndex, endIndex - startIndex);
    }

    return version;
}

/**
 * @private
 * Check that the specified paths do not belong to games already in the application.
 * @param {String[]} paths List of game paths to check
 * @returns {Promise<String[]>} List of valid paths
 */
async function getUnlistedGamesInArrayOfPath(paths) {
    // Local variables
    const MAX_NUMBER_OF_PRESENT_GAMES_FOR_MESSAGES = 5;
    const gameFolderPaths = [];
    const listedGameNames = [];
    const alreadyPresentGames = [];

    // Check if the game(s) is (are) already present
    const cardGames = document.querySelectorAll("game-card");
    cardGames.forEach((card) => {
        if (!card.info.name) return;
        const gamename = cleanGameName(card.info.name);
        listedGameNames.push(gamename.toUpperCase());
    });

    for (const path of paths) {
        // Get the clean game name
        const unparsedName = path.split("\\").pop();
        const newGameName = cleanGameName(unparsedName);

        // Check if it's not already present and add it to the list
        if (!listedGameNames.includes(newGameName.toUpperCase())) gameFolderPaths.push(path);
        else alreadyPresentGames.push(newGameName);
    }

    if (alreadyPresentGames.length <= MAX_NUMBER_OF_PRESENT_GAMES_FOR_MESSAGES) {
        // List the game names only if there are few duplicated games
        for (const gamename of alreadyPresentGames) {
            // This game is already present: ...
            const translation = await window.API.translate("MR game already listed", {
                "gamename": gamename
            });
            sendToastToUser("warning", translation);
        }
    } else {
        const translation = await window.API.translate("MR multiple duplicate games", {
            "number": alreadyPresentGames.length
        });
        sendToastToUser("warning", translation);
    }

    return gameFolderPaths;
}
//#endregion Adding game

/**
 * @private
 * Obtain data of the logged user and show them in the custom element "user-info".
 */
async function getUserDataFromF95() {
    window.API.log.info("Retrieving user info from F95");

    // Retrieve user data
    const userdata = await window.F95.getUserData();

    // Check user data
    if (!userdata) {
        // Hide spinner
        document.getElementById("user-info").hideSpinner();

        // Send error message
        const translation = await window.API.translate("MR cannot retrieve user data");
        sendToastToUser("error", translation);
        window.API.log.error("Something wrong while retrieving user info from F95");
    }

    // Update component
    document.getElementById("user-info").userdata = userdata;
}

//#endregion Private methods
