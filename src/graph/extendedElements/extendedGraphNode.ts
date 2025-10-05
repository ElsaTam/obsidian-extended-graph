import { getIcon } from "obsidian";
import { GraphColorAttributes, GraphNode, LocalGraphView } from "obsidian-typings";
import { Graphics } from "pixi.js";
import {
    colorizeSVG,
    DEFAULT_SETTINGS,
    ExtendedGraphElement,
    ExtendedGraphText,
    getLinkID,
    getListOfSubpaths,
    getSvgFromIconic,
    getSvgFromIconize,
    hex2int,
    isEmoji,
    isNumber,
    NodeGraphicsWrapper,
    NodeShape,
    Pinner,
    ExtendedGraphInstances,
    ShapeEnum,
    CSSBridge,
    getEmojiColor,
    int2hex,
    getFile,
    getFileInteractives
} from "../../internal";
import * as Color from '../../colors/color-bits';

export abstract class ExtendedGraphNode extends ExtendedGraphElement<GraphNode> {
    graphicsWrapper?: NodeGraphicsWrapper;
    isPinned: boolean = false;
    pinnedPosition?: { x: number, y: number };
    extendedText: ExtendedGraphText;
    isCurrentNode: boolean;

    // Size
    graphicsWrapperScale: number = 1;
    radius: number;

    // icon
    icon: {
        svg: SVGSVGElement | null,
        color: string | null,
        emoji: string | null
    } | null;

    // ============================== CONSTRUCTOR ==============================

    protected override additionalConstruct() {
        this.isCurrentNode = this.instances.type === "localgraph" && (this.instances.view as LocalGraphView).file?.path === this.id;
        this.extendedText = new ExtendedGraphText(this.instances, this.coreElement);
        this.getIcon();
        this.radius = NodeShape.RADIUS;
        this.computeRadius();
    }


    // ======================== MODIFYING CORE ELEMENT =========================

    override init(): void {
        super.init();
        this.addAnimationListener();
        if (this.isPinned && this.pinnedPosition) {
            const pinner = new Pinner(this.instances);
            pinner.pinNode(this.id, this.pinnedPosition.x, this.pinnedPosition.y);
        }
        this.extendedText.init();
    }

    override modifyCoreElement(): void {
        this.proxyGetSize();
        this.proxyGetFillColor();
        this.proxyInitGraphics();
        this.proxyRender();

        this.coreElement.circle?.addListener('destroyed', () => this.restoreCoreElement());
    }

    private proxyGetSize() {
        if (!(this.graphicsWrapper && this.graphicsWrapper.shape !== ShapeEnum.CIRCLE)
            && (this.radius === NodeShape.RADIUS)
            && !(this.instances.settings.enableFeatures[this.instances.type]["elements-stats"]
                && this.instances.settings.nodesSizeFunction !== "default")) {
            return;
        }

        const getSize = this.getSize.bind(this);
        ExtendedGraphInstances.proxysManager.registerProxy<typeof this.coreElement.getSize>(
            this.coreElement,
            "getSize",
            {
                apply(target, thisArg, args) {
                    return getSize.call(this, ...args)
                }
            }
        );
    }

    protected needToChangeColor(): boolean {
        if (this.instances.type === "localgraph") {
            if (this.instances.settings.colorBasedOnDepth) return true;
            if (this.instances.settings.currentNode.useColor && this.isCurrentNode) return true;
        }
        if (this.icon?.color && this.instances.settings.useIconColorForBackgroud) {
            return true;
        }

        return false;
    }

    protected needToUpdateGraphicsColor(): boolean { return false; }

    private proxyGetFillColor(): void {
        const needToUpdateGraphicsColor = this.needToUpdateGraphicsColor();
        const needToChangeColor = this.needToChangeColor();
        if (!(needToUpdateGraphicsColor || needToChangeColor)) return;

        const onGetFillColorCalled = this.onGetFillColorCalled.bind(this);
        ExtendedGraphInstances.proxysManager.registerProxy<typeof this.coreElement.getFillColor>(
            this.coreElement,
            "getFillColor",
            {
                apply(target, thisArg, args) {
                    return onGetFillColorCalled(needToUpdateGraphicsColor, needToChangeColor, target, thisArg, args);
                }
            }
        );
    }

