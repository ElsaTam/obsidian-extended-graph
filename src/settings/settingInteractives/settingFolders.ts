import { Setting, TFile } from "obsidian";
import { ExtendedGraphSettingTab, FOLDER_KEY, ExtendedGraphInstances, SettingInteractives, t } from "../../internal";

export class SettingFolders extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'folders', FOLDER_KEY, t("features.ids.folders"), t("features.folders"), 'folder', t("features.foldersDesc"), true);
    }

    protected override addBody(): void {
        super.addBody();

        this.addShowFullPath();
    }

    private addShowFullPath() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.folderShowFullPath"))
            .setDesc(t("features.folderShowFullPathDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.folderShowFullPath)
                    .onChange(async (value) => {
                        ExtendedGraphInstances.settings.folderShowFullPath = value;
                        await ExtendedGraphInstances.plugin.saveSettings();
                    });
            }).settingEl);
    }

    protected override isValueValid(name: string): boolean {
        return !!this.settingTab.app.vault.getFolderByPath(name);
    }

    protected override getPlaceholder(): string {
        return "folder/path";
    }

    protected override getAllTypes(): string[] {
        let allTypes = new Set<string>()

        const folders = this.settingTab.app.vault.getAllFolders(true);
        for (const folder of folders) {
            const n = folder.children.filter(f => f instanceof TFile).length;
            if (n > 0) {
                allTypes.add(folder.path)
            }
        }

        return [...allTypes].sort();
    }
}