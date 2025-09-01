import { Setting, ToggleComponent } from "obsidian";
import * as Color from '../../colors/color-bits';
import { CSSBridge, FOLDER_KEY, GCSection, GraphInstances, InteractiveManager, InteractiveUI, t } from "../../internal";

export class GCFolders extends GCSection implements InteractiveUI {
    foldersManager: InteractiveManager;

    settingsMap = new Map<string, { setting: Setting, toggle: ToggleComponent }>();

    constructor(instances: GraphInstances, foldersManager: InteractiveManager) {
        super(instances.view, "folders", t("features.folders"));

        this.foldersManager = foldersManager;
        this.instances = instances;

        this.treeItemChildren = this.root.createDiv("tree-item-children");

        this.collapseGraphControlSection();
    }

    destroy() {
        this.root.remove();
    }

    override display() {
        this.treeItemChildren.replaceChildren();
        this.addToggleAllButton();
        this.addToggleAllWithAtLeastOneNodeButton();
        this.createFolders();
    }

    private addToggleAllButton(): void {
        new Setting(this.treeItemChildren)
            .setName(t("controls.toggleAll"))
            .addExtraButton(cb => {
                cb.setIcon("x")
                    .setTooltip(t("controls.disableAll") + ": " + t("plugin.folder"))
                    .onClick(() => {
                        this.instances?.foldersSet?.disableAll();
                    });
            })
            .addExtraButton(cb => {
                cb.setIcon("check-check")
                    .setTooltip(t("controls.enableAll") + ": " + t("plugin.folder"))
                    .onClick(() => {
                        this.instances?.foldersSet?.enableAll();
                    });
            });
    }

    private addToggleAllWithAtLeastOneNodeButton(): void {
        new Setting(this.treeItemChildren)
            .setName(t("controls.toggleAll"))
            .setDesc(t("controls.toggleAllWithMoreThanOneNode"))
            .addExtraButton(cb => {
                cb.setIcon("x")
                    .setTooltip(t("controls.disableAll") + ": " + t("plugin.folder"))
                    .onClick(() => {
                        this.instances?.foldersSet?.disableAllWithAtLeastOneNode();
                    });
            })
            .addExtraButton(cb => {
                cb.setIcon("check-check")
                    .setTooltip(t("controls.enableAll") + ": " + t("plugin.folder"))
                    .onClick(() => {
                        this.instances?.foldersSet?.enableAllWithAtLeastOneNode();
                    });
            });

    }

    private createFolders(): void {
        const paths = this.foldersManager?.getTypesWithoutNone();
        if (!paths) return;
        for (const path of paths) {
            this.add(FOLDER_KEY, path, this.foldersManager.getColor(path));
        }
    }

    // ================================ SET UP =================================

    update(key: string, path: string, color: Color.Color): void {
        this.settingsMap.get(path)?.setting.settingEl.style.setProperty("--folder-color-rgb", CSSBridge.getCSSSplitRGB(color));
    }

    add(key: string, path: string, color: Color.Color): void {
        const setting = new Setting(this.treeItemChildren);
        setting.setName(path)
            .addToggle(cb => {
                cb.setValue(this.foldersManager.isActive(path))
                cb.onChange(enable => {
                    if (enable !== this.foldersManager.isActive(path)) {
                        this.toggle(key, path);
                    }
                });
                this.settingsMap.set(path, { setting: setting, toggle: cb });
            });
        this.update(key, path, color);
    }

    remove(key: string, paths: Set<string> | string[]): void {
        for (const path of paths) {
            const setting = this.settingsMap.get(path);
            if (!path) continue;
            setting?.setting.settingEl.remove();
            this.settingsMap.delete(path);
        }
    }

    // ============================= INTERACTIONS ==============================

    toggle(key: string, path: string): void {
        if (this.foldersManager.isActive(path)) {
            this.foldersManager.disable([path]);
        }
        else {
            this.foldersManager.enable([path]);
        }
    }

    // ============================== UI CONTROL ===============================

    enableUI(key: string, path: string): void {
        this.settingsMap.get(path)?.toggle.setValue(true);
    }

    disableUI(key: string, path: string): void {
        this.settingsMap.get(path)?.toggle.setValue(false);
    }

    enableAllUI(key: string): void {
        for (const [path, setting] of this.settingsMap) {
            setting.toggle.setValue(true);
        }
    }

    disableAllUI(key: string): void {
        for (const [path, setting] of this.settingsMap) {
            setting.toggle.setValue(false);
        }
    }
}