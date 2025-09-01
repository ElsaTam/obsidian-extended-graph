import P from "parsimmon";
import emojiRegex from "emoji-regex";
import { ExtendedGraphInstances, t, tObsidian } from "../internal";
import { getLanguage, Notice, Platform } from "obsidian";

export function capitalizeFirstLetter(val: string) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

export function isNumber(value: string): boolean {
    return /^\d+(\.\d+)?$/.test(value);
}

export function isPropertyKeyValid(key: string): boolean {
    if (key.contains(":")) {
        new Notice(t("notices.invalidCharacter") + " ':'");
        return false;
    }
    return (key.length > 0);
}

export function getLinkDestination(link: string): string {
    return link.replace("[[", "").replace("]]", "");
}

export function makeCompatibleForClass(str: string): string {
    return str.replaceAll(" ", "-").replaceAll(/[~!@$%^&*()+=,.\\\/';:"?><[\]{}|`#]/g, "");
}

export function getListOfSubpaths(fullpath: string): string[] {
    return fullpath.split("/").reduce((acc: string[], el: string, i: number) => {
        if (el === "") return acc;
        const last = acc.last();
        if (last && last !== "") acc.push(last + "/" + el);
        else acc.push(el);
        return acc;
    }, []);
}

export function isEmoji(str: string): boolean {
    return emojiRegex().test(str);
    //return /^[\p{Extended_Pictographic}\p{Emoji_Component}]+$/gu.test(str);
}

function regexpToValidateRegexp(): RegExp {
    return /(\/)(.+)\1([a-z]*)/i;
}

export function isRegex(value: string): boolean {
    return regexpToValidateRegexp().test(value);
}

export function regExpFromString(value: string): RegExp | null {
    const match = value.match(regexpToValidateRegexp());
    if (match === null) {
        return null;
    }
    return new RegExp(match[2], match[3]);
}

export function testRegexRegex(): void {
    const obj: Record<string, RegExp | null> = {
        "without flags": null,
        "/something/gi": new RegExp("something", "gi"),
        "/with\/slashes\//gi": new RegExp("with\/slashes\/", "gi"),
        "/with \/some\/(.*)regex/gi": new RegExp("with \/some\/(.*)regex", "gi"),
        "/^dummy.*[a-z]$/gmi": new RegExp("^dummy.*[a-z]$", "gmi"),
        "raw input": null,
        "/singlehash": null,
        "single/hash": null
    };

    const re = /(\/)(.+)\1([a-z]*)/i;

    for (const s in obj) {
        try {
            const c = obj[s];
            const m = s.match(re);
            if (m === null && c === null) {
                console.debug("> Input: " + s);
                console.info("Not a regex");
                continue;
            }
            if (m === null) {
                console.error("null result for " + s);
                continue;
            }
            if (c === null) {
                console.debug("> Input: " + s);
                console.debug("  Pattern: " + m[2]);
                console.debug("  Flags: " + m[3]);
                console.error("But should be null");
                continue;
            }
            console.debug("> Input: " + s);
            console.debug("  Pattern: " + m[2]);
            console.debug("  Flags: " + m[3]);
            console.debug("  Match array: ", m);
            const r = new RegExp(m[2], m[3]);
            if (r.toString() !== c.toString()) {
                console.error("Incorrect parsing for: " + s + ". Expected " + c.toString() + " but got " + r.toString());
            } else {
                console.info("Correct parsing for: " + s);
            }
        } catch (e) {
            console.error("!!!! Failed to parse: " + s + "\n" + e.stack);
        }
    }
}

export function strCompare(a: string, b: string): number {
    return a.localeCompare(b, getLanguage(), { sensitivity: 'base' });
}

function getInvalidCharacters(): string {
    return Platform.isWin ? '*"\\/<>:|?' : "\\/:" + (Platform.isAndroidApp ? '*?<>"' : "");
}

function getInvalidCharactersRegExp() {
    return new RegExp("[" + getInvalidCharacters().replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&") + "]");
}

export function validateFilename(name: string, notice: boolean = true): boolean {
    if (name.trim() === "") {
        if (notice) new Notice(tObsidian("plugins.file-explorer.msg-empty-file-name"));
        return false;
    }

    if (name.startsWith(".")) {
        if (notice) new Notice(tObsidian("plugins.file-explorer.msg-bad-dotfile"));
        return false;
    }

    if (getInvalidCharactersRegExp().test(name)) {
        if (notice) new Notice(tObsidian("plugins.file-explorer.msg-invalid-characters") + getInvalidCharacters().split("").join(" "));
        return false;
    }
    return true;
}

export function cleanFilename(name: string): string {
    name = name.replace(getInvalidCharactersRegExp(), "");
    if (name.startsWith(".")) {
        name = name.slice(1);
    }
    if (name === "") {
        name = "_";
    }
    return name;
}



// Code from the Dataview plugin, under MIT License
// https://github.com/blacksmithgu/obsidian-dataview/blob/master/../util/normalize.ts
const VAR_NAME_CANONICALIZER: P.Parser<string> = P.alt(
    P.regex(new RegExp(emojiRegex(), "")),
    P.regex(/[0-9\p{Letter}_-]+/u).map((str: string) => str.toLocaleLowerCase()),
    P.whitespace.map((_: any) => "-"),
    P.any.map((_: any) => "")
)
    .many()
    .map((result: string[]) => result.join(""));

export function canonicalizeVarName(name: string): string {
    return VAR_NAME_CANONICALIZER.tryParse(name);
}