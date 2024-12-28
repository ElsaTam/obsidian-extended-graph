export const NONE_COLOR: Uint8Array = new Uint8Array([125, 125, 125]);
export const DEFAULT_VIEW_ID: string = "default-vault";
export let INVALID_KEYS: {[interactive: string]: string[]} = {
    "tag": [],
    "link": ["tags", "file"]
}

export const DisconnectionCause = Object.freeze({
    USER: "user",
    NODE_CASCADE: "node_cascade",
    LINK_CASCADE: "link_cascade",
    //ORPHAN: "orphan"
});