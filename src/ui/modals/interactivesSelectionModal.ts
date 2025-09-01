import { Modal, Setting } from "obsidian";
import { ExtendedGraphInstances, t } from "../../internal";

export class InteractivesSelectionModal extends Modal {
    key: string;
    types: string[];
    labels: Record<string, HTMLLabelElement> = {};
    regexSetting: Setting;

    constructor(key: string, types: string[]) {
        super(ExtendedGraphInstances.app);
        this.key = key;
        this.types = types;
        this.setTitle(t("features.interactives.selectionFor") + ": " + this.key);
        this.modalEl.addClass("graph-modal-interactives-selection");
    }

    onOpen() {
        this.addRegexArea();
        this.addLabels();
        this.filterOutLabels();
    }

    private addRegexArea() {
        if (!("excludeRegex" in ExtendedGraphInstances.settings.interactiveSettings[this.key])) {
            ExtendedGraphInstances.settings.interactiveSettings[this.key].excludeRegex = { regex: "", flags: "" };
        }
        this.regexSetting = new Setting(this.contentEl)
            .setName(t("query.excludeRegex"))
            .addTextArea(cb => {
                cb.setValue(ExtendedGraphInstances.settings.interactiveSettings[this.key].excludeRegex.regex);
                cb.onChange((value) => this.changeExcludeRegex(value, ExtendedGraphInstances.settings.interactiveSettings[this.key].excludeRegex.flags));
            })
            .addText(cb => {
                cb.setPlaceholder("flags")
                    .setValue(ExtendedGraphInstances.settings.interactiveSettings[this.key].excludeRegex.flags)
                    .onChange((value) => this.changeExcludeRegex(ExtendedGraphInstances.settings.interactiveSettings[this.key].excludeRegex.regex, value));
            });
        this.updateRegexDesc();
    }

    private addLabels() {
        const div = this.contentEl.createDiv("items-container");
        for (const type of this.types) {
            const isActive = !ExtendedGraphInstances.settings.interactiveSettings[this.key].unselected.includes(type);
            const label = div.createEl("label");
            const text = label.createSpan({ text: type });
            const toggle = label.createEl("input", { type: "checkbox" });
            isActive ? this.selectInteractive(label, toggle) : this.deselectInteractive(label, toggle);
            toggle.addEventListener("change", e => {
                toggle.checked ? this.selectInteractive(label, toggle) : this.deselectInteractive(label, toggle);
            });
            this.labels[type] = label;
        }
    }

    private filterOutLabels() {
        const excludeRegex = ExtendedGraphInstances.settings.interactiveSettings[this.key].excludeRegex;
        let nHidden = 0;
        for (const [type, label] of Object.entries(this.labels)) {
            let isHidden = false;
            for (const reg of excludeRegex.regex.split("\n")) {
                if (reg !== "" && new RegExp(reg, excludeRegex.flags).test(type)) {
                    label.hide();
                    isHidden = true;
                    nHidden++;
                    break;
                }
            }
            if (!isHidden) {
                label.show();
            }
        }
        this.regexSetting.setName(`${t("query.excludeRegex")} (${nHidden} ${nHidden > 1 ? t("query.matches") : t("query.match")})`);
    }

    private changeExcludeRegex(regex: string, flags: string) {
        if (regex === ExtendedGraphInstances.settings.interactiveSettings[this.key].excludeRegex.regex
            && flags === ExtendedGraphInstances.settings.interactiveSettings[this.key].excludeRegex.flags
        ) return;
        ExtendedGraphInstances.settings.interactiveSettings[this.key].excludeRegex = {
            regex, flags
        };
        ExtendedGraphInstances.plugin.saveSettings();
        this.filterOutLabels();
        this.updateRegexDesc();
    }

    private updateRegexDesc() {
        const regex = ExtendedGraphInstances.settings.interactiveSettings[this.key].excludeRegex.regex;
        const flags = ExtendedGraphInstances.settings.interactiveSettings[this.key].excludeRegex.flags;
        this.regexSetting.descEl.innerHTML = t("query.excludeRegexDesc") +
            "<ul>" + regex.split("\n").map(r => `<li>/${r}/${flags}</li>`).join("") + "</ul>";
    }

    private selectInteractive(label: HTMLLabelElement, toggle: HTMLInputElement) {
        label.addClass("is-active");
        toggle.checked = true;
        if (ExtendedGraphInstances.settings.interactiveSettings[this.key].unselected.includes(label.innerText)) {
            ExtendedGraphInstances.settings.interactiveSettings[this.key].unselected.remove(label.innerText);
            ExtendedGraphInstances.plugin.saveSettings();
        }
    }

    private deselectInteractive(label: HTMLLabelElement, toggle: HTMLInputElement) {
        label.removeClass("is-active");
        toggle.checked = false;
        if (!ExtendedGraphInstances.settings.interactiveSettings[this.key].unselected.includes(label.innerText)) {
            ExtendedGraphInstances.settings.interactiveSettings[this.key].unselected.push(label.innerText);
            ExtendedGraphInstances.plugin.saveSettings();
        }
    }

    onClose(): void {
        this.contentEl.empty();
    }
}