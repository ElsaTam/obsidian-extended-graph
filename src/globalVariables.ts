export const NONE_COLOR: Uint8Array = new Uint8Array([125, 125, 125]);
export const DEFAULT_VIEW_ID: string = "default-vault";
export let INVALID_KEYS: {[interactive: string]: string[]} = {
    "tag": [],
    "link": ["tags", "file"]
}