"use strict";

// Core modules
const dns = require("dns");
const { promisify } = require("util");

// Global variables
const DNS = "8.8.8.8";
const PORT = 53;
const alookupService = promisify(dns.lookupService);

/**
 * @public
 * Check if the PC is connected to Internet.
 */
module.exports.checkConnection = async function() {
    try {
        // Check DNS
        await alookupService(DNS, PORT);
        return true;
    }
    catch(err) {
        if(err.code === "ENOTFOUND") return false;
        else if (err.message === "Timeout exceeded") return false;
        else throw err;
    }
};