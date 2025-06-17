import { TFile, TFolder } from "obsidian";
import path from "path";
import { getFile, getFileInteractives, LINK_KEY, PluginInstances, TAG_KEY } from "src/internal";
import STRINGS from "src/Strings";

export type SourceKey = 'all' | 'tag' | 'link' | 'property' | 'file' | 'folder' | 'folderRec' | 'path';
export type LogicKey = 'is' | 'isNot' | 'contains' | 'containsNot' | 'matchesRegex' | 'matchesRegexNot' | 'containsRegex' | 'containsRegexNot' | 'isEmpty' | 'isEmptyNot';

export const sourceKeyLabels: Record<SourceKey, string> = {
    'all': STRINGS.query.source.all,
    'tag': STRINGS.query.source.tag,
    'link': STRINGS.query.source.link,
    'property': STRINGS.query.source.property,
    'file': STRINGS.query.source.file,
    'folder': STRINGS.query.source.folder,
    'folderRec': STRINGS.query.source.folderRec,
    'path': STRINGS.query.source.path
}

export const logicKeyLabel: Record<LogicKey, string> = {
    'contains': STRINGS.query.logicKey.contains,
    'containsNot': STRINGS.query.logicKey.containsNot,
    'is': STRINGS.query.logicKey.is,
    'isNot': STRINGS.query.logicKey.isNot,
    'containsRegex': STRINGS.query.logicKey.containsRegex,
    'containsRegexNot': STRINGS.query.logicKey.containsRegexNot,
    'matchesRegex': STRINGS.query.logicKey.matchesRegex,
    'matchesRegexNot': STRINGS.query.logicKey.matchesRegexNot,
    'isEmpty': STRINGS.query.logicKey.isEmpty,
    'isEmptyNot': STRINGS.query.logicKey.isEmptyNot,
}

export class RuleQuery {
    source: string;
    property: string;
    value: string;
    logic: string;

    constructor(rec: Record<string, string>) {
        this.source = rec['source'] ?? '';
        this.property = rec['property'] ?? '';
        this.value = rec['value'] ?? '';
        this.logic = rec['logic'] ?? '';
    }

    getRecord(): Record<string, string> {
        return {
            source: this.source,
            property: this.property,
            value: this.value,
            logic: this.logic
        };
    }

    getMatches(): TFile[] {
        return PluginInstances.app.vault.getMarkdownFiles().filter(file => this.doesMatch(file.path, file));
    }

    doesMatch(id: string, file: TFile | null = null): boolean | null {
        if (!this.isValid()) return null;
        switch ((this.source as SourceKey)) {
            case 'all':
                return true;
            case 'tag': {
                file = getFile(id);
                return file ? this.checkLogic([...getFileInteractives(TAG_KEY, file)]) : false;
            }

            case 'link': {
                file = getFile(id);
                return file ? this.checkLogic([...getFileInteractives(LINK_KEY, file)]) : false;
            }

            case 'property': {
                if (!this.property) break;
                file = getFile(id);
                return file ? this.checkLogic([...getFileInteractives(this.property, file)]) : false;
            }

            case 'file':
                return this.checkLogic(path.basename(id));

            case 'folder':
                return this.checkLogic(path.dirname(id));

            case 'folderRec':
                const folders: string[] = [];
                let currentFolder = path.dirname(id);
                while (currentFolder !== "" && currentFolder !== ".") {
                    folders.push(currentFolder);
                    currentFolder = path.dirname(currentFolder);
                }
                return this.checkLogic(folders);

            case 'path':
                return this.checkLogic(id);

            default:
                break;
        }
        return false;
    }

    private checkLogic(values: string[] | string): boolean {
        const isArray = Array.isArray(values);
        const isString = typeof values === 'string';

        let fullWordRegex = this.value;
        if (!fullWordRegex.startsWith("\\b")) fullWordRegex = "\\b" + fullWordRegex;
        if (!fullWordRegex.endsWith("\\b")) fullWordRegex = fullWordRegex + "\\b";

        if (isArray) {
            let valuesToCheck = values;
            switch ((this.logic as LogicKey)) {
                case 'is':
                    return valuesToCheck.length === 1 && values[0] === this.value;
                case 'isNot':
                    return (valuesToCheck.length === 1 && values[0] !== this.value) || valuesToCheck.length !== 1;
                case 'contains':
                    return valuesToCheck.contains(this.value);
                case 'containsNot':
                    return !valuesToCheck.contains(this.value);
                case 'matchesRegex':
                    return valuesToCheck.length === 1 && new RegExp(fullWordRegex).test(valuesToCheck[0]);
                case 'matchesRegexNot':
                    return (valuesToCheck.length === 1 && !(new RegExp(fullWordRegex).test(valuesToCheck[0]))) || valuesToCheck.length !== 1;
                case 'containsRegex':
                    return valuesToCheck.some(v => new RegExp(this.value).test(v));
                case 'containsRegexNot':
                    return valuesToCheck.every(v => !(new RegExp(this.value).test(v)));
                case 'isEmpty':
                    return valuesToCheck.length === 0;
                case 'isEmptyNot':
                    return valuesToCheck.length > 0;
                default:
                    break;
            }
        }
        else if (isString) {
            let valueToCheck = (values as string);
            switch ((this.logic as LogicKey)) {
                case 'is':
                    return valueToCheck === this.value;
                case 'isNot':
                    return valueToCheck !== this.value;
                case 'contains':
                    return valueToCheck.contains(this.value);
                case 'containsNot':
                    return !valueToCheck.contains(this.value);
                case 'matchesRegex':
                    return new RegExp(fullWordRegex).test(valueToCheck);
                case 'matchesRegexNot':
                    return !(new RegExp(fullWordRegex).test(valueToCheck));
                case 'containsRegex':
                    return new RegExp(this.value).test(valueToCheck);
                case 'containsRegexNot':
                    return !(new RegExp(this.value).test(valueToCheck));
                case 'isEmpty':
                    return valueToCheck === "";
                case 'isEmptyNot':
                    return valueToCheck !== "";
                default:
                    break;
            }
        }

        return false;
    }

    isValid(): boolean {
        if (this.source === "") return false;
        if (this.source === "all") return true;
        if (this.source === "property" && this.property === "") return false;
        if (this.logic === "") return false;
        if (this.value === "" && this.logic !== 'isEmpty' && this.logic !== 'isEmptyNot') return false;
        return true;
    }

    toString(): string | null {
        if (!this.isValid()) return null;
        let str = sourceKeyLabels[this.source as SourceKey];
        if (this.source === 'all') return str;
        if (this.source === "property") str += ":" + this.property;
        str += " " + logicKeyLabel[this.logic as LogicKey];
        str += " " + this.value;
        return str;
    }
}