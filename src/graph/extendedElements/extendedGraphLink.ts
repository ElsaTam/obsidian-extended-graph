import { OutlineFilter } from "@pixi/filter-outline";
import { GraphLink } from "obsidian-typings";
import { Container } from "pixi.js";
import * as Color from '../../colors/color-bits';
import {
    AnimatedDotOnCurve,
    AnimatedDotOnLine,
    CurveLinkGraphicsWrapper,
    ExtendedGraphArrow,
    ExtendedGraphElement,
    LineLinkGraphicsWrapper,
    LINK_KEY,
    LinkCurveGraphics,
    LinkCurveMultiTypesGraphics,
    LinkCurveSingleTypeGraphics,
    LinkLineMultiTypesGraphics,
    LinkText,
    LinkTextCurveMultiTypes,
    ExtendedGraphInstances,
    SettingQuery,
    LinkTextCurveSingleType,
    LinkTextLineMultiTypes,
    LinkTextLineSingleType,
    lengthSegment,
    pixiAddChild
} from "../../internal";


export class ExtendedGraphLink extends ExtendedGraphElement<GraphLink> {
    name: string;
    graphicsWrapper?: CurveLinkGraphicsWrapper | LineLinkGraphicsWrapper;
    animatedDot?: AnimatedDotOnLine | AnimatedDotOnCurve;
    hasChangedArrowShape: boolean = false;
    extendedArrow?: ExtendedGraphArrow;
    texts?: LinkText[];
    siblingLink?: ExtendedGraphLink;
    firstSibling: boolean;
    container?: Container;

    protected override additionalConstruct() {
        if (SettingQuery.needToChangeArrow(this.instances)) {
            this.extendedArrow = new ExtendedGraphArrow(this.instances, this);
        }
        this.firstSibling = true;
    }


    // ================================ LOADING ================================

    override init(): void {
        this.findSiblingLink();
        super.init();
        this.extendedArrow?.init();
        this.displayText();
        if (this.isEnabled && this.isAnyManagerDisabled()) {
            this.disable();
        }
    }

    private findSiblingLink(): void {
        if (this.instances.settings.enableFeatures[this.instances.type].links && this.instances.settings.curvedLinks) return;

        const siblingID = getLinkID({ source: { id: this.coreElement.target.id }, target: { id: this.coreElement.source.id } })
        this.siblingLink = this.instances.linksSet.extendedElementsMap.get(siblingID);
        if (this.siblingLink) {
            this.firstSibling = !!this.coreElement.line?.visible;

            // If the sibling was initialized first and still has no sibling
            // We need to mirror this relationship
            if (!this.siblingLink.siblingLink) {
                this.siblingLink.siblingLink = this;
                this.siblingLink.updateDisplayedTexts();
            }
        }
    }

    override modifyCoreElement(): void {
        this.modifyClearGraphics();
        this.changeCoreLinkThickness();
        this.proxyLine();
        this.createContainer();
        if ((this.isCurveLine()
            || this.graphicsWrapper?.pixiElement instanceof LinkLineMultiTypesGraphics
        ) && this.coreElement.line) {
            this.coreElement.line.renderable = false;
        }
    }

    coreClearGraphics?: () => void;
    private modifyClearGraphics(): void {
        if (this.coreClearGraphics) return;
        this.coreClearGraphics = this.coreElement.clearGraphics;
        this.coreElement.clearGraphics = (() => {

            ExtendedGraphInstances.proxysManager.unregisterProxy(this.coreElement.arrow);
            ExtendedGraphInstances.proxysManager.unregisterProxy(this.coreElement.line);
            if (this.coreClearGraphics) {
                this.coreElement.clearGraphics = this.coreClearGraphics;
                this.coreClearGraphics = undefined;
                this.coreElement.clearGraphics();
            }
        }).bind(this);
    }

    override restoreCoreElement(): void {
        if (this.coreClearGraphics) {
            this.coreElement.clearGraphics = this.coreClearGraphics;
            this.coreClearGraphics = undefined;
        }
        this.restoreCoreLinkThickness();
        ExtendedGraphInstances.proxysManager.unregisterProxy(this.coreElement.line);
        this.extendedArrow?.unload();
        this.removeContainer();
        if (this.coreElement.line) this.coreElement.line.renderable = true;
    }