    private proxyInitGraphics(): void {
        const onInitGraphicsCalled = this.onInitGraphicsCalled.bind(this);
        ExtendedGraphInstances.proxysManager.registerProxy<typeof this.coreElement.initGraphics>(
            this.coreElement,
            "initGraphics",
            {
                apply(target, thisArg, args) {
                    const applied = Reflect.apply(target, thisArg, args);
                    onInitGraphicsCalled();
                    return applied;
                }
            }
        );
    }

    private proxyRender(): void {
        if (!(
            (this.instances.settings.enableFeatures[this.instances.type]['names'] && this.instances.settings.showNamesWhenNeighborHighlighted)
            || this.icon
            || (this.graphicsWrapper && this.graphicsWrapper.shape !== ShapeEnum.CIRCLE)
            || (this.instances.type === "graph" && this.instances.settings.enableFeatures["graph"].focus && this.instances.settings.focusScaleFactor !== 1)
        )) {
            return;
        }

        const onRenderCalled = this.onRenderCalled.bind(this);
        ExtendedGraphInstances.proxysManager.registerProxy<typeof this.coreElement.render>(
            this.coreElement,
            "render",
            {
                apply(target, thisArg, args) {
                    const applied = Reflect.apply(target, thisArg, args);
                    onRenderCalled();
                    return applied;
                }
            }
        );
    }

    // ================================ UNLOAD =================================

    override unload() {
        this.removeAnimationListener();
        if (this.isPinned) {
            new Pinner(this.instances).unpinNode(this.id);
        }
        this.extendedText.unload();

        if (this.coreElement.circle?.filters) {
            this.coreElement.circle.filters.remove(this.instances.nodesSet.selectionFilter);
            this.coreElement.circle.filters.remove(this.instances.nodesSet.openFilter);
            this.coreElement.circle.filters.remove(this.instances.nodesSet.searchResultFilter);
        }
        super.unload();
    }

    override restoreCoreElement(): void {
        ExtendedGraphInstances.proxysManager.unregisterProxy(this.coreElement.getSize);
        ExtendedGraphInstances.proxysManager.unregisterProxy(this.coreElement.getFillColor);
        ExtendedGraphInstances.proxysManager.unregisterProxy(this.coreElement.initGraphics);
        ExtendedGraphInstances.proxysManager.unregisterProxy(this.coreElement.render);
    }

    // =============================== GRAPHICS ================================

    protected needGraphicsWrapper(): boolean {
        return this.needPin() || this.needOpacityLayer() || !!this.icon;
    }

    public needOpacityLayer(): boolean { return this.instances.settings.fadeOnDisable; }

    public needPin(): boolean { return this.instances.settings.showPinIcon; }

    public needIcon(): boolean { return this.instances.settings.enableFeatures[this.instances.type]['icons']; }

    public getIcon(): void {
        if (!this.needIcon()) return;
        // Recursively get icon for file, or if it doesn't exist, for parent folders
        const paths = this.instances.settings.useParentIcon ? getListOfSubpaths(this.id).reverse() : [this.id];
        let icon: typeof this.icon | null = null;

        // try to find in properties
        if (this.instances.settings.iconProperties.some(p => p !== "")) {
            const file = getFile(this.id);
            if (file) {
                let found = false;
                for (const property of this.instances.settings.iconProperties) {
                    const iconList = getFileInteractives(property, file, this.instances.settings);
                    for (const iconString of iconList) {
                        if (isEmoji(iconString)) {
                            icon = { svg: null, color: null, emoji: iconString };
                            found = true;
                            break;
                        }
                        const svg = getIcon(iconString);
                        if (svg) {
                            svg.setAttribute("stroke", "white");
                            icon = { svg: svg, color: null, emoji: null };
                            found = true;
                            break;
                        }
                    }
                    if (found) break;
                }
            }
        }

        // try to find with plugins
        if (!icon && this.instances.settings.usePluginForIcon) {
            for (const path of paths) {
                icon = getSvgFromIconic(path);
                if (!icon) {
                    icon = getSvgFromIconize(path);
                }
                if (icon) {
                    break;
                }
            }
            if (icon?.svg) {
                colorizeSVG(icon.svg, "white");
            }
        }
        if (icon && !this.instances.settings.usePluginForIconColor) {
            icon.color = null;
        }
        if (icon?.emoji) {
            const emojiColor = getEmojiColor(icon.emoji);
            if (emojiColor) icon.color = int2hex(emojiColor);
        }

        if (this.icon && this.icon.svg == null && this.icon.emoji == null) this.icon = null;
        else this.icon = icon;
    }

