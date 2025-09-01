import { IDestroyOptions, Graphics } from "pixi.js";
import * as Color from '../../../colors/color-bits';
import { ExtendedGraphLink, hex2int, InteractiveManager, lengthSegment, LINK_KEY, LinkArrow, ManagerGraphics, pixiAddChild, pixiColor2int, smoothColorChange } from "../../../internal";


export class LinkLineMultiTypesGraphics extends Graphics implements ManagerGraphics {
    manager: InteractiveManager;
    types: Set<string>;
    name: string;
    hasFaded: boolean;
    color: Color.Color;
    extendedLink: ExtendedGraphLink;
    arrow: LinkArrow | null;
    activeType: string | undefined;
    typesPositions: Record<string, { position: { x: number, y: number }, length: number }> = {};

    constructor(manager: InteractiveManager, types: Set<string>, name: string, link: ExtendedGraphLink) {
        super();
        this.eventMode = "none";
        this.manager = manager;
        this.types = types;
        this.name = "line:" + name;
        this.extendedLink = link;
        this.hasFaded = !this.extendedLink.instances.settings.fadeInElements;
        this.updateValues();
    }

    updateValues(): void {
        this.activeType = this.extendedLink.getActiveType(this.manager.name);
        if (!this.activeType) return;
        const overrideColor = this.extendedLink.getStrokeColor();
        if (overrideColor !== undefined) {
            this.color = overrideColor;
        }
        else if (this.extendedLink.instances.settings.interactiveSettings[this.manager.name].showOnGraph) {
            this.color = this.manager.getColor(this.activeType);
        }
        else if (this.extendedLink.coreElement.line) {
            this.color = pixiColor2int(this.extendedLink.coreElement.line.tint);
        }
        else {
            this.color = this.extendedLink.coreElement.renderer.colors.line.rgb;
        }
        if (this.extendedLink.isEnabled) {
            this.redraw();
        }
    }

    private initArrow() {
        if (this.destroyed) return;
        this.arrow = new LinkArrow(this.extendedLink);
        pixiAddChild(this, this.arrow);
    }

    protected redraw(): void {
        if (!this.activeType && this.arrow) {
            this.arrow.clear();
            this.arrow.destroy();
            this.arrow = null;
        }
        this.updateFrame();
    }

