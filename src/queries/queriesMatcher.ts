import { TFile } from "obsidian";
import { ExtendedGraphSettings, ExtendedGraphInstances, RuleQuery, t, IRuleQuery } from "../internal";

export type CombinationLogic = 'AND' | 'OR';
export type QueryData = {
    combinationLogic: CombinationLogic,
    index?: number,
    rules: IRuleQuery[]
}

export class QueryMatcher {
    readonly queryData: QueryData;

    constructor(queryData: QueryData) {
        this.queryData = queryData;
    }

    getMatches(settings?: ExtendedGraphSettings): TFile[] {
        return ExtendedGraphInstances.app.vault.getMarkdownFiles().filter(file => this.doesMatch(file, settings));
    }

    doesMatch(file: TFile, settings?: ExtendedGraphSettings): boolean {
        const validRules = this.queryData.rules.filter(rule => new RuleQuery(rule).isValid());
        if (validRules.length === 0) return false;
        switch (this.queryData.combinationLogic) {
            case 'AND':
                return validRules.every(rule => new RuleQuery(rule).doesMatch(file, settings) ?? false);
            case 'OR':
                return validRules.some(rule => new RuleQuery(rule).doesMatch(file, settings) ?? false);
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