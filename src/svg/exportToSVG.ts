import * as Color from '../colors/color-bits';
import { GraphEngine, GraphLink, GraphNode, GraphRenderer } from "obsidian-typings";
import {
    CurveLinkGraphicsWrapper,
    ExportSVGOptionModal,
    ExportSVGOptions,
    ExtendedGraphFileNode,
    ExtendedGraphLink,
    ExtendedGraphNode,
    FOLDER_KEY,
    FolderBlob,
    getLinkID,
    getSVGNode,
    GraphInstances,
    int2hex,
    NodeShape,
    pixiColor2hex,
    pixiColor2int,
    ExtendedGraphInstances,
    polar2Cartesian,
    t,
    textColor,
    CSSBridge
} from "../internal";
import { Notice } from 'obsidian';

export abstract class ExportGraphToSVG {
    svg: SVGSVGElement;
    renderer: GraphRenderer;
    backgroundColor: Color.Color;
    backgroundColorHex: string;

    groupLinks: SVGElement;
    groupNodes: SVGElement;
    groupText?: SVGElement;
    groupFolders?: SVGElement;

    fontSize: number = 20;

    options: ExportSVGOptions;

    constructor(renderer: GraphRenderer) {
        this.renderer = renderer;
        this.backgroundColor = CSSBridge.backgroundColor;
        this.backgroundColorHex = int2hex(this.backgroundColor);
    }

    protected createSVG() {
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

        // Folders
        if (this.options.showFolders) {
            this.groupFolders = getSVGNode('g', { id: 'folders' });
            this.addFolders();
            this.svg.appendChild(this.groupFolders);
        }

        // Links
        this.groupLinks = getSVGNode('g', { id: 'links' });
        this.addLinks();
        this.svg.appendChild(this.groupLinks);

        // Nodes
        this.groupNodes = getSVGNode('g', { id: 'nodes' });
        this.addNodes();
        this.svg.appendChild(this.groupNodes);

        // Text
        if (this.options.showNodeNames) {
            this.groupText = getSVGNode('g', { id: 'texts' });
            this.addNodeNames();
            this.svg.appendChild(this.groupText);
        }

        const { xMin, xMax, yMin, yMax } = this.getViewBox();
        this.svg.setAttribute('viewBox', `${xMin} ${yMin} ${xMax - xMin} ${yMax - yMin}`);

        // Background
        const w = xMax - xMin;
        const h = yMax - yMin;
        this.svg.prepend(getSVGNode('rect', {
            width: w * 1.1,
            height: h * 1.1,
            x: xMin - w * 0.05,
            y: yMin - h * 0.05,
            fill: this.backgroundColorHex
        }));

        // Defs
        const defs = this.getDefs();
        if (defs) {
            this.svg.prepend(defs);
        }
    }

    protected getDefs(): SVGElement | undefined {
        return;
    }

    private addNodes(): void {
        const visibleNodes = this.getVisibleNodes();
        for (const node of visibleNodes) {
            const shape = this.getSVGForNode(node);
            if (!shape) continue;
            this.groupNodes.appendChild(shape);
        }
    }

    private addLinks(): void {
        const visibleLinks = this.getVisibleLinks();
        for (const extendedLink of visibleLinks) {
            const link = this.getSVGForLink(extendedLink);
            if (!link) continue;
            this.groupLinks.appendChild(link);
        }
    }

    private addNodeNames(): void {
        if (!this.groupText) return;
        const visibleNodes = this.getVisibleNodes();
        for (const node of visibleNodes) {
            const text = this.getSVGForText(node);
            if (text) {
                this.groupText.appendChild(text);
            }
        }
    }

    protected addFolders(): void { };

    protected isNodeInVisibleArea(node: GraphNode): boolean {
        if (!this.options.onlyVisibleArea) return true;
        const viewport = structuredClone(this.renderer.viewport);
        const size = node.getSize();
        return node.x + size >= viewport.left
            && node.x - size <= viewport.right
            && node.y + size >= viewport.top
            && node.y - size <= viewport.bottom;
    }

    protected isLinkInVisibleArea(link: GraphLink): boolean {
        if (!this.options.onlyVisibleArea) return true;
        return this.isNodeInVisibleArea(link.source) && this.isNodeInVisibleArea(link.target);
    }

