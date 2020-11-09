"use strict";

/* Global variables */
let lastGameCardID = 0;

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
document.addEventListener("DOMContentLoaded", async function onDOMContentLoaded() {
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

    // Select the default page
    openPage("main-games-tab");

    // Load credentials
    loadCredentials();

    // Load the cached games
    await loadCachedGames();

    // Login after loading games to allow the games to search for updates
    login();
});

document.querySelector("#search-game-name").addEventListener("input", function onSearchGameName() {
    // Obtain the text
    const searchText = document
        .getElementById("search-game-name")
        .value.toUpperCase();

    // Obtain all the available GameCard
    const gameCards = document.querySelectorAll("game-card");

    // Hide the column which the game-card belong
    // if it's games with a title that not match the search query
    for (const gameCard of gameCards) {
        if (!gameCard.info.name) continue;
        if (!gameCard.info.name.toUpperCase().startsWith(searchText)) {
            gameCard.parentNode.style.display = "none";
        } else {
            gameCard.parentNode.style.display = "block";
        }
    }
});

document.querySelector("#user-info").addEventListener("login", login);

document
    .querySelector("#add-remote-game-btn")
    .addEventListener("click", async function onAddRemoteGame() {
        // The user select a single folder
        const gameFolderPaths = await selectGameDirectories(false);
        if (gameFolderPaths.length === 0) return;
        const gamePath = gameFolderPaths[0];

        // Ask the URL of the game
        const translationDialog = await window.API.translate("MR insert game url");
        const promptDialogOptions = {
            title: translationDialog,
            label: "URL:",
            value: "https://f95zone.to/threads/gamename/",
            inputAttrs: {
                type: "url",
            },
            type: "input",
        };

        const url = await window.API.invoke("prompt-dialog", promptDialogOptions);
        if (!url) return;

        const translation = await window.API.translate("MR adding game from url");
        sendToastToUser("info", translation);

        // Add game to list (does not check version)
        const card = addGameCard();
        const info = await window.F95.getGameDataFromURL(url);
        card.info = info;
        card.info.gameDirectory = gamePath;
        card.saveGameData();
    });

document
    .querySelector("#add-local-game-btn")
    .addEventListener("click", async function onAddLocalGame() {
        // The user select a single folder
        const gameFolderPaths = await selectGameDirectories(false);
        if (gameFolderPaths.length === 0) return;

        // Obtain the data
        const translation = await window.API.translate("MR adding game from path");
        sendToastToUser("info", translation);
        getGameFromPaths(gameFolderPaths);
    });

document
    .querySelector("#settings-password-toggle")
    .addEventListener("click", function onPasswordToggle() {
        // Show/hide the password
        const input = document.getElementById("settings-password-txt");

        if (input.type === "password") input.type = "text";
        else input.type = "password";
    });

document
    .querySelector("#settings-save-credentials-btn")
    .addEventListener("click", async function onSaveCredentialsFromSettings() {
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
    });

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
 * @async
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

/**
 * @private
 * @async
 * @event
 * Triggered when the user select a language from the <select> element.
 * Change the language for the elements in the DOM.
 */
