export const NONE_COLOR: number = 8224125;
export const DEFAULT_STATE_ID: string = "default-vault";

export const TAG_KEY: string = "tag";
export const LINK_KEY: string = "link";
export const FOLDER_KEY: string = "folder";
export const INVALID_KEYS: { [interactive: string]: string[] } = {};
INVALID_KEYS[TAG_KEY] = [];
INVALID_KEYS[LINK_KEY] = ["tags", "file"];
INVALID_KEYS[FOLDER_KEY] = [];


import * as en from '../i18n/en.json';
import * as fr from '../i18n/fr.json';
import * as zh from '../i18n/zh.json';
i18next.addResourceBundle('en', 'extended-graph', en);
i18next.addResourceBundle('fr', 'extended-graph', fr);
i18next.addResourceBundle('zh', 'extended-graph', zh);
export const t = i18next.getFixedT(null, "extended-graph");
export const tObsidian = i18next.getFixedT(null, "default");

// To see the Obsidian translations, in "onload" of the plugin, call:
// console.log(i18next.getDataByLanguage("en")["default"])