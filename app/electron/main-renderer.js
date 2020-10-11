/*### Generic events ###*/
document.addEventListener("DOMContentLoaded", function () {
  // This function runs when the DOM is ready, i.e. when the document has been parsed

  // Initialize the navigator-tab
  let tabNavigator = document.getElementById("navigator-tab");
  M.Tabs.init(tabNavigator, {});

  // Initialize the floating button
  let elems = document.querySelectorAll('.fixed-action-btn');
  M.FloatingActionButton.init(elems, {
    direction: 'left',
    hoverEnabled: false
  });

  // Select the defualt page
  openPage('games-tab');

  // Load the cached games
  loadCachedGames()
  .then(function() {
    // Login after loading games to 
    // allow the games to search for updates
    login();
  });
});

/*### Events ###*/
document.querySelector("#search-game-name").addEventListener("input", () => {
  // Obtain the text
  let searchText = document
    .getElementById("search-game-name")
    .value.toUpperCase();

  // Obtain all the available GameCard
  let gameCards = document.querySelectorAll("game-card");

  // Hide the column which the game-card belong
  // if it's games with a title that not match the search query
  for (let gameCard of gameCards) {
    if (!gameCard.info.name.toUpperCase().startsWith(searchText)) {
      gameCard.parentNode.style.display = "none";
    } else {
      gameCard.parentNode.style.display = "block";
    }
  }
});

document.querySelector("#user-info").addEventListener("login", login);

document.querySelector("#add-remote-game-btn").addEventListener("click", async function () {
  let openDialogOptions = {
    title: "Select game directory",
    properties: ["openDirectory"],
  };

  let data = await window.API.invoke("open-dialog", openDialogOptions);

  // No folder selected
  if (data.filePaths.length === 0) return;

  // No folder selected
  if (data.filePaths.length === 0) return;

  // Ask the URL of the game
  let promptDialogOptions = {
    title: 'Insert the game URL on F95Zone',
    label: 'URL:',
    value: 'https://f95zone.to/threads/gamename/',
    inputAttrs: {
      type: 'url'
    },
    type: 'input'
  }

  let url = await window.API.invoke("prompt-dialog", promptDialogOptions);
  if (!url) return;

  // Add game to list
  let cardPromise = await getGameFromPath(data.filePaths.pop());
  if (!cardPromise.cardElement) return;

  let info = await window.F95.getGameDataFromURL(url);
  cardPromise.cardElement.info = info;
});

document.querySelector("#add-local-game-btn").addEventListener("click", () => {
  let openDialogOptions = {
    title: "Select game directory",
    properties: ["openDirectory", "multiSelections"],
  };

  window.API.invoke("open-dialog", openDialogOptions)
    .then((data) => {
      // No folder selected
      if (data.filePaths.length === 0) return;

      // Obtain the data
      getGameFromPaths(data.filePaths);
    });
});

//#region Private methods
/**
 * @private
 * Select the tab with the specified ID in DOM.
 * @param {String} pageID 
 */
function openPage(pageID) {
  // Local variables
  let i, tabcontent;

  // Hide all elements with class="tabcontent" by default
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Show the specific tab content
  document.getElementById(pageID).style.display = "block";
}

/**
 * @private
 * Create a new <div> in the DOM with the materialize-css's "row" class.
 * @returns {HTMLDivElement} Created div
 */
