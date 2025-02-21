import { Setting, ToggleComponent } from "obsidian";
import { GraphView, LocalGraphView } from "obsidian-typings";
import { FOLDER_KEY, GCSection, InteractiveManager, InteractiveUI } from "src/internal";
import STRINGS from "src/Strings";

export class GCFolders extends GCSection implements InteractiveUI {
    foldersManager: InteractiveManager;
    settingsMap = new Map<string, {setting: Setting, toggle: ToggleComponent}>();
    
    constructor(view: GraphView | LocalGraphView, foldersManager: InteractiveManager) {
        super(view, "folders", STRINGS.features.folders);

        this.foldersManager = foldersManager;

        this.treeItemChildren = this.root.createDiv("tree-item-children");

        this.collapseGraphControlSection();
    }

    override display() {
        this.treeItemChildren.replaceChildren();
        this.createFolders();
    }

    private createFolders(): void {
        const paths = this.foldersManager?.getTypesWithoutNone();
        if (!paths) return;
        for (const path of paths) {
            this.add(FOLDER_KEY, path, this.foldersManager.getColor(path));
        }
    }

    // =========================================================================

    update(key: string, path: string, color: Uint8Array): void {
        this.settingsMap.get(path)?.setting.settingEl.style.setProperty("--folder-color-rgb", `${color[0]}, ${color[1]}, ${color[2]}`);
    }

    add(key: string, path: string, color: Uint8Array): void {
        const setting = new Setting(this.treeItemChildren);
        setting.setName(path)
            .addToggle(cb => {
                cb.setValue(this.foldersManager.isActive(path))
                cb.onChange(enable => {
                    if (enable !== this.foldersManager.isActive(path)) {
                        this.toggle(key, path);
                    }
                });
                this.settingsMap.set(path, {setting: setting, toggle: cb});
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

    toggle(key: string, path: string): void {
        if (this.foldersManager.isActive(path)) {
            this.foldersManager.disable([path]);
        }
        else {
            this.foldersManager.enable([path]);
        }
    }

    disableUI(key: string, path: string): void {
        this.foldersManager.disable([path]);
    }

    enableUI(key: string, path: string): void {
        this.foldersManager.enable([path]);
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