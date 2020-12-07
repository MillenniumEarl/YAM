"use strict";

// Core modules
const dns = require("dns");
const { promisify } = require("util");

// Global variables
const DNS = "8.8.8.8";
const PORT = 53;
const alookupService = promisify(dns.lookupService);
const atimeout = promisify(setTimeout);

/**
 * @public
 * Check if the PC is connected to Internet.
 */
module.exports.checkConnection = async function(timeout = 30) {
    try {
        // Set the timeout
        atimeout(timeout * 1000).then(() => {
            throw new Error("Timeout exceeded");
        });

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