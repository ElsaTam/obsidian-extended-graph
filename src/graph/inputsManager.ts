import { Keymap, Menu, TFile, UserEvent } from "obsidian";
import { FederatedPointerEvent, Graphics } from "pixi.js";
import { getFileInteractives, OpenExternalLinkModal, Pinner, pixiAddChild, RadialMenuManager, t } from "../internal";
import { GraphInstances, ExtendedGraphInstances } from "../pluginInstances";

export class InputsManager {
    instances: GraphInstances;
    coreOnNodeClick?: (e: UserEvent | null, id: string, type: string) => void;
    coreOnNodeRightClick?: (e: UserEvent | null, id: string, type: string) => void;

    isListeningToUnselect: boolean = false;
    isSelecting: boolean = false;
    isDragging: boolean = false;
    selectionStartPosition: { x: number, y: number };
    selectionRectangle: Graphics;

    constructor(instances: GraphInstances) {
        this.instances = instances;

        this.selectionRectangle = new Graphics();
        this.selectionRectangle.eventMode = "none";

        this.bindStageEvents();
        this.changeNodeOnClick();
        this.preventDraggingPinnedNodes();
    }

    bindStageEvents(): void {
        this.onPointerDownOnStage = this.onPointerDownOnStage.bind(this);
        this.instances.renderer.px.stage.on('pointerdown', this.onPointerDownOnStage);

        this.onPointerUpOnStage = this.onPointerUpOnStage.bind(this);
        this.instances.renderer.px.stage.on('pointerup', this.onPointerUpOnStage);

        this.onPointerMoveOnStage = this.onPointerMoveOnStage.bind(this);
        this.instances.renderer.px.stage.on('pointermove', this.onPointerMoveOnStage);

        this.onPointerUpOnWindow = this.onPointerUpOnWindow.bind(this);
        this.onInputToUnselectNodes = this.onInputToUnselectNodes.bind(this);
    }

    private changeNodeOnClick(): void {
        if (this.instances.settings.openInNewTab || this.instances.settings.externalLinks !== "none") {
            this.onNodeClick = this.onNodeClick.bind(this);
            this.coreOnNodeClick = this.instances.renderer.onNodeClick;
            this.instances.renderer.onNodeClick = this.onNodeClick;
        }

        if (this.instances.settings.useRadialMenu || this.instances.settings.pinNodeModifier) {
            this.onNodeRightClick = this.onNodeRightClick.bind(this);
            this.coreOnNodeRightClick = this.instances.renderer.onNodeRightClick;
            this.instances.renderer.onNodeRightClick = this.onNodeRightClick;
        }
    }

    // =============================== UNLOADING ===============================

    unload() {
        this.unbindStageEvents();
        this.restoreOnNodeClick();
    }

    unbindStageEvents() {
        this.instances.renderer.px.stage.off('pointerdown', this.onPointerDownOnStage);
        this.instances.renderer.px.stage.off('pointerup', this.onPointerUpOnStage);
        this.instances.renderer.px.stage.off('pointermove', this.onPointerMoveOnStage);

        this.instances.renderer.interactiveEl.win.window.removeEventListener("mouseup", this.onPointerUpOnWindow);
        this.instances.renderer.interactiveEl.win.window.removeEventListener("mouseup", this.onInputToUnselectNodes);
        this.instances.renderer.interactiveEl.win.window.removeEventListener("keydown", this.onInputToUnselectNodes);
    }

    private restoreOnNodeClick(): void {
        if (this.coreOnNodeClick) {
            this.instances.renderer.onNodeClick = this.coreOnNodeClick;
            this.coreOnNodeClick = undefined;
        }
        if (this.coreOnNodeRightClick) {
            this.instances.renderer.onNodeRightClick = this.coreOnNodeRightClick;
            this.coreOnNodeRightClick = undefined;
        }
    }

    // ========================= POINTERS UP/DOWN/MOVE =========================

    private onPointerDownOnStage(e: FederatedPointerEvent): void {
        this.preventDraggingPinnedNodes();

        // Selection if "shift" is holded
        if (e.button === 0 && Keymap.isModifier(e, ExtendedGraphInstances.settings.selectNodeModifier) && !this.instances.renderer.dragNode) {
            // Get start position, and add rectangle if needed
            this.selectionStartPosition = e.getLocalPosition(this.instances.renderer.hanger);
            if (this.selectionRectangle.parent !== this.instances.renderer.hanger) {
                pixiAddChild(this.instances.renderer.hanger, this.selectionRectangle);
            }
            this.selectionRectangle.clear();
            this.selectionRectangle.visible = true;

            // Start special behaviors
            this.preventPan();
            this.instances.renderer.interactiveEl.win.window.addEventListener("mouseup", this.onPointerUpOnWindow);
            this.isSelecting = true;
        }
    }

    private onPointerUpOnStage(): void {
        this.pinDraggingPinnedNode();
    }

