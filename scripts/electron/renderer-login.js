/*### Generic events ###*/
document.addEventListener("DOMContentLoaded", function () {
    // This function runs when the DOM is ready, i.e. when the document has been parsed

    // Load credentials if saved on disk
    if (window.fexists(window.AppCostants.CREDENTIALS_PATH)) {
        let json = window.fread(window.AppCostants.CREDENTIALS_PATH);
        let credentials = JSON.parse(json);

        document.getElementById('username').value = credentials['username'];
        document.getElementById('password').value = credentials['password'];

        // Block elements and show a progress bar
        document.getElementById('btnLogin').classList.add('disabled');
        document.getElementById('btnCancel').classList.add('disabled');
        document.getElementById('progressbar').style.display = 'block';

        // Try to log-in
        window
            .f95login(credentials['username'], credentials['password'])
            .then((result) => manageLoginResult(result));
    }
});

/*### Click events ###*/
document.querySelector('#btnLogin').addEventListener('click', () => {
    let username = document.getElementById('username').value;
    let password = document.getElementById('password').value;

    // Block elements and show a progress bar
    document.getElementById('btnLogin').classList.add('disabled');
    document.getElementById('btnCancel').classList.add('disabled');
    document.getElementById('progressbar').style.display = 'block';

    // Try to log-in
    window
        .f95login(username, password)
        .then((result) => manageLoginResult(result));
});

document.querySelector('#btnCancel').addEventListener('click', () => {
    // Close the current window witouth authentication
    window.getCurrentWindow().close();
});

/*### Private methods ###*/
function manageLoginResult(result) {
    if (result.success) {
        let username = document.getElementById('username').value;
        let password = document.getElementById('password').value;

        // Valid auth, save and send credentials to main process
        let credentials = {
            'username': username,
            'password': password
        };
        let json = JSON.stringify(credentials);
        window.fwrite(window.AppCostants.CREDENTIALS_PATH, json);

        window.ipc.send('auth-successful', json);

        // Close the window
        window.getCurrentWindow().close();
    } else {
        // Show error message
        document.getElementById('errorMessage').innerText = 'Error during authentication: ' + result.message;
        document.getElementById('errorMessage').style.color = '#990000'; // --secondary-app-color in button-style.css

        // Unblock elements and hide the progress bar
        document.getElementById('btnLogin').classList.remove('disabled');
        document.getElementById('btnCancel').classList.remove('disabled');
        document.getElementById('progressbar').style.display = 'none';
    }
}