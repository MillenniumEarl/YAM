"use strict";

/*### Generic events ###*/
document.addEventListener("DOMContentLoaded", async function () {
  // This function runs when the DOM is ready, i.e. when the document has been parsed

  const credentialsPath = await window.API.invoke("credentials-path");

  // Load credentials if saved on disk
  window.IO.fileExists(credentialsPath).then(function (exists) {
    if (!exists) return;

    // Read and parse credentials
    window.IO.read(credentialsPath).then(function (json) {
      const credentials = JSON.parse(json);

      const username = credentials["username"];
      const password = credentials["password"];

      // "Select" the textboxes to not overlap textual values and placeholder text
      document.querySelector("label[for='username']").classList.add("active");
      document.querySelector("label[for='password']").classList.add("active");

      // Insert credentials in textboxes
      document.getElementById("username").value = username;
      document.getElementById("password").value = password;

      // Try to log-in
      login(username, password);
    });
  });
});

/*### Click events ###*/
document.querySelector("#login-btn").addEventListener("click", function () {
  // Get the credentials inserted by the user
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  // Check credentials
  if (isNullOrWhitespace(username)) {
    setMessage("Invalid username", "warning");
    return;
  }
  if (isNullOrWhitespace(password)) {
    setMessage("Invalid password", "warning");
    return;
  }

  // Try to log-in
  login(username, password);
});

document.querySelector("#cancel-btn").addEventListener("click", function () {
  // Close the current window witouth authentication
  window.API.send("auth-result", "CANCELLED", null, null);
  window.API.send("login-window-closing");
});

/*### Private methods ###*/
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
function manageLoginResult(result, username, password) {
  if (result.success) {
    // Valid auth, save and send credentials to main process
    const credentials = {
      username: username,
      password: password,
    };
    const json = JSON.stringify(credentials);

    window.API.invoke("credentials-path").then(function (path) {
      window.IO.write(path, json).then(function () {
        // Close F95 browser
        window.F95.logout();

        // Close the window
        window.API.send("auth-result", "AUTHENTICATED", username, password);
        window.API.send("login-window-closing");
      });
    });
  } else {
    // Show error message
    setMessage("Error during authentication: " + result.message, "error");

    // Unblock elements and hide the progress bar
    document.getElementById("login-btn").classList.remove("disabled");
    document.getElementById("cancel-btn").classList.remove("disabled");
    document.getElementById("progressbar").style.display = "none";
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
  document.getElementById("login-btn").classList.add("disabled");
  document.getElementById("cancel-btn").classList.add("disabled");
  document.getElementById("progressbar").style.display = "block";

  // Try to log-in
  window.F95.login(username, password).then((result) =>
    manageLoginResult(result, username, password)
  );
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
  else if (type == "warning") color = "#FF9900";
  else color = "#00CC00";

  // Set the message
  const element = document.getElementById("error-message");
  element.innerText = message;
  element.style.color = color;

  // Hide the element if the message is empty
  if (message === "") element.style.display = "none";
}
