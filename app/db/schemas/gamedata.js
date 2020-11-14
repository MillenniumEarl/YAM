const gameDataSchema = {
    type: "object",
    properties: {
        id: {
            type: "integer",
            default: -1
        },
        name: {
            type: "string",
        },
        author: {
            type: "string",
            default: null
        },
        url: {
            type: "string",
            default: null
        },
        overview: {
            type: "string",
            default: null
        },
        language: {
            type: "string",
            default: null
        },
        supportedOS: {
            type: "array",
            default: []
        },
        censored: {
            type: "boolean",
            default: false
        },
        engine: {
            type: "string",
            default: null
        },
        status: {
            type: "string",
            default: null
        },
        tags: {
            type: "array",
            default: []
        },
        previewSrc: {
            type: "string",
            default: null
        },
        version: {
            type: "string",
            default: null
        },
        lastUpdate: {
            type: "object",
            default: null
        },
        isMod: {
            type: "boolean",
            default: false
        },
        changelog: {
            type: "string",
            default: null
        },
        gameDirectory: {
            type: "string",
            default: null
        },
        lastPlayed: {
            type: "object",
            default: null
        },
        localPreviewPath: {
            type: "string",
            default: null
        }
    },
};

module.exports = gameDataSchema;