    private onPointerUpOnWindow(e: FederatedPointerEvent) {
        if (e.button === 0) {
            // Clear rectangle
            this.selectionRectangle.visible = false;

            // Stop special behaviors
            this.allowPan();
            this.instances.renderer.interactiveEl.win.window.removeEventListener("mouseup", this.onPointerUpOnWindow);
            this.isSelecting = false;

            // Select nodes
            this.instances.nodesSet.selectNodesInRectangle(this.selectionRectangle.getLocalBounds());
        }
    }

    startListeningToUnselectNodes() {
        if (this.isListeningToUnselect) return;
        this.isListeningToUnselect = true;
        this.instances.renderer.px.stage.addEventListener("mouseup", this.onInputToUnselectNodes);
        this.instances.renderer.interactiveEl.win.window.addEventListener("keydown", this.onInputToUnselectNodes);
    }

    stopListeningToUnselectNodes() {
        this.instances.renderer.px.stage.removeEventListener("mouseup", this.onInputToUnselectNodes);
        this.instances.renderer.interactiveEl.win.window.removeEventListener("keydown", this.onInputToUnselectNodes);
        this.isListeningToUnselect = false;
    }

    private preventPan() {
        const renderer = this.instances.renderer;
        ExtendedGraphInstances.proxysManager.registerProxy<typeof this.instances.renderer.setPan>(
            this.instances.renderer,
            "setPan",
            {
                apply(target, thisArg, args) {
                    renderer.panvX = 0;
                    renderer.panvY = 0;
                    renderer.panning = false;
                    return false;
                }
            }
        );
    }

    private allowPan() {
        ExtendedGraphInstances.proxysManager.unregisterProxy(this.instances.renderer.setPan);
    }

    private onPointerMoveOnStage(e: FederatedPointerEvent): void {
        if (this.isSelecting) {
            const pos = e.getLocalPosition(this.instances.renderer.hanger);
            this.selectionRectangle.clear();
            this.selectionRectangle.beginFill(0x9872f5, 0.1);
            this.selectionRectangle.lineStyle(2, 0x9872f5, 0.3);
            this.selectionRectangle.drawRect(
                Math.min(this.selectionStartPosition.x, pos.x),
                Math.min(this.selectionStartPosition.y, pos.y),
                Math.abs(pos.x - this.selectionStartPosition.x),
                Math.abs(pos.y - this.selectionStartPosition.y),
            );
            this.selectionRectangle.endFill();
        }

        else {
            this.instances.nodesSet.moveSelectedNodes(e.getLocalPosition(this.instances.renderer.hanger));
        }
    }

    private onInputToUnselectNodes(e: FederatedPointerEvent | MouseEvent | KeyboardEvent) {
        if (!("instanceOf" in e && e.instanceOf(KeyboardEvent)) || e.key === "Escape") {
            if ("target" in e && this.instances.renderer.nodes.find(n => n.circle === e.target) && !this.isDragging) {
                return; // Don't unselect if a node was targeted
            }
            if (this.isDragging) {
                this.isDragging = false;
                this.instances.nodesSet.stopMovingSelectedNodes();
            }
            else {
                this.instances.nodesSet.unselectNodes();
                this.instances.renderer.changed();
            }
        }
    }

    // ============================== NODE CLICKS ==============================

    private onNodeClick(e: UserEvent | null, id: string, type: string): void {
        // Check if we select the node
        if (e && ExtendedGraphInstances.settings.useLeftClickToSelect && Keymap.isModifier(e, ExtendedGraphInstances.settings.selectNodeModifier)) {
            this.instances.nodesSet.selectNodes([this.instances.renderer.nodeLookup[id]]);
            return;
        }

        // Check if we need to open an URL
        if (this.instances.settings.externalLinks !== "none" && "attachment" === type) {
            try {
                let targetURL: URL | undefined;
                for (const urls of Object.values(this.instances.nodesSet.cachedExternalLinks)) {
                    targetURL = urls.find(url => {
                        const urlData = this.instances.nodesSet.convertExternalLink(url);
                        return urlData.domain === id || urlData.href === id || url.toString() === id;
                    });
                    if (targetURL) break;
                }
                if (targetURL) {
                    // First, let's see if we find a *Link Note*
                    if (ExtendedGraphInstances.settings.externalLinkOpenMode === "choice" || ExtendedGraphInstances.settings.externalLinkOpenMode === "note") {
                        const paths = this.findExternalLinkFiles(id);
                        if (ExtendedGraphInstances.settings.externalLinkOpenMode === "note" && paths.length > 0) {
                            if (this.instances.settings.openInNewTab) {
                                ExtendedGraphInstances.app.workspace.openLinkText(paths[0].path, "", "tab");
                            }
                            else {
                                ExtendedGraphInstances.app.workspace.openLinkText(paths[0].path, "", Keymap.isModEvent(e));
                            }
                            return;
                        }
                        else if (paths.length > 0) {
                            const modal = new OpenExternalLinkModal(paths, (file) => {
                                if (file) {
                                    if (this.instances.settings.openInNewTab) {
                                        ExtendedGraphInstances.app.workspace.openLinkText(file.path, "", "tab");
                                    }
                                    else {
                                        ExtendedGraphInstances.app.workspace.openLinkText(file.path, "", Keymap.isModEvent(e));
                                    }
                                }
                                else {
                                    window.open(targetURL.href, "");
                                }
                            });
                            modal.open();
                            return;
                        }
                    }

                    // If not, open the web viewer or navigator
                    window.open(targetURL.href, "");
                    return;
                }
            }
            catch (e) {
                console.error(e);
            }
        }

        // Check if we need to open in a new tab
        if (this.instances.settings.openInNewTab && "tag" !== type) {
            ExtendedGraphInstances.app.workspace.openLinkText(id, "", "tab");
            return;
        }

        // Default action
        if (this.coreOnNodeClick) this.coreOnNodeClick(e, id, type);
    }

