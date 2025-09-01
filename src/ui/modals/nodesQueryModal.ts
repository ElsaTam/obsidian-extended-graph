import { ButtonComponent, DropdownComponent, getLanguage, Modal, SearchComponent, Setting } from "obsidian";
import {
    CombinationLogic,
    ExtendedGraphSettings,
    getAllVaultProperties,
    InteractivesSuggester,
    LogicKey,
    logicKeyLabel,
    ExtendedGraphInstances,
    QueryData,
    QueryMatcher,
    QueryMatchesModal,
    RuleQuery,
    SourceKey,
    sourceKeyLabels,
    strCompare,
    t,
    UIElements
} from "../../internal";

export class NodesQueryModal extends Modal {
    callback: (queryData: QueryData) => void;

    queryData: QueryData;

    ruleHeader: Setting;
    viewMatchesButton: ButtonComponent;
    applyButton: ButtonComponent;
    rulesSettings: RuleSetting[] = [];
    combinationLogicButtons: Record<CombinationLogic, ButtonComponent | null> = {
        'AND': null,
        'OR': null
    };
    settings?: ExtendedGraphSettings;

    constructor(title: string, queryData: QueryData, callback: (queryData: QueryData) => void, settings?: ExtendedGraphSettings) {
        super(ExtendedGraphInstances.app);
        this.setTitle(title);
        this.modalEl.addClass("graph-modal-nodes-query");
        this.callback = callback;
        this.queryData = queryData;
        this.settings = settings;
    }

    onOpen() {
        this.addCombinationLogic();
        this.addRulesHeader();
        this.addButtons();

        for (const queryRecord of this.queryData.rules) {
            this.addRule(queryRecord);
        }
        this.onChange();
    }

    private addCombinationLogic() {
        new Setting(this.contentEl)
            .setName(t("query.combinationLogic"))
            .addButton(cb => {
                this.combinationLogicButtons['AND'] = cb;
                cb.setButtonText(t("query.AND"));
                cb.onClick(ev => {
                    this.queryData.combinationLogic = 'AND';
                    this.combinationLogicButtons['AND']?.setCta();
                    this.combinationLogicButtons['OR']?.removeCta();
                })
            })
            .addButton(cb => {
                this.combinationLogicButtons['OR'] = cb;
                cb.setButtonText(t("query.OR"));
                cb.onClick(ev => {
                    this.queryData.combinationLogic = 'OR';
                    this.combinationLogicButtons['AND']?.removeCta();
                    this.combinationLogicButtons['OR']?.setCta();
                })
            })
            .then(cb => {
                this.combinationLogicButtons[this.queryData.combinationLogic]?.setCta();
            });
    }

    private addRulesHeader() {
        this.ruleHeader = new Setting(this.contentEl)
            .setName(t("query.rules"))
            .setHeading()
            .addButton(cb => {
                UIElements.setupButton(cb, 'add');
                cb.onClick((e) => {
                    this.addRule();
                });
            });
    }

    protected addRule(queryRecord?: Record<string, string>) {
        const ruleSetting = new RuleSetting(
            this.contentEl,
            this.settings ?? ExtendedGraphInstances.settings,
            this.removeRule.bind(this),
            this.onChange.bind(this),
            queryRecord
        );
        (this.rulesSettings.last()?.settingEl ?? this.ruleHeader.settingEl).insertAdjacentElement('afterend', ruleSetting.settingEl);
        this.rulesSettings.push(ruleSetting);
    }

    private removeRule(ruleSetting: RuleSetting) {
        this.rulesSettings.remove(ruleSetting);
        ruleSetting.settingEl.remove();
    }

    private addButtons() {
        const container = this.modalEl.createDiv({ cls: 'buttons-container' });

        new ButtonComponent(container)
            .setButtonText(t("controls.cancel"))
            .onClick(() => this.close());

        this.viewMatchesButton = new ButtonComponent(container)
            .setButtonText(t("query.viewMatches"))
            .onClick(() => this.viewMatches());

        this.applyButton = new ButtonComponent(container)
            .setButtonText(t("controls.save"))
            .setIcon('save')
            .onClick(() => this.save())
            .setCta();
    }

    onChange(ruleQuery?: RuleQuery) {
        const matcher = this.getMatcher();
        const files = matcher.getMatches(this.settings);
        this.viewMatchesButton.setButtonText(`${t("query.viewMatches")} (${files.length})`);
        this.viewMatchesButton.setDisabled(files.length === 0);
    }

    private viewMatches() {
        const modal = new QueryMatchesModal(this.queryData);
        modal.open();
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private save(): void {
        this.setQueryData();
        this.callback(this.queryData);
        this.close();
    }

    private setQueryData() {
        const queries: RuleQuery[] = [];
        for (const rule of this.rulesSettings) {
            queries.push(rule.getRuleQuery());
        }
        this.queryData.rules = queries.map(query => query.getRecord());
    }

    private getMatcher(): QueryMatcher {
        this.setQueryData();
        return new QueryMatcher(this.queryData);
    }
}


class RuleSetting extends Setting {
    settings: ExtendedGraphSettings;
    onRemoveCallback: (s: RuleSetting) => void;
    onChangeCallback: (r: RuleQuery) => void

