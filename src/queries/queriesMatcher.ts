import { TFile } from "obsidian";
import { PluginInstances, RuleQuery, t } from "src/internal";

export type CombinationLogic = 'AND' | 'OR';
export type QueryData = {
    combinationLogic: CombinationLogic,
    index?: number,
    rules: Record<string, string>[]
}

export class QueryMatcher {
    readonly queryData: QueryData;

    constructor(queryData: QueryData) {
        this.queryData = queryData;
    }

    getMatches(): TFile[] {
        return PluginInstances.app.vault.getMarkdownFiles().filter(file => this.doesMatch(file));
    }

    doesMatch(file: TFile): boolean {
        const validRules = this.queryData.rules.filter(rule => new RuleQuery(rule).isValid());
        if (validRules.length === 0) return false;
        switch (this.queryData.combinationLogic) {
            case 'AND':
                return validRules.every(rule => new RuleQuery(rule).doesMatch(file) ?? false);
            case 'OR':
                return validRules.some(rule => new RuleQuery(rule).doesMatch(file) ?? false);
            default:
                break;
        }
        return false;
    }

    toString(): string {
        let queryDataStr = "";
        for (let i = 0; i < this.queryData.rules.length; ++i) {
            let ruleStr = new RuleQuery(this.queryData.rules[i]).toString();
            if (!ruleStr) continue;
            queryDataStr += ruleStr;
            if (i !== this.queryData.rules.length - 1) {
                queryDataStr += " " + t(`query.${this.queryData.combinationLogic}`) + " ";
            };
        }
        return queryDataStr;
    }
}