// eslint-disable-next-line no-unused-vars
async function updateLanguage() {
    // Parse user choice
    const e = document.getElementById("main-language-select");
    const selectedISO = e.options[e.selectedIndex].value;

    // Change language via IPC
    await window.API.changeLanguage(selectedISO);

    // Refresh strings
    await translateElementsInDOM();
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
        timer = 25000;
    } else if (type === "warning") {
        icon = "warning";
        htmlColor = "orange";
        timer = 15000;
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
 * @async
 * @private
 * Load credentials in the settings input fields.
 */
async function loadCredentials() {
    // Check path
    const credPath = await window.API.invoke("credentials-path");
    if (!window.IO.pathExists(credPath)) return;

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
function login() {
    // Check network connection
    if (!window.API.isOnline) {
        window.API.translate("MR no network connection").then((translation) =>
            sendToastToUser("warning", translation)
        );
        window.API.log.warn("No network connection, cannot login");
        return;
    }

    // Show the spinner in the avatar component
    document.getElementById("user-info").showSpinner();

    // Request user input
    window.API.log.info("Send API to main process for auth request");
    window.API.send("login-required");
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
}

/**
 * @private
 * Create an empty *game-card* and add it in the DOM.
 * @returns {HTMLElement} Created game-card element
 */
function addGameCard() {
    // Create a GameCard. The HTML is loaded when the custom element is connected to DOM, so:
    // 1 - First we create the element
    // 2 - When connect the element to DOM
    // 3 - Lastly. we can change the "gamedata" property
    const gameCard = document.createElement("game-card");
    addEventListenerToGameCard(gameCard);
    gameCard.setAttribute("id", `game-card-${lastGameCardID}`);
    lastGameCardID += 1;

    // Create a simil-table layout wit materialize-css
    // "s6" means that the element occupies 6 of 12 columns with small screens
    // "m5" means that the element occupies 5 of 12 columns with medium screens
    // "l4" means that the element occupies 4 of 12 columns with large screens
    // "xl3" means that the element occupies 3 of 12 columns with very large screens
    // The 12 columns are the base layout provided by materialize-css
    const column = document.createElement("div");
    column.setAttribute("class", "col s6 m5 l4 xl3");
    column.appendChild(gameCard);

    // Connect the new column in DOM
    const row = document.getElementById("game-cards-container");
    row.appendChild(column);

    return gameCard;
}

/**
 * @private
 * Add the event listeners (play/update/delete) to a specific GameCard.
 * @param {GameCard} gamecard Object to add the listeners to
 */
function addEventListenerToGameCard(gamecard) {
    gamecard.addEventListener("play", async function gameCardPlay(e) {
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
    });

    gamecard.addEventListener("update", function gameCardUpdate(e) {
        if (!e.target) return;

        guidedGameUpdate(gamecard, e.detail.gameDirectory, e.detail.url);
    });

    gamecard.addEventListener("delete", async function gameCardDelete(e) {
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
        if (data.checkboxChecked && e.detail.savePaths && gamecard.info.name) {
            const savePaths = e.detail.savePaths;
            const exportedSavesDir = await window.API.invoke("savegames-data-dir");
            const gameDirectory = window.API.join(exportedSavesDir, cleanGameName(gamecard.info.name));
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
        gamecard.deleteGameData();

        // Remove the column div containing the card
        const id = gamecard.getAttribute("id");
        document.querySelector(`#${id}`).parentNode.remove();
    });
}

/**
 * @async
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
    const includeMods = unparsedName.toUpperCase().includes(MOD_TAG) ?
        true :
        false;

    // Find game version
    const version = getGameVersionFromName(unparsedName);

    // Get only the game title
    const name = cleanGameName(unparsedName);

    // Search and add the game
    const promiseResult = await window.F95.getGameData(name, includeMods);

    // No game found
    if (promiseResult.length === 0) {
        const translation = await window.API.translate("MR no game found", {
            "gamename": name
        });
        sendToastToUser("warning", translation);
        return null;
    } else if (promiseResult.length !== 1) {
        const translation = await window.API.translate("MR multiple games found", {
            "gamename": name
        });
        sendToastToUser("warning", translation);
        return null;
    }

    // Add data to the parsed game info
    const copy = Object.assign({}, promiseResult[0]); // Copy reference to object
    const onlineGame = promiseResult[0];
    const onlineVersion = onlineGame.version;
    onlineGame.gameDirectory = path;
    onlineGame.version = version;

    // Update local data
    const card = addGameCard();
    card.info = onlineGame;
    card.saveGameData();
    if (onlineVersion.toUpperCase() !== version.toUpperCase()) {
        const promise = new Promise((resolve) => resolve(copy));
        card.notificateUpdate(promise);
    }

    // Game added correctly
    const translation = await window.API.translate("MR game successfully added", {
        "gamename": name
    });
    sendToastToUser("info", translation);
    return card;
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
 * @async
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

//#region Cached games
/**
 * @private
 * Load the data of the cached game and display them in the main window.
 */
async function loadCachedGames() {
    window.API.log.info("Load cached games...");

    // Get all the .json files in the game dir and create a <game-card> for each of them
    const gamesDir = await window.API.invoke("games-data-dir");
    const files = await window.IO.filter("*.json", gamesDir);

    // Load data in game-cards
    const promisesList = [];
    for (const filename of files) {
        const card = addGameCard();
        const gameJSONPath = window.API.join(gamesDir, filename);

        const promise = card.loadGameData(gameJSONPath);
        promisesList.push(promise);
    }

    // Write end log
    Promise.all(promisesList).then(function onAllCachedGamesLoaded() {
        window.API.log.info("Cached games loaded");
    });
}

/**
 * @private
 * Check the version of the listed games
 * in the game-card components in DOM.
 */
async function checkVersionCachedGames() {
    window.API.log.info("Checking for game updates...");
    const translation = await window.API.translate("MR checking games update");
    sendToastToUser("info", translation);

    // Get all the gamecards in DOM
    const cardGames = document.querySelectorAll("game-card");
    for (const card of cardGames) {
        // Get version
        const update = await window.F95.checkGameUpdates(card.info);

        // Trigger the component
        if (update) {
            const promise = window.F95.getGameDataFromURL(card.info.url);
            card.notificateUpdate(promise);
        }
    }
}
//#endregion Cached games

/**
 * @private
 * Select the tab with the specified ID in DOM.
 * @param {String} pageID
 */
function openPage(pageID) {
    // Local variables
    let i;

    // Hide all elements with class="tabcontent" by default
    const tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Show the specific tab content
    document.getElementById(pageID).style.display = "block";

    // Hide/show the add game button
    if (pageID === "main-games-tab" && window.F95.logged)
        document.querySelector("#fab-add-game-btn").style.display = "block";
    else document.querySelector("#fab-add-game-btn").style.display = "none";
}

/**
 * @private
 * Guide the user in the game update.
 * @param {HTMLElement} gamecard GameCard of the game to update
 * @param {String} gamedir Directory where the game is installed
 * @param {String} gameurl  URL of the game
 */
async function guidedGameUpdate(gamecard, gamedir, gameurl) {
    window.API.log.info(`Update of ${gamecard.info.name}, step 1`);

    // Open first dialog
    let titleTranslation = await window.API.translate(
        "MR update game step 1 title"
    );
    let messageTranslation = await window.API.translate(
        "MR update game step 1 message"
    );
    let detailTranslation = await window.API.translate("MR update game step 1 detail");
    let buttonTranslation = await window.API.translate("MR open f95 page");
    const cancelTranslation = await window.API.translate("MR cancel button");
    const optionsStepOne = {
        type: "info",
        buttons: [buttonTranslation, cancelTranslation],
        defaultId: 1, // Cancel
        title: titleTranslation,
        message: messageTranslation,
        detail: `${detailTranslation}:\n ${gamecard.changelog}`,
    };

    let data = await window.API.invoke("message-dialog", optionsStepOne);
    if (!data) return;
    if (data.response !== 0) return;

    // Open URL in default browser
    window.API.send("exec", gameurl);

    // Open the game directory
    window.API.send("exec", gamedir);

    // Mark the update as completed
    titleTranslation = await window.API.translate("MR update game step 2 title");
    messageTranslation = await window.API.translate(
        "MR update game step 2 message"
    );
    detailTranslation = await window.API.translate(
        "MR update game step 2 detail"
    );
    buttonTranslation = await window.API.translate("MR update completed");
    const optionsStepTwo = {
        type: "info",
        buttons: [buttonTranslation, cancelTranslation],
        defaultId: 1, // Cancel
        title: titleTranslation,
        message: messageTranslation,
        detail: detailTranslation,
    };
    window.API.log.info(`Update of ${gamecard.info.name}, step 2`);

    data = await window.API.invoke("message-dialog", optionsStepTwo);
    if (!data) return;
    if (data.response !== 0) return;

    // Finalize the update
    const result = await gamecard.finalizeUpdate();

    if (!result) {
        const translation = await window.API.translate(
            "MR error finalizing update"
        );
        sendToastToUser("error", translation);
        window.API.log.error(
            "Cannot finalize the update, please check if another directory of the game exists"
        );
    }
}

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
        // Send error message
        const translation = await window.API.translate(
            "MR cannot retrieve user data"
        );
        sendToastToUser("error", translation);
        window.API.log.error("Something wrong while retrieving user info from F95");
    }

    // Update component
    document.getElementById("user-info").userdata = userdata;
}

//#endregion Private methods

//#region IPC receive
// Called when the window is being closed
window.API.receive("window-closing", function onWindowClosing() {
    // Save data game
    const cardGames = document.querySelectorAll("game-card");
    const promiseList = [];
    for (const card of cardGames) {
        const promise = card.saveGameData();
        promiseList.push(promise);
    }

    Promise.all(promiseList)
        .then(async function onAllGameCardsDataSaved() {
            // Tell the main process to close this BrowserWindow
            window.API.send("main-window-closing");
        });
});

// Called when the result of the authentication are ready
window.API.receive("auth-result", async function onAuthResult(result) {
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
        const translation = await window.API.translate("MR login successful");
        sendToastToUser("info", translation);

        // Show "new game" button
        document.querySelector("#fab-add-game-btn").style.display = "block";

        // Load user data
        getUserDataFromF95();

        // Check games updates
        checkVersionCachedGames();
    } catch (e) {
        // Send error message
        const translation = await window.API.translate("MR cannot login", {
            "error": e
        });
        sendToastToUser("error", translation);
        window.API.log.error(`Cannot login: ${e}`);
    }
});
//#endregion IPC receive