    updateFrame(): void {
        this.typesPositions = {};
        if (this.destroyed) return;

        this.clear();
        if (!this.activeType) {
            this.arrow?.clear();
            return;
        }

        const renderer = this.extendedLink.coreElement.renderer;
        const link = this.extendedLink.coreElement;

        const inverted = this.extendedLink.instances.settings.enableFeatures[this.extendedLink.instances.type]['arrows'] && this.extendedLink.instances.settings.invertArrows;
        const target = inverted ? link.source : link.target;
        const source = inverted ? link.target : link.source;

        if (!target.circle || !source.circle) {
            this.destroy();
            //this.extendedLink.disable();
            return;
        }

        const f = renderer.nodeScale;

        const P0 = { x: source.x, y: source.y }; // Center of source
        const P2 = { x: target.x, y: target.y }; // Center ot target
        const dir = { x: P2.x - P0.x, y: P2.y - P0.y }; // Direction vector
        // Normalize the direction vector
        const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
        dir.x /= length;
        dir.y /= length;

        let P0_ = { // point on the border of the source node, along the line
            x: P0.x + f * source.getSize() * dir.x,
            y: P0.y + f * source.getSize() * dir.y,
        }
        let P2_ = { // point on the border of the target node, along the line
            x: P2.x - f * target.getSize() * dir.x,
            y: P2.y - f * target.getSize() * dir.y,
        }

        const activeTypes = [...this.types].filter(type => this.manager.isActive(type));
        // If the link has a sibling link, we concatenate its active types
        if (this.extendedLink.siblingLink) {
            const siblingActiveTypes = [...this.extendedLink.siblingLink.types.get(LINK_KEY) ?? []].filter(type => this.manager.isActive(type));
            for (const type of siblingActiveTypes) {
                if (!activeTypes.includes(type)) {
                    activeTypes.unshift(type);
                }
            }
        }

        let arrowColor: Color.Color | undefined;
        const thickness = this.extendedLink.getThicknessScale() * renderer.fLineSizeMult / renderer.scale;
        if (this.extendedLink.isHighlighted()) {
            this.lineStyle({ width: thickness, color: "white" });
            this.moveTo(P0_.x, P0_.y).lineTo(P2_.x, P2_.y);
            this.tint = (
                this.extendedLink.coreElement.line?.worldVisible
                    ? this.extendedLink.coreElement.line.tint
                    : this.extendedLink.siblingLink?.coreElement.line?.tint
            ) ?? smoothColorChange(this.tint as Color.Color, this.extendedLink.coreElement.renderer.colors.lineHighlight.rgb);
            if (this.extendedLink.instances.settings.displayLinkTypeLabel) {
                if (activeTypes.length === 1) {
                    this.setTypePosition(activeTypes[0], P0_, P2_);
                }
                else if (activeTypes.length > 0) {
                    const step = 1 / activeTypes.length;
                    let i = 0;
                    let previousPosition = P0_;
                    for (const type of activeTypes) {
                        const t = step * (1 + i);
                        const newPosition = {
                            x: (1 - t) * P0_.x + t * P2_.x,
                            y: (1 - t) * P0_.y + t * P2_.y
                        }
                        this.setTypePosition(type, previousPosition, newPosition);
                        previousPosition = newPosition;
                        ++i;
                    }
                }
            }
        }
        else {
            arrowColor = this.color;
            // We draw the line only if the link has no sibling already drawn
            if (this.extendedLink.firstSibling || !this.extendedLink.siblingLink?.getActiveType(LINK_KEY)) {
                // If there is only one active type, we draw a single line
                if (activeTypes.length === 1) {
                    this.lineStyle({ width: thickness, color: "white" });
                    this.moveTo(P0_.x, P0_.y).lineTo(P2_.x, P2_.y);
                    this.tint = this.color;
                    this.setTypePosition(activeTypes[0], P0_, P2_);
                }
                else if (activeTypes.length > 0) {
                    this.tint = "white";
                    // length of the line
                    const step = 1 / activeTypes.length;
                    let i = 0;
                    this.moveTo(P0_.x, P0_.y);
                    let previousPosition = P0_;
                    for (const type of activeTypes) {
                        const t = step * (1 + i);

                        const color = this.extendedLink.instances.settings.interactiveSettings[LINK_KEY].showOnGraph ? this.manager.getColor(type) : this.color;
                        this.lineStyle({ width: thickness, color: color });
                        const newPosition = {
                            x: (1 - t) * P0_.x + t * P2_.x,
                            y: (1 - t) * P0_.y + t * P2_.y
                        }
                        this.lineTo(
                            newPosition.x,
                            newPosition.y
                        );
                        this.setTypePosition(type, previousPosition, newPosition);
                        previousPosition = newPosition;
                        ++i;
                    }
                    if (this.extendedLink.instances.settings.interactiveSettings[LINK_KEY].showOnGraph) {
                        arrowColor = this.manager.getColor(activeTypes[activeTypes.length - 1]);
                    }
                }
                if (this.extendedLink.instances.settings.enableFeatures[this.extendedLink.instances.type]['arrows']
                    && this.extendedLink.instances.settings.arrowColorBool
                    && this.extendedLink.instances.settings.arrowColor !== "") {
                    arrowColor = hex2int(this.extendedLink.instances.settings.arrowColor);
                }
            }
        }

        if (link.line && this.hasFaded) {
            this.alpha = link.line.alpha;
        }

        // Arrow
        if (link.arrow && link.arrow.visible) {
            if (!this.arrow) {
                this.initArrow();
            }
            if (this.arrow) {
                this.arrow.update(
                    arrowColor ?? this.tint,
                    P2_,
                    -Math.atan(- (P2_.y - P0_.y) / (P2_.x - P0_.x)) + (P0.x > P2_.x ? Math.PI : 0),
                )
            }
        }
        else {
            this.arrow?.removeFromParent();
            this.arrow?.clear();
            this.arrow?.destroy();
            this.arrow = null;
        }
    }

    private setTypePosition(type: string, A: { x: number, y: number }, B: { x: number, y: number }): void {
        this.typesPositions[type] = {
            position: {
                x: (A.x + B.x) * 0.5,
                y: (A.y + B.y) * 0.5,
            },
            length: lengthSegment(1, A, B)
        };
    }

    override destroy(options?: IDestroyOptions): void {
        if (this.extendedLink.coreElement.arrow) this.extendedLink.coreElement.arrow.renderable = true;

        if (this.destroyed) return;
        super.destroy(options);
    }

    clearGraphics(): void {
        if (this.destroyed) return;

        this.arrow?.clear();
        this.clear();
        this.destroy({ children: true });
        this.removeFromParent();
    }

    override clear(): this {
        if (this.destroyed) return this;
        return super.clear();
    }

    toggleType(type: string, enable: boolean): void {
        this.updateValues();
    }
}