    // ================================ RENDER =================================

    private onInitGraphicsCalled() {
        this.graphicsWrapper?.connect();
    }

    private onRenderCalled() {
        // Display names if the neighbor is highligted
        if (this.instances.settings.enableFeatures[this.instances.type]['names'] && this.instances.settings.showNamesWhenNeighborHighlighted) {
            this.extendedText.makeVisibleIfNeighborHighlighted();
        }

        if (this.coreElement.circle) {
            // Make the circle same color as the background
            if (this.graphicsWrapper && this.graphicsWrapper.shape !== ShapeEnum.CIRCLE) {
                this.coreElement.circle.tint = CSSBridge.backgroundColor;
            }
            else if (this.icon) {
                // or blended
                const needBlend = !this.graphicsWrapper ||
                    (!("background" in this.graphicsWrapper) || !this.graphicsWrapper.background);
                this.coreElement.circle.tint = needBlend
                    ? Color.blend(CSSBridge.backgroundColor, this.coreElement.getFillColor().rgb, this.instances.settings.backgroundOpacityWithIcon)
                    : CSSBridge.backgroundColor;
                this.coreElement.circle.alpha = 1;
            }

            // Scale if focused
            if (this.instances.type === "graph" && this.instances.settings.enableFeatures["graph"].focus && this.instances.settings.focusScaleFactor !== 1) {
                if (this.id === ExtendedGraphInstances.app.workspace.getActiveFile()?.path) {
                    this.coreElement.circle.scale.x *= this.instances.settings.focusScaleFactor;
                    this.coreElement.circle.scale.y *= this.instances.settings.focusScaleFactor;
                }
            }
        }
    }

    // =============================== NODE SIZE ===============================

    private computeRadius() {
        let setByProperty = false;
        if (this.instances.settings.enableFeatures[this.instances.type]['elements-stats']) {
            const properties = this.instances.settings.nodesSizeProperties.filter(p => p !== "");
            if (properties.length > 0) {
                const file = getFile(this.id);
                if (file) {
                    for (const property of properties) {
                        const values = getFileInteractives(property, file, this.instances.settings);
                        for (const value of values) {
                            if (isNumber(value)) {
                                this.radius = parseInt(value);
                                if (isNaN(this.radius)) this.radius = NodeShape.RADIUS;
                                setByProperty = true;
                                break;
                            }
                        }
                        if (setByProperty) break;
                    }
                }
            }

        }

        if (!setByProperty && this.isCurrentNode && this.instances.settings.currentNode.size !== DEFAULT_SETTINGS.currentNode.size) {
            this.radius = this.instances.settings.currentNode.size;
        }
    }

    private getSize(): number {
        return this.getSizeWithoutScaling() * this.graphicsWrapperScale;
    }

    getSizeWithoutScaling(): number {
        const customRadiusFactor = this.radius / NodeShape.RADIUS;
        const node = this.coreElement;
        if (this.instances.settings.enableFeatures[this.instances.type]['elements-stats'] && this.instances.settings.nodesSizeFunction !== 'default') {
            const originalSize = node.renderer.fNodeSizeMult * 8;
            const customFunctionFactor = (this.instances.nodesSizeCalculator ?? ExtendedGraphInstances.graphsManager.vaultStatsManager.nodesSizeCalculator)?.filesStats.get(this.id)?.value;
            return originalSize * customRadiusFactor * (customFunctionFactor ?? 1);
        }
        else {
            const originalSize = node.renderer.fNodeSizeMult * Math.max(8, Math.min(3 * Math.sqrt(node.weight + 1), 30));
            return originalSize * customRadiusFactor;
        }
    }