    protected getSVGForText(node: ExtendedGraphNode | GraphNode): SVGElement | null {
        if (!this.options.showNodeNames) return null;

        const coreNode = this.getCoreNode(node);

        const text = getSVGNode('text', {
            class: 'node-name',
            id: 'text:' + node.id,
            x: coreNode.x,
            y: coreNode.y + coreNode.getSize() + this.fontSize + 4,
            style: `font-size: ${this.fontSize}px; fill: ${coreNode.text?.style.fill ?? textColor(this.backgroundColor)};`,
            'text-anchor': "middle"
        });
        text.textContent = this.getText(coreNode);

        return text;
    }

    protected getText(node: GraphNode): string {
        return node.getDisplayText();
    }

    private getViewBox(): { xMin: number, xMax: number, yMin: number, yMax: number } {
        document.body.appendChild(this.svg);
        const { xMin, xMax, yMin, yMax } = Array.from(this.svg.children).reduce((acc: any, el) => {
            const { x, y, width, height } = (el as SVGGraphicsElement).getBBox();
            if (!acc.xMin || x < acc.xMin) acc.xMin = x;
            if (!acc.xMax || x + width > acc.xMax) acc.xMax = x + width;
            if (!acc.yMin || y < acc.yMin) acc.yMin = y;
            if (!acc.yMax || y + height > acc.yMax) acc.yMax = y + height;
            return acc;
        }, {});
        document.body.removeChild(this.svg);
        return { xMin, xMax, yMin, yMax };
    }

    private getCoreNode(node: ExtendedGraphNode | GraphNode): GraphNode {
        return ('coreElement' in node) ? node.coreElement : node;
    }

    async toClipboard(): Promise<void> {
        try {
            const modal: ExportSVGOptionModal = this.getModal();

            modal.onClose = (async function () {
                if (modal.isCanceled) return;
                this.options = ExtendedGraphInstances.settings.exportSVGOptions;

                // Create SVG
                this.createSVG();

                //this.renderer.zoomTo(scale, center);
                const svgString = this.toString();

                // Copy SVG as Image
                if (this.options.asImage) {
                    const blob = new Blob([svgString], { type: "image/svg+xml" });
                    await navigator.clipboard.write([
                        new ClipboardItem({
                            "image/svg+xml": blob
                        }),
                    ]);
                }
                // Copy SVG as text
                else {
                    await navigator.clipboard.writeText(svgString);
                }

                new Notice(t("notices.svgCopied"));
            }).bind(this);

            modal.open();
        } catch (err) {
            console.error(err.name, err.message);
        }
    }

    private toString(): string {
        const s = new XMLSerializer();
        return s.serializeToString(this.svg);
    }

    protected abstract getSVGForNode(node: ExtendedGraphNode | GraphNode): SVGElement;
    protected abstract getSVGForLink(link: ExtendedGraphLink | GraphLink): SVGElement;
    protected abstract getVisibleLinks(): ExtendedGraphLink[] | GraphLink[];
    protected abstract getVisibleNodes(): ExtendedGraphNode[] | GraphNode[];
    protected abstract getModal(): ExportSVGOptionModal;
}

export class ExportExtendedGraphToSVG extends ExportGraphToSVG {
    instances: GraphInstances;

    constructor(instances: GraphInstances) {
        super(instances.renderer);
        this.instances = instances;
    }

    protected override getDefs(): SVGElement | undefined {
        if (this.options.useModifiedNames && this.instances.settings.addBackgroundToName) {
            const defs = getSVGNode('defs');
            const filter = getSVGNode('filter', {
                'x': '0',
                'y': '0',
                'width': '1',
                'height': '1',
                'id': 'textBackground'
            });
            const feFlood = getSVGNode('feFlood', {
                'flood-color': this.backgroundColorHex,
                'result': "bg"
            });
            const feMerge = getSVGNode('feMerge');
            const feMergeNode1 = getSVGNode('feMergeNode', { in: 'bg' });
            const feMergeNode2 = getSVGNode('feMergeNode', { in: 'SourceGraphic' });
            feMerge.appendChild(feMergeNode1);
            feMerge.appendChild(feMergeNode2);
            filter.appendChild(feFlood);
            filter.appendChild(feMerge);
            defs.appendChild(filter);
            return defs;
        }
    }

    protected override getText(node: GraphNode): string {
        if (this.options.useModifiedNames && node.text) {
            return node.text.text;
        }
        return super.getText(node);
    }

