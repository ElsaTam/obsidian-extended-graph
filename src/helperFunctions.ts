import { App, getAllTags, TFile, WorkspaceLeaf } from "obsidian";
import { Renderer } from "./graph/renderer";
import { getAPI as getDataviewAPI } from "obsidian-dataview";

export function getBackgroundColor(renderer: Renderer): Uint8Array {
    let bg = window.getComputedStyle(renderer.interactiveEl).backgroundColor;
    let el: Element = renderer.interactiveEl;
    while (bg.startsWith("rgba(") && bg.endsWith(", 0)") && el.parentElement) {
        el = el.parentElement as Element;
        bg = window.getComputedStyle(el).backgroundColor;
    }
    bg = bg.replace("rgba", "").replace("rgb", "").replace("(", "").replace(")", "");
    const RGB = bg.split(", ").map(c => parseInt(c));
    return Uint8Array.from(RGB);
}

export function capitalizeFirstLetter(val: string) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

interface Point {
    x: number;
    y: number;
}
export function bezier(t: number, p0: Point, p1: Point, p2: Point, p3: Point) : Point {
    const cX = 3 * (p1.x - p0.x),
        bX = 3 * (p2.x - p1.x) - cX,
        aX = p3.x - p0.x - cX - bX;

    const cY = 3 * (p1.y - p0.y),
        bY = 3 * (p2.y - p1.y) - cY,
        aY = p3.y - p0.y - cY - bY;

    const x = (aX * Math.pow(t, 3)) + (bX * Math.pow(t, 2)) + (cX * t) + p0.x;
    const y = (aY * Math.pow(t, 3)) + (bY * Math.pow(t, 2)) + (cY * t) + p0.y;

    return { x: x, y: y };
}

export function quadratic(t: number, p0: Point, p1: Point, p2: Point) : Point {
    const c1x = (1 - t) * ((1 - t) * p0.x + t * p1.x);
    const c1y = (1 - t) * ((1 - t) * p0.y + t * p1.y);
    const c2x = t * ((1 - t) * p1.x + t * p2.x);
    const c2y = t * ((1 - t) * p1.y + t * p2.y);
    const x = c1x + c2x;
    const y = c1y + c2y;
    return { x: x, y: y };
}

// https://stackoverflow.com/questions/11854907/calculate-the-length-of-a-segment-of-a-quadratic-bezier
export function lengthQuadratic(t: number, p0: Point, p1: Point, p2: Point) : number {
    const ax = p0.x - p1.x - p1.x + p2.x;
    const ay = p0.y - p1.y - p1.y + p2.y;
    const bx = p1.x + p1.x - p0.x - p0.x;
    const by = p1.y + p1.y - p0.y - p0.y;
    const A = 4.0 * ((ax * ax) + (ay * ay));
    const B = 4.0 * ((ax * bx) + (ay * by));
    const C =        (bx * bx) + (by * by) ;
    const b = B / (2.0 * A);
    const c = C / A;
    const u = t + b;
    const k = c - b * b;
    const b2k = Math.sqrt(b * b + k);
    const u2k = Math.sqrt(u * u + k);
    const L = 0.5 * Math.sqrt(A) * (
          (u * u2k)
        - (b * b2k)
        + (k * Math.log(Math.abs((u + u2k) / (b + b2k))))
    );
    return L;
}

export function getFile(app: App, path: string) : TFile | null {
    return app.vault.getFileByPath(path);
}

export function getImageUri(app: App, keyProperty: string, path: string) : string | null {
    let file = getFile(app, path);
    if (file) {
        const metadata = app.metadataCache.getFileCache(file);
        const frontmatter = metadata?.frontmatter;
        let imageLink = null;
        if (frontmatter) {
            if (typeof frontmatter[keyProperty] === "string") {
                imageLink = frontmatter[keyProperty]?.replace("[[", "").replace("]]", "");
            }
            else if (Array.isArray(frontmatter[keyProperty])) {
                imageLink = frontmatter[keyProperty][0]?.replace("[[", "").replace("]]", "");
            }
            const imageFile = imageLink ? app.metadataCache.getFirstLinkpathDest(imageLink, ".") : null;
            const imageUri = imageFile ? app.vault.getResourcePath(imageFile) : null;
            if (imageUri) return imageUri;
        }
    }
    return null;
}

export function getEngine(leaf: WorkspaceLeaf) : any {
    if (leaf.view.getViewType() === "graph") {
        // @ts-ignore
        return leaf.view.dataEngine;
    }
    else if(leaf.view.getViewType() === "localgraph") {
        // @ts-ignore
        return leaf.view.engine;
    }
    else {
        console.error("[Extended Graph plugin] Leaf is not a graph.");
        throw new Error("[Extended Graph plugin] Leaf is not a graph.");
    }
}

export function getFileInteractives(interactive: string, app: App, file: TFile) : Set<string> {
    if (file.extension !== "md") return new Set<string>();
    switch (interactive) {
        case "tag":
            return getTags(app, file);
        default:
            return getProperty(interactive, app, file);
    }
}

function getTags(app: App, file: TFile) : Set<string> {
    let metadataCache = app.metadataCache.getCache(file.path);
    if (!metadataCache) return new Set<string>();

    let tags = getAllTags(metadataCache)?.map(t => t.replace('#', ''));
    if (!tags) return new Set<string>();
    
    return new Set<string>(tags.sort());
}

function getProperty(key: string, app: App, file: TFile) : Set<string> {
    const dv = getDataviewAPI();
    let types = new Set<string>();

    // With Dataview
    if (dv) {
        const sourcePage = dv.page(file.path);
        const values = sourcePage[key];
        if (values === null || values === undefined || values === '') return new Set<string>();

        if (typeof values === "string" || typeof values === "number") {
            types.add(String(values));
        }
        else if (Array.isArray(values)) {
            for (const value of values) {
                if (typeof value === "string" || typeof value === "number") {
                    types.add(String(value));
                }
            }
        }
    }

    // Links in the frontmatter
    else {
        const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
        if (frontmatter?.hasOwnProperty(key)) {
            if (typeof frontmatter[key] === "string" || typeof frontmatter[key] === "number") {
                types.add(String(frontmatter[key]));
            }
            else if (Array.isArray(frontmatter[key])) {
                for (const value of frontmatter[key]) {
                    if (typeof value === "string" || typeof value === "number") {
                        types.add(String(value));
                    }
                }
            }
        }
    }

    return types;
}

export function isPropertyKeyValid(key: string) : boolean {
    if (key.contains(":")) {
        new Notice("Invalid character ':'");
        return false;
    }
    return (key.length > 0);
}