function createNewGridRowInDOM() {
  // Create a new div "row"
  let row = document.createElement("div");
  row.setAttribute("class", "row");

  // Select the container div
  let container = document.getElementById("games-tab");

  // Add the row to the div
  container.appendChild(row);

  return row;
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
  let gameCard = document.createElement("game-card");
  addEventListenerToGameCard(gameCard);

  // Create a simil-table layout wit materialize-css
  // "s4" means that the element occupies 4 of 12 columns
  // The 12 columns are the base layout provided by materialize-css
  let column = document.createElement("div");
  column.setAttribute("class", "col s4");
  column.appendChild(gameCard);

  // Check if is needed to create a new "row" in the grid
  let cardGamesNumber = document.querySelectorAll("game-card").length;
  let rowsInDOM = document.querySelectorAll("#games-tab > div.row");
  let gamesPerRow = 3; // s4 -> 12 / 4 = 3
  let row;
  if (rowsInDOM.length == 0) {
    // We need a new row!
    row = createNewGridRowInDOM();
  } else if (cardGamesNumber % gamesPerRow == 0) {
    // We need a new row!
    row = createNewGridRowInDOM();
  } else {
    // Select the last row
    row = rowsInDOM[rowsInDOM.length - 1];
  }

  // Connect the new column to the pre-existend/new row in DOM
  row.appendChild(column);

  return gameCard;
}

/**
 * @private
 * Add the event listeners (play/update/delete) to a specific GameCard.
 * @param {GameCard} gamecard Object to add the listeners to
 */
