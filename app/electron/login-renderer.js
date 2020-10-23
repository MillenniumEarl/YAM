"use strict";

//#region Events
document.addEventListener("DOMContentLoaded", async function () {
  // This function runs when the DOM is ready, i.e. when the document has been parsed
  await translateElementsInDOM();

  const credentialsPath = await window.API.invoke("credentials-path");

  // Load credentials if saved on disk
  window.IO.fileExists(credentialsPath).then(function (exists) {
    if (!exists) return;

    // Read and parse credentials
    window.IO.read(credentialsPath).then(function (json) {
      const credentials = JSON.parse(json);

      const username = credentials.username;
      const password = credentials.password;

      // "Select" the textboxes to not overlap textual values and placeholder text
      document.querySelector("label[for='login-username']").classList.add("active");
      document.querySelector("label[for='login-password']").classList.add("active");

      // Insert credentials in textboxes
      document.getElementById("login-username").value = username;
      document.getElementById("login-password").value = password;

      // Try to log-in
      login(username, password);
    });
  });
});

document.querySelector("#login-login-btn").addEventListener("click", async function () {
  // Get the credentials inserted by the user
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;

  // Check credentials
  if (isNullOrWhitespace(username)) {
    let message = await window.API.translate("LR invalid username");
    setMessage(message, "warning");
    return;
  }
  if (isNullOrWhitespace(password)) {
    let message = await window.API.translate("LR invalid password");
    setMessage(message, "warning");
    return;
  }

  // Try to log-in
  login(username, password);
});

document.querySelector("#login-cancel-btn").addEventListener("click", function () {
  // Close the current window witouth authentication
  window.API.send("auth-result", "CANCELLED", null, null);
  window.API.send("login-window-closing");
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
  for(let e of elements) {
    // Change text if no child elements are presents...
    if(e.childNodes.length === 0) e.textContent = await window.API.translate(e.id);
    // ... or change only the last child (the text)
    else e.childNodes[e.childNodes.length - 1].textContent = await window.API.translate(e.id);
  }
}

/**
 * Check if a string is null, empty or composed only of white spaces.
 * @param {String} input
 * @returns {Boolean}
 */
function isNullOrWhitespace(input) {
  return !input || !input.trim();
}

/**
 * Manage the result of the login into the platform.
 * @param {LoginResult} result Result of the login operation
 * @param {String} username Username used during authentication
 * @param {String} password Password used during authentication
 */
async function manageLoginResult(result, username, password) {
  if (result.success) {
    // Valid auth, save and send credentials to main process
    const credentials = {
      username: username,
      password: password,
    };
    const json = JSON.stringify(credentials);

    const path = await window.API.invoke("credentials-path");
    await window.IO.write(path, json);
    
    // Close F95 browser
    await window.F95.logout();

    // Close the window
    window.API.send("auth-result", "AUTHENTICATED", username, password);
    window.API.send("login-window-closing");
  } else {
    // Show error message
    const translation = await window.API.translate("LR error during authentication", {
      "error": result.message
    });
    setMessage(translation, "error");

    // Unblock elements and hide the progress bar
    document.getElementById("login-login-btn").classList.remove("disabled");
    document.getElementById("login-cancel-btn").classList.remove("disabled");
    document.getElementById("login-progressbar").style.display = "none";
  }
}

/**
 * Try to log-in to the platform and manage result.
 * Save the credentials and close the window if the authentication is successfull.
 * @param {String} username
 * @param {String} password
 */
async function login(username, password) {
  // Block elements and show a progress bar
  document.getElementById("login-login-btn").classList.add("disabled");
  document.getElementById("login-cancel-btn").classList.add("disabled");
  document.getElementById("login-progressbar").style.display = "block";

  // Try to log-in
  const result = await window.F95.login(username, password)
  manageLoginResult(result, username, password);
}

/**
 * Set a message to show to the user.
 * @param {String} message Message to show
 * @param {String} type Type of message, can only be *error/warning/information*
 */
function setMessage(message, type) {
  // Select the message color
  let color = "";
  if (type === "error") color = "#990000";
  // --secondary-app-color in button-style.css
  else if (type === "warning") color = "#FF9900";
  else color = "#00CC00";

  // Set the message
  const element = document.getElementById("login-error-message");
  element.innerText = message;
  element.style.color = color;

  // Hide the element if the message is empty
  if (message === "") element.style.display = "none";
}
//#endregion Private methods
