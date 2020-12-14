"use strict";

/**
 * @event
 * Handles errors generated by the application.
 * @param {String} message Error message
 * @param {String} source File where the error occurred
 * @param {number} lineno Line containing the instruction that generated the error
 * @param {number} colno Column containing the statement that generated the error
 * @param {Error} error Application generated error
 */
window.onerror = function (message, source, lineno, colno, error) {
    window.EM.onerror("login-renderer.js", {
        message: message,
        line: lineno,
        column: colno,
        error: error,
    });
};

/**
 * @event
 * Handles errors generated within non-catched promises.
 * @param {PromiseRejectionEvent} error 
 */
window.onunhandledrejection = function (error) {
    window.EM.unhandlederror("login-renderer.js", error.reason);
};

//#region Events
document.addEventListener("DOMContentLoaded", async function onDOMContentLoaded() {
    // This function runs when the DOM is ready, i.e. when the document has been parsed
    await translateElementsInDOM();

    const credentialsPath = await window.API.invoke("credentials-path");

    // Load credentials if saved on disk
    const exists = await window.IO.exists(credentialsPath);
    if (!exists) return;

    // Read and parse credentials
    const json = await window.IO.read(credentialsPath);
    const credentials = JSON.parse(json);

    const username = credentials.username;
    const password = credentials.password;

    // "Select" the textboxes to not overlap textual values and placeholder text
    document
        .querySelector("label[for='login-username']")
        .classList.add("active");
    document
        .querySelector("label[for='login-password']")
        .classList.add("active");

    // Insert credentials in textboxes
    document.getElementById("login-username").value = username;
    document.getElementById("login-password").value = password;

    // Try to log-in
    login(username, password);
});

document
    .querySelector("#login-login-btn")
    .addEventListener("click", async function onLoginButtonClick() {
    // Get the credentials inserted by the user
        const username = document.getElementById("login-username").value;
        const password = document.getElementById("login-password").value;

        // Check credentials
        if (isNullOrWhitespace(username)) {
            const message = await window.API.translate("LR invalid username");
            setMessage(message, "warning");
            return;
        }
        if (isNullOrWhitespace(password)) {
            const message = await window.API.translate("LR invalid password");
            setMessage(message, "warning");
            return;
        }

        // Try to log-in
        login(username, password);
    });

document
    .querySelector("#login-cancel-btn")
    .addEventListener("click", function onCancelButtonClick() {
    // Close the current window witouth authentication
        window.API.send("window-close", "CANCELLED");
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
        // Select the element to translate (the last child or the element itself)
        const toTranslate = e.lastChild ?? e;
        toTranslate.textContent = await window.API.translate(e.id);
    }
}

/**
 * @private
 * Check if a string is null, empty or composed only of white spaces.
 * @param {String} input
 * @returns {Boolean}
 */
function isNullOrWhitespace(input) {
    return !input || !input.trim();
}

/**
 * @private
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
        return true;
    } else {
        // Show error message
        const translation = await window.API.translate(
            "LR error during authentication", {
                error: result.message,
            }
        );
        setMessage(translation, "error");
        return false;
    }
}

/**
 * @private
 * Try to log-in to the platform and manage result.
 * Save the credentials and close the window if the authentication is successfull.
 * @param {String} username
 * @param {String} password
 */
async function login(username, password) {
    // Define DOM elements
    const txtUsername = document.getElementById("login-username");
    const txtPassword = document.getElementById("login-password");
    const btnLogin = document.getElementById("login-login-btn");
    const btnCancel = document.getElementById("login-cancel-btn");
    const progressbar = document.getElementById("login-progressbar");

    // Block elements and show a progress bar
    txtUsername.setAttribute("disabled", "");
    txtPassword.setAttribute("disabled", "");
    btnLogin.classList.add("disabled");
    btnCancel.classList.add("disabled");
    progressbar.style.display = "block";

    // Try to log-in
    const result = await window.F95.login(username, password)
        .catch(e => window.API.reportError(e, "11000", "window.F95.login", "login"));
    const validAuth = await manageLoginResult(result, username, password)
        .catch(e => window.API.reportError(e, "11001", "manageLoginResult", "login"));

    // Close the window
    if (validAuth) window.API.send("window-close", "AUTHENTICATED");
    else {
        // Unblock elements and hide the progress bar
        txtUsername.removeAttribute("disabled", "");
        txtPassword.removeAttribute("disabled", "");
        btnLogin.classList.remove("disabled");
        btnCancel.classList.remove("disabled");
        progressbar.style.display = "none";
    }
}

/**
 * @private
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
