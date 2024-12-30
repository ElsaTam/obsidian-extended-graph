export const NONE_COLOR: Uint8Array = new Uint8Array([125, 125, 125]);
export const DEFAULT_VIEW_ID: string = "default-vault";
export let INVALID_KEYS: {[interactive: string]: string[]} = {
    TAG_ID : [],
    LINK_ID: ["tags", "file"]
}

export const TAG_KEY: string = "tag";
export const LINK_KEY: string = "link";

export const DisconnectionCause = Object.freeze({
    USER: "user",
    NODE_CASCADE: "node_cascade"
});