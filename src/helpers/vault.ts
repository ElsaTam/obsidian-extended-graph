import { getAllTags, TFile } from "obsidian";
import { DataviewApi, getAPI as getDataviewAPI } from "obsidian-dataview";
import { canonicalizeVarName, ExtendedGraphSettings, FOLDER_KEY, PluginInstances, TAG_KEY } from "src/internal";

export function getFile(path: string): TFile | null {
    return PluginInstances.app.vault.getFileByPath(path);
}

export function getFileInteractives(interactive: string, file: TFile): Set<string> {
    if (file.extension !== "md") return new Set<string>();
    switch (interactive) {
        case TAG_KEY:
            return getTags(file);
        case FOLDER_KEY:
            return getFolderPath(file);
        default:
            return getProperty(interactive, file);
    }
}

function getTags(file: TFile): Set<string> {
    const metadataCache = PluginInstances.app.metadataCache.getCache(file.path);
    if (!metadataCache) return new Set<string>();

    const tags = getAllTags(metadataCache)?.map(t => t.replace('#', ''));
    if (!tags) return new Set<string>();
    
    return new Set<string>(tags.sort());
}

function getProperty(key: string, file: TFile): Set<string> {
    const dv = getDataviewAPI(PluginInstances.app);
    const types = new Set<string>();

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
        else if ((typeof values === "object") && ("path" in values)) {
            const targetFile = getFile(values.path);
            types.add(targetFile ? PluginInstances.app.metadataCache.fileToLinktext(targetFile, values.path, true) : values.path);
        }
    }

    // Links in the frontmatter
    else {
        const frontmatter = PluginInstances.app.metadataCache.getFileCache(file)?.frontmatter;
        if (frontmatter?.hasOwnProperty(key)) {
            const values = frontmatter[key];
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
            else if ((typeof values === "object") && ("path" in values)) {
                const targetFile = getFile(values.path);
                types.add(targetFile ? PluginInstances.app.metadataCache.fileToLinktext(targetFile, values.path, true) : values.path);
            }
        }
    }

    return types;
}

function getFolderPath(file: TFile): Set<string> {
    const set = new Set<string>();
    file.parent ? set.add(file.parent.path) : '';
    return set;
}

export function getOutlinkTypes(settings: ExtendedGraphSettings, file: TFile): Map<string, Set<string>> {
    const dv = getDataviewAPI(PluginInstances.app);
    return dv ? getOutlinkTypesWithDataview(settings, dv, file) : getOutlinkTypesWithFrontmatter(file);
}

function getOutlinkTypesWithDataview(settings: ExtendedGraphSettings, dv: DataviewApi, file: TFile): Map<string, Set<string>> {
    const linkTypes = new Map<string, Set<string>>();
    const sourcePage = dv.page(file.path);
    for (const [key, value] of Object.entries(sourcePage)) {
        if (key === "file" || key === settings.imageProperty) continue;
        if (value === null || value === undefined || value === '') continue;

        if ((typeof value === "object") && ("path" in value)) {
            const targetID = (value as {path: string}).path;
            if (!linkTypes.has(targetID)) linkTypes.set(targetID, new Set<string>());
            linkTypes.get(targetID)?.add(canonicalizeVarName(key));
        }
        else if (Array.isArray(value)) {
            for (const l of value) {
                if ((typeof l === "object") && ("path" in l)) {
                    const targetID = (l as {path: string}).path;
                    if (!linkTypes.has(targetID)) linkTypes.set(targetID, new Set<string>());
                    linkTypes.get(targetID)?.add(canonicalizeVarName(key));
                }
            }
        }
    }
    return linkTypes;
}

function getOutlinkTypesWithFrontmatter(file: TFile): Map<string, Set<string>> {
    const linkTypes = new Map<string, Set<string>>();
    const frontmatterLinks = PluginInstances.app.metadataCache.getFileCache(file)?.frontmatterLinks;
    if (frontmatterLinks) {
        // For each link in the frontmatters, check if target matches
        for (const linkCache of frontmatterLinks) {
            const linkType = linkCache.key.split('.')[0];
            const targetID = PluginInstances.app.metadataCache.getFirstLinkpathDest(linkCache.link, ".")?.path;
            if (targetID) {
                if (!linkTypes.has(targetID)) linkTypes.set(targetID, new Set<string>());
                linkTypes.get(targetID)?.add(linkType);
            }
        }
    }
    return linkTypes;
}