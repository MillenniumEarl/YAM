/*### Generic events ###*/
document.addEventListener("DOMContentLoaded", function () {
    // This function runs when the DOM is ready, i.e. when the document has been parsed

    // Load credentials if saved on disk
    window.api.fileExists(window.api.shared.credentialsPath)
        .then(function (exists) {
            if (!exists) return;

            // Read and parse credentials
            window.api.read(window.api.shared.credentialsPath)
                .then(function (json) {
                    let credentials = JSON.parse(json);

                    let username = credentials['username'];
                    let password = credentials['password'];

                    // Insert credentials in input and "select" the textboxes
                    let usernameElement = document.getElementById('username');
                    let passwordElement = document.getElementById('password');

                    usernameElement.value = username;
                    usernameElement.click();

                    passwordElement.value = password;
                    passwordElement.click();

                    // Try to log-in
                    login(username, password);
                });
        });
});

/*### Click events ###*/
document.querySelector('#login-btn').addEventListener('click', function () {
    // Get the credentials inserted by the user
    let username = document.getElementById('username').value;
    let password = document.getElementById('password').value;

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

document.querySelector('#cancel-btn').addEventListener('click', function () {
    // Close the current window witouth authentication
    window.api.currentWindow.close();
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
        let credentials = {
            'username': username,
            'password': password
        };
        let json = JSON.stringify(credentials);
        window.api.write(window.api.shared.credentialsPath, json);
        window.api.send('auth-successful', json);

        // Close the window
        window.api.currentWindow.close();
    } else {
        // Show error message
        setMessage('Error during authentication: ' + result.message, "error");

        // Unblock elements and hide the progress bar
        document.getElementById('login-btn').classList.remove('disabled');
        document.getElementById('cancel-btn').classList.remove('disabled');
        document.getElementById('progressbar').style.display = 'none';
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
    document.getElementById('login-btn').classList.add('disabled');
    document.getElementById('cancel-btn').classList.add('disabled');
    document.getElementById('progressbar').style.display = 'block';

    // Try to log-in
    window.F95.login(username, password)
    .then((result) => manageLoginResult(result, username, password));
}

/**
 * Set a message to show to the user.
 * @param {String} message Message to show
 * @param {String} type Type of message, can only be *error/warning/information*
 */
function setMessage(message, type) {
    // Select the message color
    let color = "";
    if (type === "error") color = '#990000'; // --secondary-app-color in button-style.css
    else if (type == "warning") color = "#FF9900";
    else color = "#00CC00"

    // Set the message
    let element = document.getElementById('error-message');
    element.innerText = message;
    element.style.color = color;

    // Hide the element if the message is empty
    if (message === "") element.style.display = "none";
}