    private onNodeRightClick(e: MouseEvent | null, id: string, type: string): void {
        if (e && ExtendedGraphInstances.settings.useRadialMenu && Keymap.isModifier(e, ExtendedGraphInstances.settings.radialMenuModifier)) {
            const radialMenu = new RadialMenuManager(this.instances, id, type);
            radialMenu.open(e);
            return;
        }

        if (e && ExtendedGraphInstances.settings.pinNodeModifier && Keymap.isModifier(e, ExtendedGraphInstances.settings.pinNodeModifier)) {
            const pinner = new Pinner(this.instances);
            if (this.instances.nodesSet.isNodePinned(id)) {
                pinner.unpinNode(id);
            }
            else {
                pinner.pinNode(id);
            }
            return;
        }

        if (this.coreOnNodeRightClick) this.coreOnNodeRightClick(e, id, type);
    }

    private findExternalLinkFiles(id: string): TFile[] {
        const idFiles: TFile[] = [];
        const hrefFiles: TFile[] = [];
        const domainFiles: TFile[] = [];
        for (const file of ExtendedGraphInstances.app.vault.getMarkdownFiles()) {
            for (const property of ExtendedGraphInstances.settings.externalLinksProperties) {
                const noteURLValues = getFileInteractives(property, file);
                if (!noteURLValues) continue;
                for (const noteURLValue of noteURLValues) {
                    try {
                        const noteURL = new URL(noteURLValue);
                        if (noteURL.toString() === id) {
                            idFiles.push(file);
                            if (ExtendedGraphInstances.settings.externalLinkOpenMode === "note") {
                                return idFiles;
                            }
                        }
                        else if (noteURL.origin + noteURL.pathname === id) {
                            hrefFiles.push(file);
                        }
                        else if (noteURL.hostname === id) {
                            domainFiles.push(file);
                        }
                    } catch (error) {
                        continue;
                    }
                }
            }
        }

        // Order by best matches
        return idFiles.concat(hrefFiles).concat(domainFiles);
    }

    // =============================== PIN NODES ===============================

    onNodeMenuOpened(menu: Menu, file: TFile) {
        menu.addSections(['extended-graph']);
        menu.addItem(cb => {
            if (this.instances.nodesSet.isNodePinned(file.path)) {
                cb.iconEl.addClass("extended-graph-pin-off");
                cb.setIcon("pin-off");
                cb.setTitle(t("features.unpinNode"));
                cb.onClick(() => { this.unpinNode(file); });
            }
            else {
                cb.iconEl.addClass("extended-graph-pin");
                cb.setIcon("pin");
                cb.setTitle(t("features.pinNode"));
                cb.onClick(() => { this.pinNode(file); });
            }
        })
    }

    private pinNode(file: TFile) {
        const pinner = new Pinner(this.instances);
        pinner.pinNode(file.path);
    }

    pinNodeFromId(id: string) {
        const pinner = new Pinner(this.instances);
        pinner.pinNode(id);
    }

    private unpinNode(file: TFile) {
        const pinner = new Pinner(this.instances);
        pinner.unpinNode(file.path);
        this.instances.renderer.changed();
    }

    unpinNodeFromId(id: string) {
        const pinner = new Pinner(this.instances);
        pinner.unpinNode(id);
        this.instances.renderer.changed();
    }

    private preventDraggingPinnedNodes() {
        const node = this.instances.renderer.dragNode;
        if (node && this.instances.nodesSet.isNodePinned(node.id)) {
            const pinner = new Pinner(this.instances);
            pinner.setLastDraggedPinnedNode(node.id);
        }
    }

    private pinDraggingPinnedNode() {
        const pinner = new Pinner(this.instances);
        pinner.pinLastDraggedPinnedNode();
    }
}