    // =============================== UNLOADING ===============================

    override unload(): void {
        super.unload();
        this.removeTexts();
    }

    // =============================== GRAPHICS ================================


    protected override needGraphicsWrapper(): boolean {
        if (this.instances.settings.enableFeatures[this.instances.type]['links']
            && (this.instances.settings.curvedLinks
                || (this.instances.settings.allowMultipleLinkTypes &&
                    (this.instances.settings.allowMultipleLinkTypes || this.instances.settings.interactiveSettings[LINK_KEY].showOnGraph)))) {
            return true;
        }
        return false;
    }

    protected override createGraphicsWrapper(): void {
        if (!this.graphicsWrapper) {
            this.graphicsWrapper = (this.instances.settings.curvedLinks && this.instances.settings.curvedFactor !== 0)
                ? new CurveLinkGraphicsWrapper(this)
                : new LineLinkGraphicsWrapper(this);
            this.graphicsWrapper.createGraphics();
        }
    }

    private isCurveLine(): boolean {
        return this.graphicsWrapper?.pixiElement instanceof LinkCurveGraphics;
    }

    private isRendered(): boolean {
        return !!this.coreElement.line?.visible || (this.instances.settings.enableFeatures[this.instances.type]['links'] && this.instances.settings.curvedLinks);
    }

    // ========================= LINK SIZE (THICKNESS) =========================

    changeCoreLinkThickness(): void {
        if (this.coreElement.px
            && ExtendedGraphInstances.settings.enableFeatures[this.instances.type]['elements-stats']
            && ExtendedGraphInstances.settings.linksSizeFunction !== "default"
            && (
                (ExtendedGraphInstances.settings.enableFeatures[this.instances.type]['links']
                    && !this.instances.settings.curvedLinks)
                || (!ExtendedGraphInstances.settings.enableFeatures[this.instances.type]['links']))) {
            this.coreElement.px.scale.y = this.getThicknessScale();
        }
        else {
            this.restoreCoreLinkThickness();
        }
    }

    private restoreCoreLinkThickness(): void {
        if (this.coreElement.px) {
            this.coreElement.px.scale.y = 1;
        }
    }

    getThicknessScale(): number {
        if (!ExtendedGraphInstances.settings.enableFeatures[this.instances.type]['elements-stats']
            || ExtendedGraphInstances.settings.linksSizeFunction === "default"
        ) return 1;

        const calculator = this.instances.linksSizeCalculator ?? ExtendedGraphInstances.graphsManager.linksSizeCalculator;
        if (!calculator) return 1;
        if (!(this.coreElement.source.id in calculator.linksStats)) return 1;
        if (!(this.coreElement.target.id in calculator.linksStats[this.coreElement.source.id])) return 1;

        return calculator.linksStats[this.coreElement.source.id][this.coreElement.target.id].value;
    }

    // ============================= LINK CONTAINER =============================