    // ============================== NODE COLOR ===============================

    private onGetFillColorCalled(needToUpdateGraphicsColor: boolean, needToChangeColor: boolean, target: () => GraphColorAttributes, thisArg: any, args: any[]): GraphColorAttributes | undefined {

        // Get the original color and the override color
        const isHighlighted = this.coreElement.renderer.getHighlightNode() === this.coreElement;
        const isFocused = this.coreElement.type === "focused";
        const originalColor: GraphColorAttributes = Reflect.apply(target, thisArg, args);
        let overrideColor = originalColor;
        if (needToChangeColor) {
            if (!(isHighlighted)) {
                overrideColor = this.getFillColor.call(this, ...args) ?? originalColor;
            }
        }

        if (needToUpdateGraphicsColor) {
            this.graphicsWrapper?.updateFillColor(overrideColor.rgb, isHighlighted);
        }

        return overrideColor;
    }

    protected getFillColor(): GraphColorAttributes | undefined {
        if (this.isCurrentNode && this.instances.settings.currentNode.useColor) {
            return {
                rgb: hex2int(this.instances.settings.currentNode.color),
                a: this.instances.renderer.colors.fillFocused.a > 0 ? this.instances.renderer.colors.fillFocused.a : 1
            }
        }
        if (this.icon?.color && this.instances.settings.useIconColorForBackgroud) {
            return {
                rgb: Color.parseCSS(this.icon.color).rgb,
                a: this.instances.renderer.colors.fill.a
            }
        }
        return;
    };

    // ============================== CORE ELEMENT =============================

    protected override isCoreElementUptodate(): boolean {
        return !!this.coreElement.circle;
    }

    override isSameCoreElement(node: GraphNode): boolean {
        return node.id === this.id;
    }

    protected override isSameCoreGraphics(coreElement: GraphNode): boolean {
        return coreElement.circle === this.coreElement.circle;
    }

    override getCoreCollection(): GraphNode[] {
        return this.coreElement.renderer.nodes;
    }

    override setCoreElement(coreElement: GraphNode | undefined): void {
        if (coreElement) {
            this.extendedText.coreElement = coreElement;
        }
        super.setCoreElement(coreElement);
    }

    protected override getCoreParentGraphics(coreElement: GraphNode): Graphics | null {
        return coreElement.circle;
    }

    override canBeAddedWithEngineOptions(): boolean {
        if (this.coreElement.type === "tag" && !this.instances.engine.getOptions().showTags) return false;
        if (this.coreElement.type === "attachment" && !this.instances.engine.getOptions().showAttachments) return false;
        if (this.coreElement.type === "unresolved" && this.instances.engine.getOptions().hideUnresolved) return false;

        return true;
    }


    // ================================ GETTERS ================================

    getID(): string {
        return this.coreElement.id;
    }

    // =============================== PIN NODES ===============================

    pin(): void {
        this.isPinned = true;
        this.pinnedPosition = { x: this.coreElement.x, y: this.coreElement.y };
        this.graphicsWrapper?.pin();
    }

    unpin(): void {
        this.isPinned = false;
        this.pinnedPosition = undefined;
        this.graphicsWrapper?.unpin();
    }

    // ============================= SELECT NODES ==============================

    select(): boolean {
        if (!this.coreElement.circle) return false;

        if (this.coreElement.circle.filters) {
            if (!this.coreElement.circle.filters.contains(this.instances.nodesSet.selectionFilter)) {
                this.coreElement.circle.filters.push(this.instances.nodesSet.selectionFilter);
            }
        }
        else {
            this.coreElement.circle.filters = [this.instances.nodesSet.selectionFilter];
        }

        return true;
    }

    unselect() {
        this.coreElement.circle?.filters?.remove(this.instances.nodesSet.selectionFilter);
    }

