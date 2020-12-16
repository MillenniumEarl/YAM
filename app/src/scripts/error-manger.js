"use strict";

// Public modules from npm
const logger = require("electron-log");
const newGithubIssueUrl = require("new-github-issue-url");

//#region Public methods
/**
 * @public
 * Write the error in the log file and show message to user.
 * @param {String} scriptname Name of the script that has thrown the error
 * @param {Object} data Information about the error
 * @param {String} data.message Message of the error
 * @param {Number} data.line Line where the error occurred
 * @param {Number} data.column Column where the error occurred
 * @param {Error} data.error Error throwed
 * @param {Electron.IpcRenderer} ipc Object used for communication
 */
module.exports.manageError = async function (scriptname, data, ipc) {
    logger.error(`${data.message} at line ${data.line}:${data.column} in ${scriptname}.\n${data.error.stack}`);

    const result = await ipc.invoke("require-messagebox", {
        type: "error",
        title: "Unhandled error",
        message: `${data.message} at line ${data.line}:${data.column} in ${scriptname}.\n
        It is advisable to terminate the application to avoid unpredictable behavior.\n
        ${data.error.stack}\n
        Please report this error on https://github.com/MillenniumEarl/YAM`,
        buttons: [{
            name: "report-issue"
        }, {
            name: "quit"
        }, {
            name: "close"
        }]
    });

    if (result.button === "report-issue") {
        // Obtains the info to attach
        const description = `${data.message} at line ${data.line}:${data.column} in ${scriptname}.\n${data.error.stack}`;
        const appversion = await ipc.invoke("app-version");

        // Open a new GitHub issue
        const url = _createGithubIssueURL("Unmanaged error", description, appversion);
        ipc.send("open-link", [url]);

    } else if (result.button === "quit") {
        // Quit the application
        ipc.send("app-quit");
    }
};

/**
 * @public
 * Write the error in the log file and show message to user.
 * @param {String} scriptname Name of the script that has thrown the error
 * @param {String} reason Reason of the rejection
 * @param {Electron.IpcRenderer} ipc Object used for communication
 */
module.exports.manageUnhandledError = async function (scriptname, reason, ipc) {
    logger.error(`Unhandled promise rejection in ${scriptname}: ${reason}`);

    const result = await ipc.invoke("require-messagebox", {
        type: "error",
        title: "Unhandled promise rejection",
        message: `Unhandled promise rejection in ${scriptname}: ${reason}.\n
        It is advisable to terminate the application to avoid unpredictable behavior.\n
        Please report this error on https://github.com/MillenniumEarl/YAM`,
        buttons: [{
            name: "report-issue"
        }, {
            name: "quit"
        }, {
            name: "close"
        }]
    });

    if (result.button === "report-issue") {
        // // Obtains the info to attach
        const description = `Unhandled promise rejection in ${scriptname}: ${reason}`;
        const appversion = await ipc.invoke("app-version");

        // Open a new GitHub issue
        const url = _createGithubIssueURL("Unhandled promise error", description, appversion);
        ipc.send("open-link", [url]);
    } else if (result.button === "quit") {
        // Quit the application
        ipc.send("app-quit");
    }
};

/**
 * @public
 * Log an error
 * @param {Error} error Throwed error
 * @param {String} code Unique error code
 * @param {String} name Name of the function that throw the error
 * @param {String} parentName Name of the function containing the error throwing function
 * @param {String} message Custom message to add
 */
module.exports.reportError = function (error, code, name, parentName, message) {
    // Prepare the error message
    let log = `Error ${code}: ${parentName} -> ${name}`;
    if (message) log = `${log} (${message})`;
    log = `${log}: ${error}`;

    // Write the error
    logger.error(log);
};
//#endregion Public methods

//#region Private methods
/**
 * @private
 * Create the URL of a new GitHub issue.
 * @param {String} title Title of the issue
 * @param {String} description Description of the issue
 * @param {String} appversion Current version of the app
 */
function _createGithubIssueURL(title, description, appversion) {
    // Create the issue body
    const body = _createGitHubIssueBody(description, appversion);

    return newGithubIssueUrl({
        repoUrl: "https://github.com/MillenniumEarl/YAM",
        template: "bug_report.md",
        title: title,
        body: body
    });
}

/**
 * @private
 * Create the body of a GitHub issue with the given information.
 * @param {String} description Description of the issue
 * @param {String} appversion Current version of the app
 */
function _createGitHubIssueBody(description, appversion) {
    return `
**Describe the bug**
:information_source: *This report was generated automatically*
${description}

**To Reproduce**
Steps to reproduce the behavior:

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Desktop:**
- OS: ${process.platform}
- Version: ${process.getSystemVersion()}
- App version: ${appversion}

**Additional context**
Add any other context about the problem here.
:information_source: *This report was generated automatically*`;
}
//#endregion