import { Component, ExtraButtonComponent } from "obsidian";
import { LayerGroup } from "../internal";
import { GraphInstances } from "../pluginInstances";

export class LayersUI extends Component {
    instances: GraphInstances;

    root: HTMLDivElement;
    toggleButton: ExtraButtonComponent;
    levelsArea: HTMLDivElement;
    activeLayersBorder: HTMLDivElement;

    statusBarResizeObserver?: ResizeObserver;

    constructor(instances: GraphInstances) {
        super();
        this.instances = instances;
        this.root = this.instances.view.contentEl.createDiv();
        this.root.addClass("extended-graph-layers");
        if (this.instances.settings.displayLabelsInUI) {
            this.root.addClass("show-labels");
        }
        this.computePosition();

        this.onLevelClicked = this.onLevelClicked.bind(this);
        this.onMouseWheel = this.onMouseWheel.bind(this);

        this.addToggleButton();
        this.addLevels();

        if (this.instances.layersManager?.isEnabled) {
            this.open();
        }
        else {
            this.close();
        }
    }

    private addToggleButton() {
        this.toggleButton = new ExtraButtonComponent(this.root);
        this.toggleButton.setIcon("layers");
        this.toggleButton.onClick(() => {
            if (this.instances.layersManager?.isEnabled) {
                this.instances.layersManager.disable();
            }
            else {
                this.instances.layersManager?.enable();
            }
        });
    }

    private addLevels() {
        this.levelsArea = this.root.createDiv("layers");
        this.levelsArea.addEventListener("wheel", this.onMouseWheel, { passive: true });
    }

    updateLevels(layerGroups: LayerGroup[]) {
        this.levelsArea.innerHTML = "";
        for (const group of layerGroups) {
            const divLayer = this.levelsArea.createDiv("layer");

            const divLevel = divLayer.createDiv("layer-level");
            divLevel.innerText = group.level.toString();
            divLevel.addEventListener("click", this.onLevelClicked);

            if (this.instances.settings.displayLabelsInUI) {
                const divLabels = divLayer.createDiv("layer-labels");
                for (const layer of group.layers) {
                    if (layer.label) {
                        divLabels.createDiv({ text: layer.label });
                    }
                }
            }
        }
    }

    updateCurrentLevelUI(currentIndex: number) {
        if (!this.activeLayersBorder)
            this.activeLayersBorder = this.root.createDiv("active-layers-border");

        for (const child of Array.from(this.levelsArea.children)) {
            child.removeClass("current");
        }
        const firstDiv = this.levelsArea.children[currentIndex];
        const lastDiv = this.levelsArea.children[Math.min(
            this.levelsArea.children.length - 1,
            (currentIndex + this.instances.settings.numberOfActiveLayers - 1))];

        const top = firstDiv.getBoundingClientRect().top - this.root.getBoundingClientRect().top;
        const bottom = this.root.getBoundingClientRect().bottom - lastDiv.getBoundingClientRect().bottom;
        this.activeLayersBorder.style.setProperty("top", top.toString() + "px");
        this.activeLayersBorder.style.setProperty("bottom", bottom.toString() + "px");

        firstDiv.addClass("current");
    }

    private onMouseWheel(e: WheelEvent) {
        if (e.deltaY < 0) {
            this.instances.layersManager?.decreaseCurrentLevel();
        }
        else {
            this.instances.layersManager?.increaseCurrentLevel();
        }
    }

    private onLevelClicked(e: MouseEvent) {
        if (e.targetNode?.textContent) this.instances.layersManager?.setCurrentLevel(parseInt(e.targetNode.textContent))
    }

    private computePosition() {
        this.setHeight = this.setHeight.bind(this);

        // Observer status bar changes
        const statusBar = this.root.doc.querySelector(".status-bar");
        if (statusBar) {
            this.statusBarResizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    this.setHeight();
                }
            });
            this.statusBarResizeObserver.observe(statusBar);
        }

        // Observe iframe
        this.instances.renderer.iframeEl.addEventListener("load", this.setHeight);

        this.setHeight();
    }

    private setHeight() {
        const statusBar = this.root.doc.querySelector(".status-bar");
        const statusBarTop = statusBar?.getBoundingClientRect().top;
        const viewBottom = this.instances.view.containerEl.getBoundingClientRect().bottom;
        const bottom = statusBarTop ? Math.max(0, viewBottom - statusBarTop) + 12 : 12;
        this.root.style.setProperty("bottom", bottom + "px");
    }

    open() {
        this.root.removeClass("is-closed");
        this.toggleButton.extraSettingsEl.addClass("is-active");
        this.levelsArea.show();
        this.activeLayersBorder?.show();
    }

    close() {
        this.root.addClass("is-closed");
        this.toggleButton.extraSettingsEl.removeClass("is-active");
        this.levelsArea.hide();
        this.activeLayersBorder?.hide();
    }

    onunload(): void {
        this.root.detach();
        this.statusBarResizeObserver?.disconnect();
        this.instances.renderer.iframeEl.removeEventListener("load", this.setHeight);
    }
}