    // ============================= LINK ANIMATION ============================

    private addAnimationListener(): void {
        if (!this.instances.settings.animateDotsOnLinks) return;

        this.initLinksAnimation = this.initLinksAnimation.bind(this);
        this.coreElement.circle?.addListener('mouseenter', this.initLinksAnimation);
    }

    private removeAnimationListener(): void {
        this.coreElement.circle?.removeListener('mouseenter', this.initLinksAnimation);
    }

    private initLinksAnimation() {
        for (const target of Object.entries(this.coreElement.forward)) {
            if (!this.instances.renderer.nodes.find(node => node.id === target[0])) {
                continue;
            }
            const link = this.instances.linksSet.extendedElementsMap.get(getLinkID(target[1]));
            if (!link) {
                continue;
            }
            link.initAnimation();
        }
        for (const source of Object.entries(this.coreElement.reverse)) {
            if (!this.instances.renderer.nodes.find(node => node.id === source[0])) {
                continue;
            }
            const link = this.instances.linksSet.extendedElementsMap.get(getLinkID(source[1]));
            if (!link) {
                continue;
            }
            link.initAnimation();
        }
    }

    // ================================= FOCUS =================================

    toggleOpenInTab(open: boolean) {
        if (!this.coreElement.circle) return;

        if (open) {
            if (!this.coreElement.circle.filters) {
                this.coreElement.circle.filters = [];
            }
            if (!this.coreElement.circle.filters.contains(this.instances.nodesSet.openFilter)) {
                this.coreElement.circle.filters.push(this.instances.nodesSet.openFilter);
            }
        }
        else if (this.coreElement.circle.filters) {
            this.coreElement.circle.filters.remove(this.instances.nodesSet.openFilter);
        }
    }

    toggleIsSearchResult(isResult: boolean) {
        if (!this.coreElement.circle) return;

        if (isResult) {
            if (!this.coreElement.circle.filters) {
                this.coreElement.circle.filters = [];
            }
            if (!this.coreElement.circle.filters.contains(this.instances.nodesSet.searchResultFilter)) {
                this.coreElement.circle.filters.push(this.instances.nodesSet.searchResultFilter);
            }
        }
        else if (this.coreElement.circle.filters) {
            this.coreElement.circle.filters.remove(this.instances.nodesSet.searchResultFilter);
        }
    }

    flicker() {
        const circle = this.coreElement.circle;
        if (!circle) return;

        const flickerShape = new NodeShape(this.graphicsWrapper?.shape ?? ShapeEnum.CIRCLE);
        flickerShape.eventMode = "none";
        flickerShape.drawFill(this.instances.cssBridge.getSearchColor());
        flickerShape.zIndex = 100;
        flickerShape.alpha = 0;
        this.coreElement.renderer.hanger.addChild(flickerShape);

        let ascendant: boolean = true;
        const duration = 3e3;
        const startTime = Date.now();

        const flickerAlpha = () => {
            if (circle.destroyed || flickerShape.destroyed) return;

            const nextAlpha = flickerShape.alpha + (ascendant ? +0.07 : -0.07);
            flickerShape.position.set(circle.position.x, circle.position.y);
            flickerShape.scale.set(circle.scale.x * flickerShape.getDrawingResolution(), circle.scale.y * flickerShape.getDrawingResolution());
            if (nextAlpha < 0) {
                ascendant = true;
                flickerShape.alpha = 0;
            }
            else if (nextAlpha > 1) {
                ascendant = false;
                flickerShape.alpha = 1;
            }
            else {
                flickerShape.alpha = nextAlpha;
            }
            this.instances.renderer.changed();
            if (Date.now() - startTime < duration) {
                requestAnimationFrame(flickerAlpha);
            }
            else {
                flickerShape.destroy();
            }
        }

        const animationID = requestAnimationFrame(flickerAlpha);

        flickerShape.addEventListener("destroyed", () => {
            cancelAnimationFrame(animationID);
        });
        circle.addEventListener("destroyed", () => {
            cancelAnimationFrame(animationID);
        });
    }
}