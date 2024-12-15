import { App, TFile } from 'obsidian';

export interface Node {
    circle: {
        alpha: number;
        tintColor: {
            components: Float32Array;
        }
    }
    color: {
        a: number;
        rgb: number;
    }
    text: {
        alpha: number;
        _text: string;
    }
    id: string;
    weight: number;
    x: number;
    y: number;
    rendered: boolean;
    forward: {[id: string] : Node};
    reverse: {[id: string] : Node};
}

export class NodeWrapper {
    node: Node;
    _file: TFile;
    _imageUri: string | null;
    _tags: string[];
    _linkPathsMap: Map<string, string[]>;
    isActive: boolean = true;

    constructor(node: Node, app: App, keyProperty: string) {
        this.node = node;
        this._linkPathsMap = new Map<string, string[]>();
        if (app) {
            const file = app.vault.getFileByPath(node.id);
            if (!file) throw new Error(`Could not find TFile for node ${node.id}.`)
            this._file = file;
        }
        this.updateTags(app);
        this.updateImageUri(app, keyProperty);
        this.updateLinks(app);
    }

    updateTags(app: App) : void {
        if (!this._file) return;

        const metadata = app.metadataCache.getFileCache(this._file);
        this._tags = [];
        metadata?.tags?.forEach(tagCache => {
            const tag = tagCache.tag.replace('#', '');
            this._tags.push(tag);
        });
    }

    updateLinks(app: App) : void {
        const frontmatterLinks = app.metadataCache.getFileCache(this._file)?.frontmatterLinks;
        if (!frontmatterLinks) return;

        frontmatterLinks.forEach(frontmatterLinkCache => {
            const key = frontmatterLinkCache.key.split('.')[0];
            const linkPath = frontmatterLinkCache.link + ".md";
            const linkFile = app.vault.getFileByPath(linkPath);
            if (! linkFile) return;
            if (! this._linkPathsMap.has(key)) {
                this._linkPathsMap.set(key, []);
            }
            this._linkPathsMap.get(key)?.push(linkPath);
        });
    }

    getTagsTypes(app?: App) : string[] {
        (app) && this.updateTags(app);
        return this._tags;
    }

    updateImageUri(app: App, keyProperty: string) : void {
        if (!this._file) return;

        const metadata = app.metadataCache.getFileCache(this._file);
        const frontmatter = metadata?.frontmatter;
        const image_link = frontmatter ? frontmatter[keyProperty]?.replace("[[", "").replace("]]", "") : null;
        const image_file = image_link ? app.metadataCache.getFirstLinkpathDest(image_link, ".") : null;
        this._imageUri = image_file ? app.vault.getResourcePath(image_file) : null;
    }

    getImageUri() : string | null {
        return this._imageUri;
    }

    getID() : string {
        return this.node.id;
    }

    isFile(file: TFile) : boolean {
        return this._file === file;
    }

    getLinkTypes(nodeID: string) : string[] {
        let types: string[] = [];
        this._linkPathsMap.forEach((links: string[], type: string) => {
            if (links.includes(nodeID)) {
                types.push(type);
            }
        });
        return types;
    }

    waitReady(): Promise<void> {
        return new Promise((resolve) => {
            const intervalId = setInterval(() => {
                if (this.node.color !== null) {
                    clearInterval(intervalId);
                    resolve();
                }
            }, 500);
        });
    }
}