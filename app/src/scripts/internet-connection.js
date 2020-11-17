"use strict";

// Core modules
const dns = require("dns");
const { promisify } = require("util");

// Global variables
const HOSTNAME = "www.google.com";
const alookup = promisify(dns.lookup);

module.exports.check = async function() {
    try {
        await alookup(HOSTNAME);
        return true;
    }
    catch(err) {
        if(err.code === "ENOTFOUND") return false;
        else throw err;
    }
};