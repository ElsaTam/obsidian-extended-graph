import { WorkspaceLeaf } from "obsidian";
import { GraphEngine, GraphView, LocalGraphView } from "obsidian-typings";
import { Container, DisplayObject, Text } from 'pixi.js';
import { ExtendedGraphInstances } from "../pluginInstances";

export function getGraphView(leaf: WorkspaceLeaf): GraphView | LocalGraphView | undefined {
    if (leaf.view.getViewType() === "graph") {
        return leaf.view as GraphView;
    }
    else if (leaf.view.getViewType() === "localgraph") {
        return leaf.view as LocalGraphView;
    }
    else {
        return;
    }
}

export function hasEngine(leaf: WorkspaceLeaf): boolean {
    if (leaf.view.getViewType() === "graph") {
        return leaf.view.hasOwnProperty("dataEngine");
    }
    else {
        return leaf.view.hasOwnProperty("engine");
    }
}

export function getEngine(view: GraphView | LocalGraphView): GraphEngine | undefined {
    if (view.getViewType() === "graph") {
        return (view as GraphView).dataEngine;
    }
    else {
        return (view as LocalGraphView).engine;
    }
}

export function fadeIn(element: DisplayObject & { hasFaded: boolean, maxAlpha?: number }, callback?: () => void) {
    const increaseAlpha = () => {
        if (element.alpha < (element.maxAlpha ?? 1)) {
            element.alpha += 0.04;
            requestAnimationFrame(increaseAlpha);
        }
        else {
            element.hasFaded = true;
            if (callback) callback();
        }
    }

    element.alpha = 0;
    element.hasFaded = false;
    requestAnimationFrame(increaseAlpha);
}

export function getIndexInHanger(hanger: Container, element: DisplayObject): number {
    if (hanger.children.contains(element)) return hanger.getChildIndex(element);
    else if (element.parent) return getIndexInHanger(hanger, element.parent);
    else return 0;
}

export function pixiAddChild(parent: Container, ...children: DisplayObject[]) {
    return (ExtendedGraphInstances.proxysManager.getTargetForProxy(parent) ?? parent).addChild(...children.map(child => ExtendedGraphInstances.proxysManager.getTargetForProxy(child) ?? child));
}

export function pixiAddChildAt(parent: Container, child: DisplayObject, index: number) {
    return (ExtendedGraphInstances.proxysManager.getTargetForProxy(parent) ?? parent).addChildAt(ExtendedGraphInstances.proxysManager.getTargetForProxy(child) ?? child, index);
}