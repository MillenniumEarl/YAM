"use strict";

// Core modules
const dns = require("dns");
const { promisify } = require("util");

// Global variables
const HOST = "google.com";
const aresolve = promisify(dns.resolve);

/**
 * @public
 * Check if the PC is connected to Internet.
 */
module.exports.checkConnection = async function() {
    try {
        // Check DNS
        await aresolve(HOST);
        return true;
    }
    catch(err) {
        if (err.code === "ECONNREFUSED") return false;
        else throw err;
    }
};