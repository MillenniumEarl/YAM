"use strict";

// Public modules from npm
const logger = require("electron-log");
const newGithubIssueUrl = require("new-github-issue-url");

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
        - App version: ${await ipc.invoke("app-version")}

        **Additional context**
        Add any other context about the problem here.`;
        // Open a new GitHub issue
        const url = newGithubIssueUrl({
            repoUrl: "https://github.com/MillenniumEarl/YAM",
            template: "bug_report.md",
            title: "Unmanaged error",
            body: body
        });
        ipc.send("open-link", ...url);

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
        - App version: ${await ipc.invoke("app-version")}

        **Additional context**
        Add any other context about the problem here.`;
        // Open a new GitHub issue
        const url = newGithubIssueUrl({
            repoUrl: "https://github.com/MillenniumEarl/YAM",
            template: "bug_report.md",
            title: "Unhandled promise error",
            body: body
        });
        ipc.send("open-link", ...url);
    } else if (result.button === "quit") {
        // Quit the application
        ipc.send("app-quit");
    }
};