    protected override getSVGForText(node: ExtendedGraphNode): SVGElement | null {
        const text = super.getSVGForText(node);
        const coreText = node.coreElement.text;
        const size = node.coreElement.getSize();
        if (text && this.options.useModifiedNames) {
            if (this.instances.settings.addBackgroundToName) {
                text.setAttribute('filter', "url(#textBackground)");
            }
            if (coreText) {
                const fontFamily = (typeof coreText.style.fontFamily === "string")
                    ? coreText.style.fontFamily.split(',')[0].trim()
                    : coreText.style.fontFamily[0].split(',')[0].trim();
                text.style.setProperty('font-family', fontFamily);
            }
            if (this.instances.settings.nameVerticalOffset !== 0 && coreText) {
                const offset = this.instances.settings.nameVerticalOffset;
                let y = parseInt(text.getAttribute('y') ?? node.coreElement.y.toString());
                if (offset < -5 && offset > -105) {
                    const newOffset = -5 + ((5 + offset) * size / 50);
                    y = y + newOffset;
                }
                else if (offset <= -105) {
                    const newOffset = (100 + offset) + (-2 * size);
                    y = y + newOffset;
                }
                else {
                    y = y + offset;
                }
                text.setAttribute('y', (y - this.fontSize * 1.5).toString());
            }
        }
        return text;
    }

    protected override addFolders(): void {
        if (!this.groupFolders) return;
        const folderBlobs = this.instances.foldersSet;
        const manager = folderBlobs?.managers.get(FOLDER_KEY);
        if (!manager) return;
        const visibleFolders = this.getVisibleFolders();
        for (const blob of visibleFolders) {
            const box = this.getSVGForFolder(blob);
            this.groupFolders.appendChild(box);
        }
    }

    protected override getSVGForNode(extendedNode: ExtendedGraphNode): SVGElement {
        const group = getSVGNode('g', {
            class: 'node-group',
            id: 'node:' + extendedNode.id
        });

        const nodeShape = this.getSVGForNodeShape(extendedNode);
        group.appendChild(nodeShape);

        if (this.options.showArcs) {
            const arcs = this.getSVGForArcs(extendedNode);
            if (arcs) group.appendChild(arcs);
        }

        return group;
    }

    private getSVGForNodeShape(extendedNode: ExtendedGraphNode): SVGElement {
        const node = extendedNode.coreElement;
        const size = node.getSize();

        if (extendedNode.icon?.svg && this.options.showIcons) {
            const shape = extendedNode.icon.svg;
            shape.style.stroke = int2hex(node.getFillColor().rgb);
            shape.style.fill = this.backgroundColorHex;
            const g = getSVGNode('g', {
                class: 'node-shape',
                transform: `translate(${node.x - size} ${node.y - size}) scale(${size / shape.width.baseVal.value * 2})`,
            });
            g.appendChild(shape);
            return g;
        }
        else if (extendedNode.icon?.emoji && this.options.showIcons) {
            const fontSize = size * 2;
            const text = getSVGNode('text', {
                class: 'node-name',
                id: 'text:' + node.id,
                x: extendedNode.coreElement.x,
                y: extendedNode.coreElement.y + fontSize * 0.5,
                style: `font-size: ${fontSize}px;`,
                'text-anchor': "middle"
            });
            text.textContent = extendedNode.icon.emoji;
            return text;
        }
        else if (this.options.useNodesShapes && extendedNode.graphicsWrapper) {
            const g = getSVGNode('g', {
                class: 'node-shape',
                transform: `translate(${node.x - size} ${node.y - size}) scale(${size / NodeShape.RADIUS})`,
                fill: int2hex(node.getFillColor().rgb)
            });
            const shape = NodeShape.getInnerSVG(extendedNode.graphicsWrapper?.shape);
            g.appendChild(shape);
            return g;
        }
        else {
            const circle = getSVGNode('circle', {
                class: 'node-shape',
                cx: node.x,
                cy: node.y,
                r: size,
                fill: int2hex(node.getFillColor().rgb)
            });
            return circle;
        }
    }

