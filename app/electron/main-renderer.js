"use strict";

/* Global variables */
let lastGameCardID = 0;
let logged = false;

//#region Events
document.addEventListener("DOMContentLoaded", async function () {
  // This function runs when the DOM is ready, i.e. when the document has been parsed
  window.API.log.info("DOM loaded, initializing elements");
  await translateElementsInDOM();
  await listAvailableLanguages();

  // Initialize the navigator-tab
  const tabNavigator = document.getElementById("tab-navigator");
  M.Tabs.init(tabNavigator, {});

  // Initialize the floating button
  const fabs = document.querySelectorAll(".fixed-action-btn");
  M.FloatingActionButton.init(fabs, {
    direction: "left",
    hoverEnabled: false,
  });

  // Initialize the <select> for languages
  const selects = document.querySelectorAll("select");
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

document.querySelector("#search-game-name").addEventListener("input", () => {
  // Obtain the text
  const searchText = document
    .getElementById("search-game-name")
    .value.toUpperCase();

  // Obtain all the available GameCard
  const gameCards = document.querySelectorAll("game-card");

  // Hide the column which the game-card belong
  // if it's games with a title that not match the search query
  for (const gameCard of gameCards) {
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
  .addEventListener("click", async function () {
    let translationDialog = await window.API.translate(
      "MR select game directory"
    );
    const openDialogOptions = {
      title: translationDialog,
      properties: ["openDirectory"],
    };

    const data = await window.API.invoke("open-dialog", openDialogOptions);

    // No folder selected
    if (data.filePaths.length === 0) return;

    // Check if the game is already present
    const gameFolderPaths = await getUnlistedGamesInArrayOfPath(data.filePaths);
    if (gameFolderPaths.length === 0) return;
    const gamePath = gameFolderPaths[0];

    // Ask the URL of the game
    translationDialog = await window.API.translate("MR insert game url");
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
    card.info.gameDir = gamePath;
    card.saveGameData();
  });

document
  .querySelector("#add-local-game-btn")
  .addEventListener("click", async function () {
    const translationDialog = await window.API.translate(
      "MR select game directory"
    );
    const openDialogOptions = {
      title: translationDialog,
      properties: ["openDirectory", "multiSelections"],
    };
    const data = await window.API.invoke("open-dialog", openDialogOptions);

    // No folder selected
    if (data.filePaths.length === 0) return;

    // Check if the games are already present
    const gameFolderPaths = await getUnlistedGamesInArrayOfPath(data.filePaths);

    // Obtain the data
    const translation = await window.API.translate("MR adding game from path");
    sendToastToUser("info", translation);
    getGameFromPaths(gameFolderPaths);
  });

document
  .querySelector("#settings-password-toggle")
  .addEventListener("click", () => {
    const input = document.getElementById("settings-password-txt");

    if (input.type === "password") input.type = "text";
    else input.type = "password";
  });

document
  .querySelector("#settings-save-credentials-btn")
  .addEventListener("click", async function () {
    const credPath = await window.API.invoke("credentials-path");
    const username = document.getElementById("settings-username-txt").value;
    const password = document.getElementById("settings-password-txt").value;

    const credentials = {
      username: username,
      password: password,
    };
    const json = JSON.stringify(credentials);
    window.IO.write(credPath, json);
    const translation = await window.API.translate("MR credentials edited");
    sendToastToUser("info", translation);
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
      iso + ".png"
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
 * @async
 * @event
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
  if (pageID === "main-games-tab" && logged)
    document.querySelector("#fab-add-game-btn").style.display = "block";
  else document.querySelector("#fab-add-game-btn").style.display = "none";
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
  gameCard.setAttribute("id", "game-card-" + lastGameCardID);
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
  gamecard.addEventListener("play", async function (e) {
    if (!e.target) return;
    const launcherPath = e.detail.launcher;

    // Check if the path exists
    const exists = await window.IO.pathExists(launcherPath);
    const translation = await window.API.translate("MR cannot find game path");
    if (!exists) {
      window.API.log.error("Cannot find game path: " + launcherPath);
      sendToastToUser("error", translation);
      return;
    }

    // Launch the game
    window.API.send("exec", launcherPath);
  });

  gamecard.addEventListener("update", function (e) {
    if (!e.target) return;

    guidedGameUpdate(gamecard, e.detail.gameDir, e.detail.url);

    // Download and install (first hosting platoform in list)
    // !!! Against the guidelines: DON'T DO IT !!!
    // let downloadInfo = e.detail["downloadInfo"];
    // for (let di of downloadInfo) {
    //   if (di.supportedOS.includes(window.API.platform)) {
    //     di.download(gameDir);
    //     break;
    //   }
    // }
  });

  gamecard.addEventListener("delete", async function (e) {
    if (!e.target) return;

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
    const dialogOptions = {
      type: "question",
      buttons: [
        removeOnlyTranslation,
        deleteAlsoTranslation,
        cancelTranslation,
      ],
      defaultId: 2, // Cancel
      title: titleTranslation,
      message: messageTranslation,
      checkboxLabel: checkboxTranslation,
      checkboxChecked: true,
    };

    const data = await window.API.invoke("message-dialog", dialogOptions);
    if (!data) return;

    // Cancel button
    if (data.response === 2) return;
    else {
      // Copy saves
      if (data.checkboxChecked) {
        // TODO...
      }

      // Delete also game files
      if (data.response === 1) {
        const gameDir = e.detail.gameDir;
        await window.IO.deleteFolder(gameDir);
      }

      // Remove the game data
      gamecard.deleteGameData();

      // Remove the column div containing the card
      const id = gamecard.getAttribute("id");
      document.querySelector("#" + id).parentNode.remove();
    }
  });
}

/**
 * @private
 * Guide the user in the game update.
 * @param {HTMLElement} gamecard GameCard of the game to update
 * @param {String} gamedir Directory where the game is installed
 * @param {String} gameurl  URL of the game
 */
async function guidedGameUpdate(gamecard, gamedir, gameurl) {
  window.API.log.info("Update of " + gamecard.info.name + ", step 1");

  // Open first dialog
  let titleTranslation = await window.API.translate(
    "MR update game step 1 title"
  );
  let messageTranslation = await window.API.translate(
    "MR update game step 1 message"
  );
  let detailTranslation = await window.API.translate(
    "MR update game step 1 detail"
  );
  let buttonTranslation = await window.API.translate("MR open f95 page");
  const cancelTranslation = await window.API.translate("MR cancel button");
  const optionsStepOne = {
    type: "info",
    buttons: [buttonTranslation, cancelTranslation],
    defaultId: 1, // Cancel
    title: titleTranslation,
    message: messageTranslation,
    detail: detailTranslation + ":\n" + gamecard.changelog,
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
  window.API.log.info("Update of " + gamecard.info.name + ", step 2");

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
 * Remove all the special characters from a string.
 * It remove all the characters (spaced excluded) that have the same "value" in upper and lower case.
 * @param {String} str String to parse
 * @param {String[]} allowedChars List of allowed special chars
 * @returns {String} Parsed string
 */
function removeSpecials(str, allowedChars) {
  const lower = str.toLowerCase();
  const upper = str.toUpperCase();

  let res = "";
  for (let i = 0; i < lower.length; ++i) {
    if (
      lower[i] !== upper[i] ||
      lower[i].trim() === "" ||
      allowedChars.includes(lower[i])
    )
      res += str[i];
  }
  return res;
}

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
  Promise.all(promisesList).then(function () {
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
      const promise = window.F95.getGameDataFromURL(card.info.f95url);
      card.notificateUpdateOnPromise(promise);
    }
  }
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

/**
 * @async
 * @private
 * Given a directory listing, it gets information about the games contained in them.
 * @param {String[]} paths Path of the directories containg games
 */
async function getGameFromPaths(paths) {
  // Allow max 3 searched at the time
  let promiseList = [];
  const MAX_PROMISE_AT_TIME = 3;

  // Parse the game dir name(s)
  for (const path of paths) {
    const promise = getGameFromPath(path)
      .then(function (result) {
        if (result.result) return;
        // Send the error message to the user if the game is not found
        sendMessageToUserWrapper(
          "warning",
          "Game not detected",
          result.message,
          result.detail
        );
        window.API.log.warn(
          "Cannot detect game: " + result.message + ", " + result.detail
        );
      })
      .catch(function (error) {
        // Send error message
        sendMessageToUserWrapper(
          "error",
          "Unexpected error",
          "Cannot retrieve game data (" +
            path +
            "), unexpected error: " +
            error,
          ""
        );
        window.API.log.error(
          "Unexpected error while retrieving game data from path: " +
            path +
            ". " +
            error
        );
      });

    promiseList.push(promise);
    if (promiseList.length === MAX_PROMISE_AT_TIME) {
      window.API.log.silly(
        "Waiting for promises for game data from multiple paths to finish..."
      );
      await Promise.all(promiseList);
      promiseList = [];
    }
  }
}

/**
 * @async
 * @private
 * Given a directory path, parse the dirname, get the
 * game (if exists) info and add a *game-card* in the DOM.
 * @param {String} path Game directory path
 * @returns {Promise<Object>} Dictionary containing the result of the operation: {result, message}
 */
async function getGameFromPath(path) {
  // After the splitting, the last name is the directory name
  const unparsedName = path.split("\\").pop();

  // Check if it is a mod
  const MOD_TAG = "[MOD]";
  const includeMods = unparsedName.toUpperCase().includes(MOD_TAG)
    ? true
    : false;

  // Find game version
  const version = getGameVersionFromName(unparsedName);

  // Get only the game title
  const name = cleanGameName(unparsedName);

  // Search and add the game
  const promiseResult = await window.F95.getGameData(name, includeMods);

  // No game found
  if (promiseResult.length === 0) {
    return {
      result: false,
      message: "Cannot retrieve information for " + unparsedName,
      detail:
        "Check the network connection, check if the game exists or verify that the game directory name is in the format: game name [v. Game Version] [MOD]\n(Case insensitive, use [MOD] only if necessary)",
      cardElement: null,
    };
  } else if (promiseResult.length !== 1) {
    return {
      result: false,
      message: "Cannot retrieve information for " + unparsedName,
      detail:
        "Multiple occurrences of '" +
        unparsedName +
        "' detected. Add the game via URL",
      cardElement: null,
    };
  }

  // Add the game
  const copy = Object.assign({}, promiseResult[0]); // Copy reference to object
  const firstGame = promiseResult[0];
  const card = addGameCard();
  const onlineVersion = firstGame.version;

  // Update local data
  firstGame.gameDir = path;
  firstGame.version = version;
  card.info = firstGame;
  card.saveGameData();
  if (onlineVersion.toUpperCase() !== version.toUpperCase()) {
    card.notificateUpdate(copy);
  }

  return {
    result: true,
    message: name + " added correctly",
    detail: "",
    cardElement: card,
  };
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
  const rx = /[/\\?%*:|"<>]/g;
  name = name.replaceAll(rx, "").trim();

  return name;
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
    const startIndex =
      name.toUpperCase().indexOf(PREFIX_VERSION) + PREFIX_VERSION.length;
    const endIndex = name.indexOf("]", startIndex);
    version = name.substr(startIndex, endIndex - startIndex);
  }

  return version;
}

/**
 * @private
 * Wrapper to show a plain message box to the user.
 * @param {String} type Type of message (*error/warning/...*)
 * @param {String} title Title of the window
 * @param {String} message Message to the user
 * @param {String} detail Submessage to the user
 */
function sendMessageToUserWrapper(type, title, message, detail) {
  // Send the error message to the user if the game is not found
  const warningDialogOptions = {
    type: type,
    buttons: ["OK"],
    defaultId: 0,
    title: title,
    message: message,
    detail: detail,
  };

  // Send a message to the user
  window.API.invoke("message-dialog", warningDialogOptions);
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

  const htmlToast =
    "<i class='material-icons' style='padding-right: 10px'>" +
    icon +
    "</i><span>" +
    message +
    "</span>";
  M.toast({
    html: htmlToast,
    displayLength: 5000,
    classes: htmlColor,
  });
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
  if (userdata === null || !userdata) {
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

/**
 * @async
 * @private
 * Check that the specified paths do not belong to games already in the application.
 * @param {String[]} paths List of game paths to check
 * @returns {Promise<String[]>} List of valid paths
 */
async function getUnlistedGamesInArrayOfPath(paths) {
  // Local variables
  let gameFolderPaths = [];
  let listedGameNames = [];

  // Check if the game(s) is (are) already present
  const cardGames = document.querySelectorAll("game-card");
  cardGames.forEach(card => listedGameNames.push(cleanGameName(card.info.name).toUpperCase()));

  for (const path of paths) {
    // Get the clean game name
    const unparsedName = path.split("\\").pop();
    const newGameName = cleanGameName(unparsedName);

    // Check if it's already present
    if (listedGameNames.includes(newGameName.toUpperCase())) {
      const translationWarn = await window.API.translate("MR game already listed"); // This game is already present: ...
      sendToastToUser("warning", translationWarn + newGameName);
    }
    // ... else add it to the list
    else gameFolderPaths.push(path);
  }

  return gameFolderPaths;
}

//#endregion Private methods

//#region IPC receive
// Called when the window is being closed
window.API.receive("window-closing", function () {
  // Save data game
  const cardGames = document.querySelectorAll("game-card");
  const promiseList = [];
  for (const card of cardGames) {
    const promise = card.saveGameData();
    promiseList.push(promise);
  }

  Promise.all(promiseList).then(function () {
    // Close F95 browser
    window.F95.logout();

    // Tell the main process to close this BrowserWindow
    window.API.send("main-window-closing");
  });
});

// Called when the result of the authentication are ready
window.API.receive("auth-result", (args) => {
  // Parse args
  const result = args[0];
  const username = args[1];
  const password = args[2];

  window.API.log.info("Authentication result: " + result);
  if (result !== "AUTHENTICATED") {
    // Hide "new game" button
    document.querySelector("#fab-add-game-btn").style.display = "none";

    // Hide spinner
    document.getElementById("user-info").hideSpinner();
    return;
  }

  // Load data (session not shared between windows)
  window.F95.login(username, password)
    .then(function () {
      window.API.translate("MR login successful").then((translation) =>
        sendToastToUser("info", translation)
      );
      logged = true;

      // Load F95 base data
      window.F95.loadF95BaseData();

      // Load user data
      getUserDataFromF95();

      // Check games updates
      checkVersionCachedGames();

      // Show "new game" button
      document.querySelector("#fab-add-game-btn").style.display = "block";
    })
    .catch(function (error) {
      // Send error message
      window.API.translate("MR cannot login").then((translation) =>
        sendToastToUser("error", translation + ": " + error)
      );
      window.API.log.error("Cannot login: " + error);
    });
});
//#endregion IPC receive
