export const NONE_COLOR: Uint8Array = new Uint8Array([125, 125, 125]);
export const DEFAULT_VIEW_ID: string = "default-vault";

export const TAG_KEY: string = "tag";
export const LINK_KEY: string = "link";
export const INVALID_KEYS: {[interactive: string]: string[]} = {};
INVALID_KEYS[TAG_KEY] = [];
INVALID_KEYS[LINK_KEY] = ["tags", "file"];

export const DisconnectionCause = Object.freeze({
    USER: "user",
    NODE_CASCADE: "node_cascade",
    ORPHAN: "orphan",
    LINK_CASCADE: "link_cascade",
});