    private getSVGForArcs(extendedNode: ExtendedGraphNode): SVGElement | null {
        const node = extendedNode.coreElement;
        if (node.type === "tag") return null;
        const size = node.getSize();
        const cx = node.x;
        const cy = node.y;

        const group = getSVGNode('g', {
            class: 'arcs'
        });

        for (const [key, manager] of extendedNode.managers) {
            const arcs = (extendedNode as ExtendedGraphFileNode).graphicsWrapper?.managerGraphicsMap?.get(key);
            if (!arcs) continue;

            const circleGroup = getSVGNode('g', {
                class: 'arcs-circle'
            });

            for (const [type, arc] of arcs.graphics) {
                const alpha = arc.graphic.alpha;

                const radius = arcs.radius / NodeShape.RADIUS * size;
                const thickness = arcs.thickness / NodeShape.RADIUS * size;

                const start = polar2Cartesian(cx, cy, radius, arc.endAngle);
                const end = polar2Cartesian(cx, cy, radius, arc.startAngle);
                if (start.x === end.x && start.y === end.y) {
                    const arcSVG = getSVGNode('circle', {
                        class: 'arc arc-' + type,
                        cx: node.x,
                        cy: node.y,
                        r: radius,
                        opacity: alpha,
                        'stroke-width': thickness,
                        'stroke': int2hex(arc.color),
                        'fill': 'none',
                    });
                    circleGroup.appendChild(arcSVG);
                }
                else {
                    const largeArcFlag = arc.endAngle - arc.startAngle <= Math.PI ? "0" : "1";
                    const path = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
                    const arcSVG = getSVGNode('path', {
                        class: 'arc arc-' + type,
                        d: path,
                        opacity: alpha,
                        'stroke-width': thickness,
                        'stroke': int2hex(arc.color),
                        'fill': 'none',
                    });
                    circleGroup.appendChild(arcSVG);
                }
            }

            group.appendChild(circleGroup);
        }

        return group;
    }

    protected getSVGForFolder(folderBlob: FolderBlob): SVGElement {
        const BBox = folderBlob.BBox;
        const group = getSVGNode('g', {
            class: 'folder-group',
            id: 'folder:' + folderBlob.path
        });
        const box = getSVGNode('rect', {
            class: 'folder-box',
            x: BBox.left,
            y: BBox.top,
            height: BBox.bottom - BBox.top,
            width: BBox.right - BBox.left,
            rx: folderBlob.folderStyle.radius,
            fill: int2hex(folderBlob.color),
            stroke: int2hex(folderBlob.color),
            'stroke-width': folderBlob.folderStyle.borderWidth,
            'fill-opacity': folderBlob.folderStyle.fillOpacity,
            'stroke-opacity': folderBlob.folderStyle.strokeOpacity,
        });
        const fontSize = 14;
        const text = getSVGNode('text', {
            class: 'folder-name',
            x: (BBox.left + BBox.right) / 2,
            y: BBox.top + fontSize + 2,
            fill: int2hex(folderBlob.color),
            'text-anchor': "middle",
            style: `font-size: ${fontSize}px;`
        });
        text.textContent = folderBlob.path;

        group.appendChild(box);
        group.appendChild(text);
        return group;
    }

