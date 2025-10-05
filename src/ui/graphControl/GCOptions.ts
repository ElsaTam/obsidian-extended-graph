import { ButtonComponent, ExtraButtonComponent, getIcon, setIcon, Setting } from "obsidian";
import { GraphView, LocalGraphView } from "obsidian-typings";
import {
    GCSection,
    ImportConfigModal,
    RendererNodeNamesSuggester,
    PinMultipleNodesModal,
    Pinner,
    ExtendedGraphInstances,
    t,
    NodesSelectionMode
} from "../../internal";

export class GCOptions extends GCSection {
    suggester: RendererNodeNamesSuggester;

    selectionModeButtons: Partial<Record<NodesSelectionMode, ExtraButtonComponent>> = {};

    constructor(view: GraphView | LocalGraphView) {
        super(view, "options", t("plugin.options"));

        this.treeItemChildren = this.root.createDiv("tree-item-children");
        this.display(true);

        this.collapseGraphControlSection();
    }

    // ================================ DISPLAY ================================

    override display(enable: boolean) {
        this.treeItemChildren.replaceChildren();

        if (enable) this.createImportConfig();
        this.createSaveForDefaultState();
        if (enable) this.createSaveForNormalState();
        this.createZoomOnNode();
        this.createScreenshot();
        if (enable) this.createButtonViewState();
        if (enable) this.createPinMultipleNodes();
        if (enable) this.createUnpinAllNodes();
        if (enable) this.createSelectionModes();
    }

    private createImportConfig(): Setting {
        return new Setting(this.treeItemChildren)
            .setName(t("controls.importSettingsAndReload"))
            .addExtraButton(cb => {
                cb.setIcon("settings");
                cb.setTooltip(t("controls.importSettings"));
                cb.onClick(() => {
                    const modal = new ImportConfigModal((filepath: string) => {
                        if (filepath.trim() === "") {
                            return;
                        }
                        ExtendedGraphInstances.plugin.importSettings(filepath).then(() => {
                            ExtendedGraphInstances.graphsManager.lifecycleManager.resetPlugin(this.view, false);
                        });
                    });
                    modal.open();
                });
            });
    }

    private createSaveForDefaultState(): Setting {
        return new Setting(this.treeItemChildren)
            .setName(t("states.saveForDefaultState"))
            .setTooltip(t("states.saveForDefaultStateDesc"))
            .addExtraButton(cb => {
                cb.extraSettingsEl.addClass("save-button");
                setIcon(cb.extraSettingsEl, "arrow-up-to-line");
                cb.onClick(() => {
                    ExtendedGraphInstances.statesManager.saveForDefaultState(this.view);
                });
            });
    }

    private createSaveForNormalState(): Setting {
        return new Setting(this.treeItemChildren)
            .setName(t("states.saveForNormalState"))
            .setDesc(t("states.saveForNormalStateDesc"))
            .setTooltip(t("states.saveForNormalStateTooltip"))
            .addExtraButton(cb => {
                cb.extraSettingsEl.addClass("save-button");
                setIcon(cb.extraSettingsEl, "arrow-down-to-line");
                cb.onClick(() => {
                    ExtendedGraphInstances.statesManager.saveForNormalState(this.view);
                });
            });
    }

    private createScreenshot(): Setting {
        return new Setting(this.treeItemChildren)
            .setName(t("features.svgScreenshotCopy"))
            .addExtraButton(cb => {
                cb.extraSettingsEl.addClass("screenshot-button");
                setIcon(cb.extraSettingsEl, "image");
                cb.onClick(() => {
                    ExtendedGraphInstances.graphsManager.getSVGScreenshot(this.view);
                });
            });
    }

    private createZoomOnNode(): Setting {
        return new Setting(this.treeItemChildren)
            .setName(t("features.zoomOnNode"))
            .addSearch(cb => {
                const callback = (value: string) => {
                    ExtendedGraphInstances.graphsManager.zoomOnNode(this.view, value);
                }
                this.suggester = new RendererNodeNamesSuggester(cb.inputEl, this.view.renderer, callback);
            });
    }

    private createButtonViewState(): Setting {
        return new Setting(this.treeItemChildren)
            .setName(t("states.showGraphState"))
            .addExtraButton(cb => {
                cb.setIcon("info");
                cb.onClick(() => {
                    ExtendedGraphInstances.statesManager.showGraphState(this.view);
                })
            })
    }

    private createPinMultipleNodes(): Setting {
        return new Setting(this.treeItemChildren)
            .setName(t("features.pinMultipleNodes"))
            .addExtraButton(cb => {
                cb.extraSettingsEl.addClass("extended-graph-pin");
                cb.setIcon('pin');
                cb.onClick(() => {
                    const instances = ExtendedGraphInstances.graphsManager.allInstances.get(this.view.leaf.id);
                    if (!instances) return;
                    const pinner = new Pinner(instances);
                    const modal = new PinMultipleNodesModal(this.instances?.settings ?? ExtendedGraphInstances.settings,
                        (shapeData, queryData) => {
                            pinner.pinInShape(shapeData, queryData);
                        });
                    modal.open();
                })
            });
    }

    private createUnpinAllNodes(): Setting {
        return new Setting(this.treeItemChildren)
            .setName(t("features.unpinAllNodes"))
            .addExtraButton(cb => {
                cb.extraSettingsEl.addClass("extended-graph-pin-off");
                cb.setIcon('pin-off');
                cb.onClick(() => {
                    const instances = ExtendedGraphInstances.graphsManager.allInstances.get(this.view.leaf.id);
                    if (!instances) return;
                    const pinner = new Pinner(instances);
                    pinner.unpinAllNodes();
                })
            });
    }

    private createSelectionModes(): Setting | undefined {
        if (!this.instances) return;

        const modes: { mode: NodesSelectionMode, tooltip: string, icon: string }[] = [
            {
                mode: 'replace',
                tooltip: t("inputs.selectionModeReplaceTooltip"),
                icon: 'square'
            },
            {
                mode: 'add',
                tooltip: t("inputs.selectionModeAddTooltip"),
                icon: 'squares-unite'
            },
            {
                mode: 'subtract',
                tooltip: t("inputs.selectionModeSubtractTooltip"),
                icon: 'squares-subtract'
            },
            {
                mode: 'intersect',
                tooltip: t("inputs.selectionModeIntersectTooltip"),
                icon: 'squares-intersect'
            },
        ];
        const setting = new Setting(this.treeItemChildren)
            .setName(t("inputs.selectionMode"));

        for (const mode of modes) {
            setting.addExtraButton(cb => {
                this.selectionModeButtons[mode.mode] = cb;
                cb.setIcon(mode.icon);
                cb.setTooltip(mode.tooltip);
                cb.onClick(() => {
                    if (!this.instances) return;
                    this.instances.settings.selectionMode = mode.mode;
                    Object.entries(this.selectionModeButtons).forEach(value => {
                        if (value[0] === mode.mode) {
                            value[1].extraSettingsEl.addClass("is-active");
                        }
                        else {
                            value[1].extraSettingsEl.removeClass("is-active");
                        }
                    })
                })
            });
        }

        this.selectionModeButtons[this.instances.settings.selectionMode]?.extraSettingsEl.addClass("is-active");

        return setting;
    }
}