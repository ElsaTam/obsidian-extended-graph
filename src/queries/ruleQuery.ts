import { TFile, TFolder } from "obsidian";
import { ExtendedGraphSettings, getFileInteractives, LINK_KEY, ExtendedGraphInstances, t, TAG_KEY } from "../internal";

export type SourceKey = 'all' | 'tag' | 'link' | 'property' | 'file' | 'folder' | 'folderRec' | 'path';
export type LogicKey = 'is' | 'isNot' | 'contains' | 'containsNot' | 'matchesRegex' | 'matchesRegexNot' | 'containsRegex' | 'containsRegexNot' | 'isEmpty' | 'isEmptyNot';

export const sourceKeyLabels: Record<SourceKey, string> = {
    'all': t("query.source.all"),
    'tag': t("query.source.tag"),
    'link': t("query.source.link"),
    'property': t("query.source.property"),
    'file': t("query.source.file"),
    'folder': t("query.source.folder"),
    'folderRec': t("query.source.folderRec"),
    'path': t("query.source.path")
}

export const logicKeyLabel: Record<LogicKey, string> = {
    'contains': t("query.logicKey.contains"),
    'containsNot': t("query.logicKey.containsNot"),
    'is': t("query.logicKey.is"),
    'isNot': t("query.logicKey.isNot"),
    'containsRegex': t("query.logicKey.containsRegex"),
    'containsRegexNot': t("query.logicKey.containsRegexNot"),
    'matchesRegex': t("query.logicKey.matchesRegex"),
    'matchesRegexNot': t("query.logicKey.matchesRegexNot"),
    'isEmpty': t("query.logicKey.isEmpty"),
    'isEmptyNot': t("query.logicKey.isEmptyNot"),
}

export interface IRuleQuery {
    source: SourceKey | '';
    property: string;
    value: string;
    logic: LogicKey | '';
}

export class RuleQuery implements IRuleQuery {
    source: SourceKey | '';
    property: string;
    value: string;
    logic: LogicKey | '';

    constructor(rec: Partial<IRuleQuery>) {
        this.source = rec['source'] ?? '';
        this.property = rec['property'] ?? '';
        this.value = rec['value'] ?? '';
        this.logic = rec.logic ?? '';
    }

    getRecord(): IRuleQuery {
        return {
            source: this.source,
            property: this.property,
            value: this.value,
            logic: this.logic
        };
    }

    getMatches(): TFile[] {
        return ExtendedGraphInstances.app.vault.getMarkdownFiles().filter(file => this.doesMatch(file));
    }

    doesMatch(file: TFile, settings?: ExtendedGraphSettings): boolean | null {
        if (!this.isValid()) return null;
        const folder = file.path;
        switch ((this.source as SourceKey)) {
            case 'all':
                return true;
            case 'tag':
                const tags = getFileInteractives(TAG_KEY, file);
                return this.checkLogic([...(tags ?? [])]);

            case 'link':
                const links = getFileInteractives(LINK_KEY, file, settings);
                return this.checkLogic([...(links ?? [])]);

            case 'property':
                if (!this.property) break;
                const properties = getFileInteractives(this.property, file, settings);
                return this.checkLogic([...(properties ?? [])]);

            case 'file':
                return this.checkLogic(file.basename);

            case 'folder':
                return this.checkLogic(folder);

            case 'folderRec':
                const folders: string[] = [];
                let currentFolder: TFolder | null = file.parent;
                while (currentFolder) {
                    folders.push(currentFolder.path);
                    currentFolder = currentFolder.parent;
                }
                return this.checkLogic(folders);

            case 'path':
                return this.checkLogic(file.path);

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