    protected override getSVGForLink(extendedLink: ExtendedGraphLink): SVGElement {
        const link = extendedLink.coreElement;

        let path: string;
        if (this.options.useCurvedLinks) {
            const P0 = { x: link.source.x, y: link.source.y };
            const P2 = { x: link.target.x, y: link.target.y };
            const N = { x: -(P2.y - P0.y), y: (P2.x - P0.x) };
            const M = { x: (P2.x + P0.x) * 0.5, y: (P2.y + P0.y) * 0.5 };
            const P1 = { x: M.x + 0.25 * N.x, y: M.y + 0.25 * N.y };

            path = `M ${P0.x} ${P0.y} C ${P1.x} ${P1.y}, ${P2.x} ${P2.y}, ${P2.x} ${P2.y}`;
        }
        else {
            path = `M ${link.source.x} ${link.source.y} L ${link.target.x} ${link.target.y}`;
        }
        const color: Color.Color = extendedLink.graphicsWrapper ? extendedLink.graphicsWrapper.pixiElement.color : link.line ? pixiColor2int(link.line.tint) : 0;
        const width: number = this.instances.renderer.fLineSizeMult * 2;
        const opacity: number = extendedLink.graphicsWrapper ? extendedLink.graphicsWrapper.pixiElement.alpha : link.line ? link.line.alpha : 0.6;
        const line = getSVGNode('path', {
            class: 'link',
            id: 'link:' + getLinkID(link),
            d: path,
            stroke: int2hex(color),
            'stroke-width': width,
            opacity: opacity,
            fill: 'none',
        });

        let arrow: SVGElement | undefined;
        if (this.instances.renderer.fShowArrow) {
            const xOffset = 1;
            const path = this.options.useModifiedArrows && this.instances.settings.flatArrows
                ? `M ${0 + xOffset} 0 L ${-4 + xOffset} -2 L ${-4 + xOffset} 2 Z`
                : `M ${0 + xOffset} 0 L ${-4 + xOffset} -2 L ${-3 + xOffset} 0 L ${-4 + xOffset} 2 Z`;
            const arrowGraphics = this.options.useCurvedLinks ? (extendedLink.graphicsWrapper as CurveLinkGraphicsWrapper)?.pixiElement.arrow : extendedLink.coreElement.arrow;
            if (arrowGraphics) {
                arrow = getSVGNode('path', {
                    id: `arrow:${extendedLink.id}`,
                    d: path,
                    fill: int2hex(color),
                    transform: `translate(${arrowGraphics.x}, ${arrowGraphics.y}) rotate(${arrowGraphics.rotation * 180 / Math.PI}) scale(${this.instances.engine.renderer.fLineSizeMult * 2})`,
                });
            }
        }

        if (arrow) {
            const g = getSVGNode('g');
            g.appendChild(line);
            g.appendChild(arrow);
            return g;
        }

        return line;
    }

    protected override getVisibleNodes(): ExtendedGraphNode[] {
        return this.instances.renderer.nodes.reduce((acc: ExtendedGraphNode[], n) => {
            if (n.rendered && this.isNodeInVisibleArea(n)) {
                const en = this.instances.nodesSet.extendedElementsMap.get(n.id);
                if (en) {
                    acc.push(en);
                }
            }
            return acc;
        }, []);
    }

    protected override getVisibleLinks(): ExtendedGraphLink[] {
        return this.instances.renderer.links.reduce((acc: ExtendedGraphLink[], link) => {
            if (link.rendered && this.isLinkInVisibleArea(link)) {
                const extendedLink = this.instances.linksSet.extendedElementsMap.get(getLinkID(link));
                if (extendedLink) {
                    acc.push(extendedLink);
                }
            }
            return acc;
        }, []);
    }

    protected getVisibleFolders(): FolderBlob[] {
        const visibleNodes = this.getVisibleNodes();
        if (!this.instances.foldersSet) return [];
        return [...this.instances.foldersSet.foldersMap.values()]
            .filter(blob => visibleNodes
                .some(visibleNode => blob.nodes.includes(visibleNode.coreElement))
            );
    }

    protected getModal(): ExportSVGOptionModal {
        return new ExportSVGOptionModal(this.instances);
    }
}

export class ExportCoreGraphToSVG extends ExportGraphToSVG {
    engine: GraphEngine;

    constructor(engine: GraphEngine) {
        super(engine.renderer);
        this.engine = engine;
    }

    protected override getSVGForNode(node: GraphNode): SVGElement {
        const circle = getSVGNode('circle', {
            class: 'node-shape',
            id: 'node:' + node.id,
            cx: node.x,
            cy: node.y,
            r: node.getSize(),
            fill: int2hex(node.getFillColor().rgb)
        });

        return circle;
    }

    protected override getSVGForLink(link: GraphLink): SVGElement {
        const line = getSVGNode('path', {
            class: 'link',
            id: 'link:' + getLinkID(link),
            d: `M ${link.source.x} ${link.source.y} L ${link.target.x} ${link.target.y}`,
            stroke: pixiColor2hex(link.line?.tint ?? 0),
            'stroke-width': (this.engine.options.lineSizeMultiplier ?? 1) * 4,
            opacity: link.line?.alpha ?? 0.6
        });

        return line;
    }

    protected override getVisibleNodes(): GraphNode[] {
        return this.renderer.nodes.filter(n => n.rendered && this.isNodeInVisibleArea(n));
    }

    protected override getVisibleLinks(): GraphLink[] {
        return this.renderer.links.filter(l => l.rendered && l.line?.visible && this.isLinkInVisibleArea(l));
    }

    protected getModal(): ExportSVGOptionModal {
        return new ExportSVGOptionModal();
    }
}