function addEventListenerToGameCard(gamecard) {
  gamecard.addEventListener('play', function (e) {
    if (e.target) {
      let launcherPath = e.detail["launcher"];
      window.API.send("exec", launcherPath);
    }
  });

  gamecard.addEventListener('update', function (e) {
    if (e.target) {
      // Parse info
      let gameDir = e.detail["gameDir"];
      let downloadInfo = e.detail["downloadInfo"];
      let url = e.detail["url"];
      window.API.send("exec", url);
      return;

      // Download and install (first hosting platoform in list)
      // !!! Against the guidelines: DON'T DO IT !!!
      for (let di of downloadInfo) {
        if (di.supportedOS.includes(window.API.platform)) {
          di.download(gameDir);
          break;
        }
      }
    }
  });

  gamecard.addEventListener('delete', function (e) {
    if (e.target) {
      let gameDir = e.detail["gameDir"];
      window.IO.deleteFolder(gameDir);
    }
  });
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
  let lower = str.toLowerCase();
  let upper = str.toUpperCase();

  let res = "";
  for (let i = 0; i < lower.length; ++i) {
    if (
      lower[i] != upper[i] ||
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
  console.log("Load cached games...");

  // Get all the .json files in the game dir and create a <game-card> for each of them
  let gamesDir = await window.API.invoke("games-data-dir");
  let files = await window.IO.filter("*.json", gamesDir);

  // Load data in game-cards
  let promisesList = [];
  for (let filename of files) {
    let card = addGameCard();
    let gameJSONPath = window.API.join(gamesDir, filename);

    let promise = card.loadGameData(gameJSONPath);
    promisesList.push(promise);
  }

  // Write end log
  Promise.all(promisesList).then(function() {
    console.log("Cached games loaded");
  });
}

/**
 * @private
 * Check the version of the listed games 
 * in the game-card components in DOM.
 */
async function checkVersionCachedGames() {
  console.log("Checking games updates...");

  // Get all the gamecards in DOM
  let cardGames = document.querySelectorAll("game-card");
  for (let card of cardGames) {
    // Get version
    let update = await window.F95.checkGameUpdates(card.info);
    
    // Trigger the component
    if (update) {
      let promise = window.F95.getGameDataFromURL(card.info.f95url);
      card.notificateUpdateOnPromise(promise);
    }
  }

  console.log("Games updates checked");
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
    // Send error message
    sendMessageToUserWrapper(
      "warining",
      "No connection",
      "No network connection detected, unable to login to F95Zone",
      "The lack of connection prevents you from logging in and updating the games but still allows you to play them"
    );
    console.warn("No network connection, cannot login");
    return;
  }

  // Show the spinner in the avatar component
  document.getElementById("user-info").showSpinner();

  // Request user input
  console.log("Send API to main process for auth request");
  window.API.send("login-required");
}

/**
 * @async
 * @private
 * Given a directory listing, it gets information about the games contained in them.
 * @param {String[]} paths Path of the directories containg games
 */
async function getGameFromPaths(paths) {
  // Allow max 5 searched at the time
  let promiseList = [];
  const MAX_PROMISE_AT_TIME = 5;

  // Parse the game dir name(s)
  for (let path of paths) {
    let promise = getGameFromPath(path)
      .then(function (result) {
        if (result["result"] === false) {
          // Send the error message to the user if the game is not found
          sendMessageToUserWrapper(
            "warning",
            "Game not detected",
            result["message"],
            "Check the network connection or verify that the game directory name is in the format: game name [v. Game Version] [MOD]\n(Case insensitive, use [MOD] only if necessary)"
          );
        }
      })
      .catch(function (error) {
        // Send error message
        sendMessageToUserWrapper(
          "error",
          "Unexpected error",
          "Cannot retrieve game data, unexpected error: " + error,
          ""
        );
      });

    promiseList.push(promise);
    if (promiseList.length === MAX_PROMISE_AT_TIME) {
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
  let unparsedName = path.split("\\").pop();

  // Check if it is a mod
  const MOD_TAG = "[MOD]";
  let includeMods = unparsedName.toUpperCase().includes(MOD_TAG) ? true : false;

  // Find game version
  let version = getGameVersionFromName(unparsedName);

  // Get only the game title
  name = cleanGameName(unparsedName);

  // Search and add the game
  let resultInfo = await window.F95.getGameData(name, includeMods);
  
  // No game found
  if (resultInfo.length === 0)
    return {
      result: false,
      message: "Cannot retrieve information for " + unparsedName,
      cardElement: null,
    };

  // Add the game
  let copy = { ... resultInfo };
  let firstGame = resultInfo.pop(); // ???
  let card = addGameCard();
  let onlineVersion = firstGame.version;

  // Update local data
  firstGame.gameDir = path;
  firstGame.version = version;
  card.info = firstGame;
  if (onlineVersion.toUpperCase() !== version.toUpperCase()) {
    card.notificateUpdate(copy.pop());
  }
  
  return {
    result: true,
    message: name + " added correctly",
    cardElement: card
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
  let rx = /\[(.*?)\]/g;
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
    let startIndex =
      name.toUpperCase().indexOf(PREFIX_VERSION) + PREFIX_VERSION.length;
    let endIndex = name.indexOf("]", startIndex);
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
  let warningDialogOptions = {
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
 * @private
 * Obtain data of the logged user and show them in the custom element "user-info".
 */
async function getUserDataFromF95() {
  // Retrieve user data
  let userdata = await window.F95.getUserData();

  // Check user data
  if (userdata === null || !userdata) {
    // Send error message
    sendMessageToUserWrapper(
      "error",
      "Unexpected error",
      "Cannot retrieve user data",
      ""
    );
  }
  
  // Update component
  document.getElementById("user-info").userdata = userdata;
}
//#endregion Private methods

//#region IPC receive
// Called when the window is being closed
window.API.receive("window-closing", function () {
  // Save data game
  let cardGames = document.querySelectorAll("game-card");
  let promiseList = [];
  for (let card of cardGames) {
    let promise = card.saveGameData();
    promiseList.push(promise);
  }

  Promise.all(promiseList)
  .then(function() {
    // Close F95 browser
    window.F95.logout();

    // Tell the main process to close this BrowserWindow
    window.API.send("main-window-closing");
  });
});

// Called when the result of the authentication are ready
window.API.receive("auth-result", (args) => {
  // Parse args
  let result = args[0];
  let username = args[1];
  let password = args[2];

  console.log("Authentication result: " + result);
  if (result !== "AUTHENTICATED") return;

  // Load data (session not shared between windows)
  window.F95.login(username, password)
    .then(function () {
      // Load F95 base data
      window.F95.loadF95BaseData();

      // Load user data
      getUserDataFromF95();

      // Check games updates
      checkVersionCachedGames();
    })
    .catch(function (error) {
      // Send error message
      sendMessageToUserWrapper(
        "error",
        "Unexpected error",
        "Cannot login, unexpected error: " + error,
        ""
      );
    });
});
//#endregion IPC receive
