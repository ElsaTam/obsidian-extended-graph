import { getIcon, Plugin } from "obsidian";
import { GraphView, LocalGraphView } from "obsidian-typings";
import { DataviewApi, getAPI as getDataviewAPI } from "obsidian-dataview";
import { canonicalizeVarName, GraphBannerPlugin, IconicPlugin, IconizePlugin, isEmoji, NLPPlugin, ExtendedGraphInstances } from "../internal";


// ======================== Iconic

export function getIconicPlugin(): IconicPlugin | null {
    return ExtendedGraphInstances.app.plugins.getPlugin('iconic') as IconicPlugin;
}

export function getSvgFromIconic(path: string): { svg: SVGSVGElement | null, color: string | null, emoji: string | null } | null {
    const iconic = getIconicPlugin();
    if (!iconic
        || !iconic.hasOwnProperty("ruleManager")
        || !(typeof iconic.ruleManager.checkRuling === "function")
        || !(typeof iconic.getFileItem === "function")) return null;

    // Check for an icon ruling
    const page = ExtendedGraphInstances.app.vault.getFolderByPath(path) ? 'folder' : 'file';
    const data = iconic.ruleManager.checkRuling(page, path) ?? iconic.getFileItem(path);

    // SVG icon
    if (data.icon?.startsWith("lucide-")) {
        const svg = getIcon(data.icon);
        if (svg) {
            const bodyStyle = getComputedStyle(document.body);
            let color: string | null = null;
            if (data.hasOwnProperty("color")) {
                color = bodyStyle.getPropertyValue(`--color-${data.color}`) || null;
            }

            return { svg, color, emoji: null };
        }
    }

    else if (data.icon && isEmoji(data.icon)) {
        return { svg: null, color: null, emoji: data.icon };
    }

    return null;
}

// ======================== Iconize

export function getSvgFromIconize(path: string): { svg: SVGSVGElement | null, color: string | null, emoji: string | null } | null {
    const iconize: IconizePlugin | null = ExtendedGraphInstances.app.plugins.getPlugin('obsidian-icon-folder') as IconizePlugin;
    if (!iconize
        || !iconize.hasOwnProperty("api")
        || !iconize.api.hasOwnProperty("getIconByName")
        || !iconize.hasOwnProperty("data")) return null;

    if (!(path in iconize.data)) return null;

    const data = iconize.data[path];

    let name: string | undefined = undefined;;
    let color: string | null = null;

    if (typeof data === "string") {
        name = data;
    }
    else {
        name = data.iconName;
        color = data.iconColor;
    }

    if (!name) return null;

    const icon = iconize.api.getIconByName(name);
    if (icon) {
        const svgString = icon.svgElement;
        const parser = new DOMParser();
        const parsedNode = parser.parseFromString(svgString, 'text/html');
        const svg = parsedNode.querySelector('svg');
        return { svg: svg, color, emoji: null };
    }

    // Try to get an emoji
    if (typeof name === "string" && name !== "" && isEmoji(name)) {
        return { svg: null, color: null, emoji: name };
    }


    return null;
}

// ======================== Graph banner

export function isGraphBannerLoaded(): boolean {
    return this.app.plugins.getPlugin('graph-banner')?._loaded;
}

export function getGraphBannerClass(): string {
    return "graph-banner-content";
}

export function isGraphBannerView(view: LocalGraphView | GraphView) {
    return view.contentEl.classList.contains(getGraphBannerClass());
}

export function getGraphBannerPlugin(): GraphBannerPlugin | undefined {
    return ExtendedGraphInstances.app.plugins.getPlugin('graph-banner') as GraphBannerPlugin
}

// ======================== Dataview

export function getDataviewPlugin(): DataviewApi | undefined {
    return getDataviewAPI(ExtendedGraphInstances.app);
}

export function getDataviewPageProperties(canonicalizeProperties: boolean, page: any): string[] {
    const properties: string[] = [];
    for (const [key, value] of Object.entries(page)) {
        if (key === "file") continue;
        if (value === null || value === undefined || value === '') continue;

        // Check if the key is a canonicalized version of another key
        if (!canonicalizeProperties && key === canonicalizeVarName(key) && Object.keys(page).some(k => canonicalizeVarName(k) === canonicalizeVarName(key) && k !== key)) {
            continue;
        }

        properties.push(canonicalizeProperties ? canonicalizeVarName(key) : key);
    }
    return properties;
}

// ======================== NLP

export function getNLPPlugin(): NLPPlugin | undefined {
    const nlp = ExtendedGraphInstances.app.plugins.getPlugin("nlp") as NLPPlugin;
    if (!nlp) {
        return;
    } else if (!nlp?.settings?.refreshDocsOnLoad) {
        return;
    } else {
        return nlp;
    }
}