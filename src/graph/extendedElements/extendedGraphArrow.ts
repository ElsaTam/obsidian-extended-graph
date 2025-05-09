import { Graphics } from "pixi.js"
import { GraphLink } from "obsidian-typings";
import { ExtendedGraphLink, GraphInstances, PluginInstances, SettingQuery } from "src/internal";

export class ExtendedGraphArrow {
    extendedLink: ExtendedGraphLink;
    instances: GraphInstances;

    hasChangedArrowShape: boolean = false;

    constructor(instances: GraphInstances, extendedElement: ExtendedGraphLink) {
        this.instances = instances;
        this.extendedLink = extendedElement;
    }

    init() {
        this.modifyCoreElement();
    }

    modifyCoreElement() {
        this.proxyArrow();
        this.createFlatArrow();
    }

    unload(): void {
        PluginInstances.proxysManager.unregisterProxy(this.extendedLink.coreElement.arrow);
        this.resetArrowShape();
    }

    private proxyArrow(): void {
        const needToColorArrows = SettingQuery.needToChangeLinkColor(this.instances);
        if (!this.instances.settings.enableFeatures[this.instances.type]['arrows']
            || (!this.instances.settings.invertArrows
                && !needToColorArrows
            )) return;


        const link = this.extendedLink.coreElement;
        if (link.arrow) {

            let modifyArrow: (link: GraphLink, target: Graphics, prop: string | symbol, value: any) => boolean;
            if (needToColorArrows && this.instances.settings.invertArrows) {
                modifyArrow = (link: GraphLink, target: Graphics, prop: string | symbol, value: any) => {
                    return this.invertArrow(link, target, prop, value) || this.colorArrow(target, prop, value);
                };
            }
            else if (this.instances.settings.invertArrows) {
                modifyArrow = (link: GraphLink, target: Graphics, prop: string | symbol, value: any) => {
                    return this.invertArrow(link, target, prop, value);
                };
            }
            else {
                modifyArrow = (link: GraphLink, target: Graphics, prop: string | symbol, value: any) => {
                    return this.colorArrow(target, prop, value);
                };
            }
            modifyArrow = modifyArrow.bind(this);

            PluginInstances.proxysManager.registerProxy<typeof link.arrow>(
                this.extendedLink.coreElement,
                "arrow",
                {
                    set(target, prop, value, receiver) {
                        const modified = modifyArrow(link, target, prop, value);
                        return modified ? true : Reflect.set(target, prop, value, receiver);
                    }
                }
            );
        }
    }

    private colorArrow(target: Graphics, prop: string | symbol, value: any): boolean {
        if (prop === "tint") {
            if (this.extendedLink.coreElement.line?.worldVisible) {
                target.tint = this.extendedLink.getStrokeColor() ?? value;
            }
            else if (this.extendedLink.siblingLink?.coreElement.line?.worldVisible) {
                target.tint = this.extendedLink.siblingLink.getStrokeColor() ?? value;
            }
            else {
                target.tint = value;
            }
            return true;
        }
        return false;
    }

    private invertArrow(link: GraphLink, target: Graphics, prop: string | symbol, value: any): boolean {
        // Place the arrow at the source rather than the target
        if (prop === "x" || prop === "y") {
            var c2c_x = link.target.x - link.source.x
                , c2c_y = link.target.y - link.source.y
                , diag = Math.sqrt(c2c_x * c2c_x + c2c_y * c2c_y)
                , source_r = link.source.getSize() * link.renderer.nodeScale;

            if (prop === "x") {
                target.x = link.source.x + c2c_x * source_r / diag;
            }
            else {
                target.y = link.source.y + c2c_y * source_r / diag;
            }
            return true;
        }
        // Flip the arrow
        else if (prop === "rotation") {
            target.rotation = value + Math.PI;
            return true;
        }
        return false
    }

    private createFlatArrow(): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['arrows'] || !this.instances.settings.flatArrows) return;
        const arrow = this.extendedLink.coreElement.arrow;
        if (!arrow) return;
        arrow.clear();
        arrow.beginFill(16777215);
        arrow.moveTo(0, 0);
        arrow.lineTo(-4, -2);
        arrow.lineTo(-4, 2);
        arrow.lineTo(0, 0);
        arrow.endFill();
        this.hasChangedArrowShape = true;
    }

    private resetArrowShape(): void {
        if (!this.hasChangedArrowShape) return;
        const arrow = this.extendedLink.coreElement.arrow;
        if (!arrow || arrow.destroyed) return;
        arrow.clear();
        arrow.beginFill(16777215);
        arrow.moveTo(0, 0);
        arrow.lineTo(-4, -2);
        arrow.lineTo(-3, 0);
        arrow.lineTo(-4, 2);
        arrow.lineTo(0, 0);
        arrow.endFill();
    }
}