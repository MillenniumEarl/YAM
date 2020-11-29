const threadDataSchema = {
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
        tags: {
            type: "array",
            default: []
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
        updateAvailable: {
            type: "boolean",
            default: false
        },
        markedAsRead: {
            type: "boolean",
            default: false
        }
    },
};

module.exports = threadDataSchema;
