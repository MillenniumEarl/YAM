"use strict";

// Public modules from npm
const { ipcRenderer} = require("electron");
const logger = require("electron-log");
const { openNewGitHubIssue } = require("electron-util");

/**
 * @public
 * Write the error in the log file and show message to user.
 * @param {String} scriptname Name of the script that has thrown the error
 * @param {Object} data Information about the error
 * @param {String} data.message Message of the error
 * @param {Number} data.line Line where the error occurred
 * @param {Number} data.column Column where the error occurred
 * @param {Error} data.error Error throwed
 */
module.exports.manageError = async function (scriptname, data) {
    logger.error(`${data.message} at line ${data.line}:${data.column} in ${scriptname}.\n${data.error.stack}`);

    const result = await ipcRenderer.invoke("require-messagebox", {
        type: "error",
        title: "Unhandled error",
        message: `${data.message} at line ${data.lineno}:${data.colno} in ${scriptname}.\n
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
        const body = `
        **Describe the bug**
        ${data.message} at line ${data.line}:${data.column} in ${scriptname}.\n${data.error.stack}

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
        - App version: ${await ipcRenderer.invoke("app-version")}

        **Additional context**
        Add any other context about the problem here.`;
        // Open a new GitHub issue
        openNewGitHubIssue({
            repoUrl: "https://github.com/MillenniumEarl/YAM",
            template: "bug_report.md",
            title: "Unmanaged error",
            body: body
        });

    } else if (result.button === "quit") {
        // Quit the application
        ipcRenderer.send("app-quit");
    }
};

/**
 * @public
 * Write the error in the log file and show message to user.
 * @param {String} scriptname Name of the script that has thrown the error
 * @param {String} reason Reason of the rejection
 */
module.exports.manageUnhandledError = async function (scriptname, reason) {
    logger.error(`Unhandled promise rejection in ${scriptname}: ${reason}`);

    const result = await ipcRenderer.invoke("require-messagebox", {
        type: "error",
        title: "Unhandled promise rejection",
        message: `${reason}.\n
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
        const body = `
        **Describe the bug**
        Unhandled promise rejection in ${scriptname}: ${reason}

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
        - App version: ${await ipcRenderer.invoke("app-version")}

        **Additional context**
        Add any other context about the problem here.`;
        // Open a new GitHub issue
        openNewGitHubIssue({
            repoUrl: "https://github.com/MillenniumEarl/YAM",
            template: "bug_report.md",
            title: "Unhandled promise error",
            body: body
        });

    } else if (result.button === "quit") {
        // Quit the application
        ipcRenderer.send("app-quit");
    }
};