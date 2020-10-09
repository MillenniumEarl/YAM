/*### Generic events ###*/
document.addEventListener("DOMContentLoaded", function () {
  // This function runs when the DOM is ready, i.e. when the document has been parsed

  // Initialize the navigator-tab
  let tabNavigator = document.getElementById("navigator-tab");
  M.Tabs.init(tabNavigator, {});

  // Get the element with id="default-open-tab" and click on it
  document.getElementById("default-open-tab").click();

  // Load the cached games
  loadCachedGames();

  // Login to F95Zone
  login();
});

/*### Text changed events ###*/
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
    if (!gameCard.info.name.startsWith(searchText)) {
      gameCard.parentNode.style.display = "none";
    } else {
      gameCard.parentNode.style.display = "block";
    }
  }
  // TODO: Check if works
  // for (let i = 0; i < gameCards.length; i++) {
  //   let gameName = gameCards[i].info.name.toUpperCase();
  //   if (!gameName.startsWith(searchText)) {
  //     gameCards[i].parentNode.style.display = "none";
  //   } else {
  //     gameCards[i].parentNode.style.display = "block";
  //   }
  // }
});

/*### Click events ###*/
document.querySelector("#user-info").addEventListener("login", login());

document.querySelector("#add-game-btn").addEventListener("click", () => {
  let openDialogOptions = {
    title: "Select game directory",
    properties: ["openDirectory"],
  };

  window.API.invoke("open-dialog", openDialogOptions).then((data) => {
    // No folder selected
    if (data.filePaths.length === 0) return;

    // Parse the game dir name(s)
    for (let path of data.filePaths) {
      getGameFromPath(path)
        .then(function (result) {
          if (!result["result"]) {
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
    }
  });
});

//#region Private methods
function openPage(pageName) {
  // Local variables
  let i, tabcontent;

  // Hide all elements with class="tabcontent" by default
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Show the specific tab content
  document.getElementById(pageName).style.display = "block";
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
function loadCachedGames() {
  console.log("Load cached games...");

  // Get all the .json files in the game dir and create a <game-card> for each of them
  window.API.invoke("games-data-dir").then(function (dir) {
    window.IO.filter("*.json", dir).then(function (files) {
      for (const filename of files) {
        let card = addGameCard();
        // TODO card.datapath = window.API.join(window.API.gameDataDir, filename);
      }
      console.log("Loading completed");
    });
  });
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

  // Request user input
  console.log("Send API to main process for auth request");
  window.API.send("login-required");
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
    };

  // Add the game
  let firstGame = resultInfo.pop();
  let card = addGameCard();
  firstGame.gameDir = path;
  card.info = firstGame

  // TODO: Search for updates
  return {
    result: true,
    message: name + " added correctly",
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
  window.API.send("message-dialog", warningDialogOptions);
}

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
  // Remove all the GameCards to allow saving data
  let cardGames = document.querySelectorAll("game-card");
  for (let card of cardGames) {
    // Remove the <div> containing the card
    card.parentNode.removeChild(card);
  }

  // Close F95 browser
  window.F95.logout();

  // Tell the main process to close this BrowserWindow
  window.API.send("main-window-closing");
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

      // Show "add game" button
      document.getElementById("add-game-btn").style.display = "block";

      // // Hide "login" button
      // document.getElementById("login-btn").style.display = "none";
      // // Check update for all the listed games
      // let cardGames = document.querySelectorAll("game-card");
      // for (let card of cardGames) {
      //   card.checkUpdates();
      // }
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
