import { EventRef, Workspace } from "obsidian";

export type WorkspaceExt = Workspace & {
    on(name: "extended-graph:settings-colorpalette-changed",   callback: (key: string) => void) : EventRef;
    on(name: "extended-graph:settings-interactive-color-changed",   callback: (key: string, type: string) => void) : EventRef;
}