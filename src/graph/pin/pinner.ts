import { PinShape, PinShapeCircle, PinShapeData, PinShapeGrid, QueryData, QueryMatcher } from "../../internal";
import { GraphInstances } from "../../pluginInstances";

export class Pinner {
    instances: GraphInstances;
    static lastDraggedPinnedNode: string | null;

    constructor(instances: GraphInstances) {
        this.instances = instances;
    }

    // =============================== PIN/UNPIN ===============================

    setPinnedNodesFromState() {
        if (!this.instances.statePinnedNodes) return;

        const notYetHandled = Object.fromEntries(Object.entries(this.instances.statePinnedNodes).filter(([id, value]) => !value.handled && this.instances.nodesSet.extendedElementsMap.has(id)));
        const N = Object.keys(notYetHandled).length;

        for (const [id, extendedNode] of this.instances.nodesSet.extendedElementsMap) {
            const shouldBePinned = notYetHandled.hasOwnProperty(id);

            if (shouldBePinned && (!extendedNode.isPinned || extendedNode.coreElement.x !== notYetHandled[id].x || extendedNode.coreElement.y !== notYetHandled[id].y)) {
                this.pinNode(id, notYetHandled[id].x, notYetHandled[id].y, Math.min(0.1 * N, 1));
            }
            else if (!this.instances.statePinnedNodes.hasOwnProperty(id) && extendedNode.isPinned) {
                this.unpinNode(id);
            }

            if (this.instances.statePinnedNodes.hasOwnProperty(id)) this.instances.statePinnedNodes[id].handled = true;
        }

        // If all the nodes of the state have been handled (might take a few onRendered calls), set reset it to null
        if (Object.keys(notYetHandled).length === 0) {
            this.instances.statePinnedNodes = null;
        }
    }

    pinNode(id: string, x?: number, y?: number, alpha: number = 0.3) {
        const extendedNode = this.instances.nodesSet.extendedElementsMap.get(id);
        if (!extendedNode) return;
        const node = extendedNode.coreElement;
        if (x !== undefined) node.x = x;
        if (y !== undefined) node.y = y;
        node.fx = node.x;
        node.fy = node.y;
        this.instances.nodesSet.instances.renderer.worker.postMessage({
            alpha: alpha, // temperature of the simulation
            alphaTarget: 0, // target temperature to stop the simulation
            run: true, // run the simulation
            forceNode: {
                id: node.id,
                x: node.x,
                y: node.y
            }
        });
        extendedNode.pin();
    }

    unpinNode(id: string) {
        const extendedNode = this.instances.nodesSet.extendedElementsMap.get(id);
        if (!extendedNode) return;
        const node = extendedNode.coreElement;
        node.fx = null;
        node.fy = null;
        this.instances.nodesSet.instances.renderer.worker.postMessage({
            alpha: 0.3, // temperature of the simulation
            alphaTarget: 0, // target temperature to stop the simulation
            run: true, // run the simulation
            forceNode: {
                id: node.id,
                x: null,
                y: null
            }
        });
        if (Pinner.lastDraggedPinnedNode === id) Pinner.lastDraggedPinnedNode = null;
        extendedNode.unpin();
    }

    unpinAllNodes() {
        for (const [id, node] of this.instances.nodesSet.extendedElementsMap) {
            if (node.isPinned) {
                this.unpinNode(id);
            }
        }
        this.instances.renderer.changed();
    }

    // ============================ HANDLE DRAGGING ============================

    setLastDraggedPinnedNode(id: string): void {
        Pinner.lastDraggedPinnedNode = id;
    }

    pinLastDraggedPinnedNode(): void {
        if (!Pinner.lastDraggedPinnedNode) return;
        this.pinNode(Pinner.lastDraggedPinnedNode);
        Pinner.lastDraggedPinnedNode = null;
    }

    // ============================= PIN IN SHAPE ==============================

    pinInShape(shapeData: PinShapeData, queryData: QueryData) {
        let pinShape: PinShape;
        switch (shapeData.type) {
            case 'circle':
                pinShape = new PinShapeCircle(this.instances, shapeData);
                break;

            case 'grid':
                pinShape = new PinShapeGrid(this.instances, shapeData);
                break;

            default:
                return;
        }

        const matcher = new QueryMatcher(queryData);
        const ids = matcher.getMatches(this.instances.settings).map(file => file.path);
        const nodes = [...this.instances.nodesSet.extendedElementsMap.values()].filter(n => ids.includes(n.id));

        pinShape.pinNodes(nodes);
    }

}