    private createContainer(): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['links']
            || !this.instances.settings.outlineLinks
        ) return;

        let container: Container;
        if (this.siblingLink?.container) {
            container = this.siblingLink.container;
        }
        else {
            this.container = new Container();
            container = this.container;
        }
        if (this.coreElement.px) {
            this.coreElement.px.removeFromParent();
            pixiAddChild(container, this.coreElement.px);
            this.coreElement.px.addListener('destroyed', this.removeContainer);
        }
        if (this.coreElement.arrow) {
            this.coreElement.arrow.removeFromParent();
            pixiAddChild(container, this.coreElement.arrow);
            this.coreElement.arrow.addListener('destroyed', this.removeContainer);
        }
        if (this.graphicsWrapper?.pixiElement) {
            this.graphicsWrapper.pixiElement.removeFromParent();
            pixiAddChild(container, this.graphicsWrapper.pixiElement);
            this.graphicsWrapper.pixiElement.addListener('destroyed', this.removeContainer);
        }
        container.filters = [new OutlineFilter(
            1, this.instances.cssBridge.getPrimaryColor(), 0.1, 1, false
        )];
        pixiAddChild(this.coreElement.renderer.hanger, container);
    }

    private removeContainer(): void {
        if (!this.coreElement) return;

        if (this.coreElement.px) {
            this.coreElement.px.removeEventListener('destroyed', this.removeContainer);
        }
        if (this.coreElement.arrow) {
            this.coreElement.arrow.removeEventListener('destroyed', this.removeContainer);
        }
        if (this.graphicsWrapper?.pixiElement) {
            this.graphicsWrapper.pixiElement.removeEventListener('destroyed', this.removeContainer);
        }

        if (!this.container) return;

        for (const child of this.container.children.filter(c => !c.destroyed)) {
            pixiAddChild(this.coreElement.renderer.hanger, child);
        }
        this.container.destroy();
        this.container = undefined;
    }

    // ============================== LINK COLOR ===============================

    private proxyLine(): void {
        if (!SettingQuery.needToChangeLinkColor(this.instances)) return;
        const link = this.coreElement;
        if (link.line) {
            const getStrokeColor = this.getStrokeColor.bind(this);
            ExtendedGraphInstances.proxysManager.registerProxy<typeof link.line>(
                this.coreElement,
                'line',
                {
                    set(target, p, newValue, receiver) {
                        if (p === 'tint') {
                            newValue = getStrokeColor() ?? newValue;
                        }
                        return Reflect.set(target, p, newValue, receiver);
                    },
                }
            );
            link.line.on('destroyed', () => ExtendedGraphInstances.proxysManager.unregisterProxy(this.coreElement.line));
        }
    }

    isHighlighted(): boolean {
        if (this.instances.settings.noLineHighlight) return false;
        return this.coreElement.source === this.coreElement.renderer.getHighlightNode() || this.coreElement.target === this.coreElement.renderer.getHighlightNode();
    }

    getStrokeColor(overrideHighlight: boolean = false): Color.Color | undefined {
        if (!overrideHighlight && this.isHighlighted()) {
            return;
        }

        let color: Color.Color | undefined;

        // From type
        if (this.instances.settings.enableFeatures[this.instances.type]['links']
            && this.instances.settings.interactiveSettings[LINK_KEY].showOnGraph
        ) {
            const manager = this.managers.get(LINK_KEY);
            let type = this.getActiveType(LINK_KEY);
            if (!this.isCurveLine() && (!type || type === this.instances.settings.interactiveSettings[LINK_KEY].noneType) && this.siblingLink) {
                type = this.siblingLink.getActiveType(LINK_KEY);
            }
            if (manager && type && type !== this.instances.settings.interactiveSettings[LINK_KEY].noneType) {
                return manager.getColor(type);
            }
        }

        // From color stats
        if (ExtendedGraphInstances.settings.enableFeatures[this.instances.type]['elements-stats']
            && ExtendedGraphInstances.settings.linksColorFunction !== "default"
        ) {
            const calculator = this.instances.linksColorCalculator ?? ExtendedGraphInstances.graphsManager.linksColorCalculator;
            if (calculator) {
                if (this.coreElement.source.id in calculator.linksStats
                    && this.coreElement.target.id in calculator.linksStats[this.coreElement.source.id]
                ) {
                    const color = calculator.linksStats[this.coreElement.source.id][this.coreElement.target.id]?.value;
                    if (color) return color;
                }
                if (!this.isCurveLine() && this.siblingLink) {
                    if (this.siblingLink.coreElement.source.id in calculator.linksStats
                        && this.siblingLink.coreElement.target.id in calculator.linksStats[this.siblingLink.coreElement.source.id]
                    ) {
                        const color = calculator.linksStats[this.siblingLink.coreElement.source.id][this.siblingLink.coreElement.target.id]?.value;
                        if (color) return color;
                    }
                }
            }
        }

        // From source node
        if (this.instances.settings.enableFeatures[this.instances.type]['linksSameColorAsNode']) {
            if (this.instances.settings.enableFeatures[this.instances.type]['arrows']
                && this.instances.settings.invertArrows
            ) {
                color = this.coreElement.target.getFillColor().rgb;
            }
            else {
                color = this.coreElement.source.getFillColor().rgb;
            }
            return color;
        }
    }

    // ============================= LINK ANIMATION ============================

    initAnimation(): void {
        if (this.instances.renderer.dragNode && this.animatedDot) return;
        if (this.animatedDot) {
            this.animatedDot.destroy();
            this.animatedDot = undefined;
        }
        if (this.isCurveLine()) {
            this.animatedDot = new AnimatedDotOnCurve(this);
        }
        else {
            this.animatedDot = new AnimatedDotOnLine(this);
        }
        pixiAddChild(this.coreElement.renderer.hanger, this.animatedDot);
        this.animationLoop();
    }

    // Create a little dot that will move along the link, from source to target
    // while the source node is highlighted
    // Do that every frame with requestAnimationFrame
    async animate(): Promise<void> {
        this.coreElement.renderer.idleFrames = 0;
        if (this.isCurveLine()
            && this.graphicsWrapper?.pixiElement
        ) {
            this.animatedDot?.updateFrame((this.graphicsWrapper.pixiElement as LinkCurveGraphics).bezier);
        }
        else {
            const f = this.coreElement.renderer.nodeScale;
            const source = this.coreElement.source;
            const target = this.coreElement.target;
            const dir = { x: target.x - source.x, y: target.y - source.y };
            const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
            dir.x /= length;
            dir.y /= length;

            const start = {
                x: source.x + f * source.getSize() * dir.x,
                y: source.y + f * source.getSize() * dir.y
            };
            const end = {
                x: target.x - f * target.getSize() * dir.x,
                y: target.y - f * target.getSize() * dir.y
            };

            this.animatedDot?.updateFrame({
                P0: start,
                P1: { x: (start.x + end.x) * 0.5, y: (start.y + end.y) * 0.5 },
                P2: end
            });
        }
    }

    private animationLoop() {
        requestAnimationFrame(async () => {
            await this.animate();
            if ((this.coreElement.renderer.getHighlightNode() === this.coreElement.source
                || this.coreElement.renderer.getHighlightNode() === this.coreElement.target)
            ) {
                this.animationLoop();
            }
            else {
                this.animatedDot?.destroy();
                this.animatedDot = undefined;
            }
        });
    }


    // ============================== CORE ELEMENT =============================

    protected override isCoreElementUptodate(): boolean {
        return !!this.coreElement.line;
    }

    override isSameCoreElement(link: GraphLink): boolean {
        return link.source.id === this.coreElement.source.id && link.target.id === this.coreElement.target.id;
    }

    protected override isSameCoreGraphics(coreElement: GraphLink): boolean {
        return coreElement.line === this.coreElement.line;
    }

    override getCoreCollection(): GraphLink[] {
        return this.coreElement.renderer.links;
    }

    protected override getCoreParentGraphics(coreElement: GraphLink): Container | null {
        if (this.instances.settings.curvedLinks) {
            return coreElement.px;
        }
        else {
            return coreElement.line;
        }
    }

    override canBeAddedWithEngineOptions(): boolean {
        const extendedSource = this.instances.nodesSet.extendedElementsMap.get(this.coreElement.source.id);
        const extendedTarget = this.instances.nodesSet.extendedElementsMap.get(this.coreElement.target.id);
        if (!extendedSource || !extendedTarget) return false;

        return extendedSource.canBeAddedWithEngineOptions() && extendedTarget.canBeAddedWithEngineOptions();
    }

    // ================================ GETTERS ================================

    /*override isAnyManagerDisabled(): boolean {
        if (this.siblingLink) {
            return super.isAnyManagerDisabled() && ExtendedGraphElement.prototype.isAnyManagerDisabled.call(this.siblingLink);
        }
        return super.isAnyManagerDisabled();
    }*/

    override getID(): string {
        return getLinkID(this.coreElement);
    }

    override disableType(key: string, type: string): void {
        super.disableType(key, type);
        this.updateDisplayedTexts();
    }

    override enableType(key: string, type: string): void {
        super.enableType(key, type);
        this.updateDisplayedTexts();
    }

    override disable(): void {
        super.disable();
        this.extendedArrow?.unload();
        this.graphicsWrapper?.disconnect();

        if (this.texts) {
            for (const text of this.texts) {
                text.isRendered = false;
                text.visible = false;
            }
        }
    }


    // ================================== TEXT =================================


    private displayText() {
        if (!this.instances.settings.displayLinkTypeLabel || !this.coreElement.px?.renderable) return;

        if (!this.texts) {
            this.texts = [];
        }

        const types = this.getDisplayedTexts();
        for (const type of types) {
            let text = this.texts.find(t => t.text.text === type);

            // If the text is destroyed, remove it from the texts array
            if (text?.destroyed) {
                this.texts.remove(text);
            }

            // If the text is not found or destroyed, create a new one
            if (!text || text.destroyed) {
                if (this.graphicsWrapper?.pixiElement instanceof LinkCurveMultiTypesGraphics) {
                    text = new LinkTextCurveMultiTypes(type, this);
                }
                else if (this.graphicsWrapper?.pixiElement instanceof LinkCurveSingleTypeGraphics) {
                    text = new LinkTextCurveSingleType(type, this);
                }
                else if (this.graphicsWrapper?.pixiElement instanceof LinkLineMultiTypesGraphics) {
                    text = new LinkTextLineMultiTypes(type, this);
                }
                else {
                    text = new LinkTextLineSingleType(type, this);
                }
                this.texts.push(text);
            }

            text.isRendered = true;
            text.setDisplayedText(type);
            text.connect();
            text.updateFrame();
        }
    }

    private getDisplayedTexts(): string[] {
        // If we can display multiple types, we can also display multiple labels
        if (this.instances.settings.allowMultipleLinkTypes) {
            let types = [...this.getTypes(LINK_KEY)]
                .filter(type => this.managers.get(LINK_KEY)?.isActive(type)
                    && type !== this.instances.settings.interactiveSettings[LINK_KEY].noneType);
            if (!this.isCurveLine() && this.siblingLink) {
                let siblingTypes = [...this.siblingLink.getTypes(LINK_KEY)]
                    .filter(type => this.managers.get(LINK_KEY)?.isActive(type)
                        && type !== this.instances.settings.interactiveSettings[LINK_KEY].noneType);
                types = [...new Set([...types, ...siblingTypes])];
            }
            return types;
        }
        // Otherwise, we just display the currently active type
        else {
            let activeType = this.getActiveType(LINK_KEY);
            if (!activeType || activeType === this.instances.settings.interactiveSettings[LINK_KEY].noneType) {
                if (this.isCurveLine()) {
                    return [];
                }

                activeType = this.siblingLink?.getActiveType(LINK_KEY);
                if (!activeType || activeType === this.instances.settings.interactiveSettings[LINK_KEY].noneType) {
                    return [];
                }
            }
            return [activeType];
        }
    }

    private updateDisplayedTexts() {
        if (!this.texts) return;
        let activeTypes = this.getDisplayedTexts();
        if (this.instances.settings.allowMultipleLinkTypes) {
            for (const type of activeTypes) {
                let text = this.texts.find(t => t.text.text === type);
                if (!text) {
                    continue;
                }
                text.setDisplayedText(type);
                text.updateTextColor();
            }
        }
        else {
            if (activeTypes.length === 0) return;
            this.texts[0].setDisplayedText(activeTypes[0]);
            this.texts[0].applyCSSChanges();
        }
    }

    hideTextsBasedOnLength() {
        if (!this.texts || !this.isEnabled || !this.instances.settings.allowMultipleLinkTypes) return;

        const linkLength = lengthSegment(
            1,
            this.coreElement.source.circle?.position ?? { x: 0, y: 0 },
            this.coreElement.target.circle?.position ?? { x: 0, y: 0 }
        );
        // const minSegmentLength = 110;
        const visibleTexts = this.texts.filter(text => this.instances.linksSet.managers.get(LINK_KEY)?.isActive(text.text.text));
        const segmentLength = linkLength / visibleTexts.length;
        let i = 0;
        for (const text of this.texts) {
            if (visibleTexts.contains(text)) {
                if (Math.floor((i - segmentLength) / 110) < Math.floor(i / 110)) {
                    text.isRendered = true;
                    text.updateFrame();
                }
                else {
                    text.isRendered = false;
                    text.visible = false;
                }
                i += segmentLength;
            }
            else {
                text.isRendered = false;
                text.visible = false;
            }
        }
    }

    private removeTexts() {
        if (!this.texts) return;
        for (const text of this.texts) {
            text.removeFromParent();
            text.destroy();
        }
        this.texts = undefined;
    }
}

export function getLinkID(link: { source: { id: string }, target: { id: string } }): string {
    return link.source.id + "--to--" + link.target.id;
}