    sourceDropdown: DropdownComponent;
    propertyDropdown: DropdownComponent | null;
    logicDropdown: DropdownComponent | null;
    valueText: SearchComponent | null;
    suggester: InteractivesSuggester | null;

    constructor(containerEl: HTMLElement, settings: ExtendedGraphSettings, onRemove: (s: RuleSetting) => void, onChange: (r: RuleQuery) => void, queryRecord?: Record<string, string>) {
        super(containerEl);

        this.settings = settings;
        this.onRemoveCallback = onRemove;

        this.setClass('rule-setting');
        this.addRemoveButton();

        this.addSourceDropdown();
        if (queryRecord && queryRecord['source']) {
            this.sourceDropdown.setValue(queryRecord['source']);
        }

        if (this.sourceDropdown.getValue() !== 'all') {
            this.addLogicDropdown();
            if (queryRecord && queryRecord['logic']) this.logicDropdown?.setValue(queryRecord['logic']);

            if (this.sourceDropdown.getValue() === 'property') {
                this.addPropertyDropdown();
                if (queryRecord && queryRecord['property']) this.propertyDropdown?.setValue(queryRecord['property']);
            }

            this.addValueText();
            if (queryRecord && queryRecord['value']) this.valueText?.setValue(queryRecord['value']);
        }

        this.onChangeCallback = onChange;
        this.onChange();
    }

    private addRemoveButton(): RuleSetting {
        return this.addExtraButton(cb => {
            UIElements.setupExtraButton(cb, 'delete');
            cb.onClick(() => {
                this.onRemoveCallback(this);
            });
        });
    }

    private addSourceDropdown(): RuleSetting {
        return this.addDropdown(cb => {
            this.sourceDropdown = cb;
            cb.addOptions(sourceKeyLabels);
            cb.setValue('tag');
            cb.onChange((value: SourceKey) => {
                if (value === 'all') {
                    this.logicDropdown?.selectEl.parentNode?.removeChild(this.logicDropdown.selectEl);
                    this.logicDropdown = null;
                    this.propertyDropdown?.selectEl.parentNode?.removeChild(this.propertyDropdown.selectEl);
                    this.propertyDropdown = null;
                    this.valueText?.containerEl.parentNode?.removeChild(this.valueText.containerEl);
                    this.valueText = null;
                }
                else {
                    if (!this.propertyDropdown && value === 'property') this.addPropertyDropdown();
                    else if (value !== 'property') {
                        this.propertyDropdown?.selectEl.parentNode?.removeChild(this.propertyDropdown.selectEl);
                        this.propertyDropdown = null;
                    }
                    if (!this.logicDropdown) this.addLogicDropdown();
                    if (!this.valueText) this.addValueText();
                }
                this.onChange();
            });
        });
    }

    private addPropertyDropdown(): RuleSetting {
        return this.addDropdown(cb => {
            this.propertyDropdown = cb;
            this.controlEl.insertAfter(cb.selectEl, this.sourceDropdown.selectEl);
            const properties = getAllVaultProperties(this.settings);
            cb.addOptions(
                properties.sort((a, b) => strCompare(a, b))
                    .reduce((acc: Record<string, string>, key: string) => (acc[key] = key, acc), {})
            );
            cb.onChange(value => {
                this.onChange();
            });
        });
    }

    private addLogicDropdown(): RuleSetting {
        return this.addDropdown(cb => {
            this.logicDropdown = cb;
            cb.addOptions(logicKeyLabel);
            cb.onChange((value: LogicKey) => {
                if (value !== 'isEmpty' && value !== 'isEmptyNot') {
                    if (!this.valueText) this.addValueText();
                }
                else if (this.valueText) {
                    this.valueText.containerEl.parentNode?.removeChild(this.valueText.containerEl);
                    this.valueText = null;
                }
                this.onChange();
            });
        })
    }

    private addValueText(): RuleSetting {
        return this.addSearch(cb => {
            this.valueText = cb;
            cb.setPlaceholder(t("plugin.valuePlaceholder"));
            cb.inputEl.setAttr('required', true);
            this.suggester = new InteractivesSuggester(this.valueText.inputEl, this.settings,
                (value: string) => {
                    this.onChange();
                });
            cb.onChange(value => {
                this.onChange();
            })
        });
    }

    onChange(): void {
        const logic = this.logicDropdown?.getValue() as LogicKey | undefined;
        switch (logic) {
            case 'containsRegex':
            case 'containsRegexNot':
            case 'matchesRegex':
            case 'matchesRegexNot':
                this.suggester?.setKey();
                break;
            default:
                this.suggester?.setKey(this.sourceDropdown.getValue() as SourceKey, this.propertyDropdown?.getValue());
                break;
        }

        const ruleQuery = this.getRuleQuery();
        this.setValidity(ruleQuery);
        this.onChangeCallback(ruleQuery);
    }

    private setValidity(ruleQuery: RuleQuery): void {
        if (!ruleQuery.isValid()) {
            this.settingEl.addClass("query-invalid");
        }
        else {
            this.settingEl.removeClass("query-invalid");
        }
    }

    getRuleQuery(): RuleQuery {
        return new RuleQuery({
            source: this.sourceDropdown.getValue(),
            property: this.propertyDropdown?.getValue() ?? '',
            value: this.valueText?.getValue() ?? '',
            logic: this.logicDropdown?.getValue() ?? '',
        });
    }
}

