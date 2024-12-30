import { View } from "obsidian";
import { Renderer } from "./renderer";
import { GraphEngine } from "./engine";

export type GraphView = View & {
    renderer: Renderer;
    dataEngine: GraphEngine;
    onOptionsChange: () => void;
}

export type LocalGraphView = View & {
    renderer: Renderer;
    engine: GraphEngine;
    onOptionsChange: () => void;
}