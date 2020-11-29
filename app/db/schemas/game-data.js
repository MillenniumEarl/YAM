const gameDataSchema = {
    type: "object",
    properties: {
        id: {
            type: "integer",
        },
        name: {
            type: "string",
        },
        author: {
            type: "string",
        },
        url: {
            type: "string",
        },
        overview: {
            type: ["string", "null"],
            default: null
        },
        language: {
            type: ["string", "null"],
            default: null
        },
        supportedOS: {
            type: "array",
            default: []
        },
        censored: {
            type: "boolean",
            default: false,
        },
        tags: {
            type: "array",
            default: []
        },
        engine: {
            type: ["string", "null"],
            default: null
        },
        status: {
            type: ["string", "null"],
            default: null
        },
        previewSrc: {
            type: ["string", "null"],
            default: null
        },
        version: {
            type: "string",
        },
        lastUpdate: {
            type: ["object", "null"],
            default: null
        },
        isMod: {
            type: "boolean",
            default: false
        },
        changelog: {
            type: ["string", "null"],
            default: null
        },
        gameDirectory: {
            type: ["string", "null"],
            default: null
        },
        lastPlayed: {
            type: ["object", "null"],
            default: null
        },
        localPreviewPath: {
            type: ["string", "null"],
            default: null
        }
    },
};

module.exports = gameDataSchema;
