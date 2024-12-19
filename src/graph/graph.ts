
import { App, Component, WorkspaceLeaf } from 'obsidian';
import { Renderer } from './renderer';
import { InteractiveManager } from './interactiveManager';
import { GraphView } from 'src/views/view';
import { NodesSet } from './nodesSet';
import { LinksSet } from './linksSet';
import { DEFAULT_VIEW_ID, FUNC_NAMES, NONE_TYPE } from 'src/globalVariables';
import { EngineOptions } from 'src/views/viewData';
import { ExtendedGraphSettings } from 'src/settings/settings';

export class Graph extends Component {
    nodesSet: NodesSet;
    linksSet: LinksSet;
    linkTypesMap = new Map<string, Set<string>>(); // key: type / value: link ids
    interactiveManagers = new Map<string, InteractiveManager>();

    engine: any;
    renderer: Renderer;
    app: App;
    leaf: WorkspaceLeaf;
    settings: ExtendedGraphSettings;

    constructor(renderer: Renderer, leaf: WorkspaceLeaf, app: App, settings: ExtendedGraphSettings) {
        FUNC_NAMES && console.log("[Graph] new");
        super();
        this.renderer = renderer;
        this.app = app;
        this.leaf = leaf;
        this.settings = settings;

        // Initialize nodes and links sets
        this.nodesSet = new NodesSet(leaf, this.renderer, new InteractiveManager(leaf, this.settings, "tag"), app, settings);
        this.linksSet = new LinksSet(leaf, this.renderer, new InteractiveManager(leaf, this.settings, "link"));
        this.interactiveManagers.set("tag", this.nodesSet.tagsManager);
        this.interactiveManagers.set("link", this.linksSet.linksManager);
        this.addChild(this.nodesSet.tagsManager);
        this.addChild(this.linksSet.linksManager);

        // Intercept search filter
        if (this.leaf.view.getViewType() === "graph") {
            // @ts-ignore
            this.engine =  this.leaf.view.dataEngine;
        }
        else if(this.leaf.view.getViewType() === "localgraph") {
            // @ts-ignore
            this.engine =  this.leaf.view.engine;
        }
        else {
            throw new Error("[Extended Graph plugin] Leaf is not a graph.")
        }
        
        this.engine.filterOptions.search.getValue = (function() {
            let prepend = this.settings.globalFilter ? this.settings.globalFilter + " " : "";
            let append = "";
            this.nodesSet.disconnectedNodes.forEach((id: string) => {
                append += ` -path:"${id}"`;
            });
            return prepend + this.engine.filterOptions.search.inputEl.value + append;
        }).bind(this);
        this.setFilter("");
        this.engine.updateSearch();
    }

    onload() : void {
        FUNC_NAMES && console.log("[Graph] onload");
        this.initSets().then(() => {
            // Obsidian handles search filter after loading the graph. Which
            // means that it will first load and trigger changes with all nodes,
            // creating a lot of Promises.
            this.removeAdditionalData();

            this.leaf.trigger('extended-graph:graph-ready');
        });
    }

    onunload() : void {
        this.engine.filterOptions.search.getValue = (function() {
            return this.filterOptions.search.inputEl.value;
        }).bind(this.engine);
        this.engine.updateSearch();
    }

    private removeAdditionalData() : void {
        // Remove invalid nodes
        let invalidNodes = new Set<string>();
        this.nodesSet.nodesMap.forEach((nodeWrapper, nodeID) => {
            if (! this.renderer.nodes.find(n => n.id === nodeID)) {
                invalidNodes.add(nodeID);
            }
        });

        if (invalidNodes.size > 0) {
            invalidNodes.forEach(nodeID => {
                let wrapper = this.nodesSet.nodesMap.get(nodeID);
                wrapper?.parent?.removeChild(wrapper);
                wrapper?.destroy();
                this.nodesSet.nodesMap.delete(nodeID);
                this.nodesSet.connectedNodes.delete(nodeID);
                this.nodesSet.disconnectedNodes.delete(nodeID);
            })
        }

        // Remove invalid links
        let invalidLinks = new Set<string>();
        this.linksSet.linksMap.forEach((linkWrapper, linkID) => {
            try {
                this.nodesSet.get(linkWrapper.sourceID);
                this.nodesSet.get(linkWrapper.targetID);
            }
            catch (error) {
                invalidLinks.add(linkID);
                return;
            }
        });
        
        if (invalidLinks.size > 0) {
            let invalidLinkTypes = new Set<string>();
            invalidLinks.forEach(linkID => {
                this.linkTypesMap.forEach((linkForType, type) => {
                    if (linkForType.has(linkID)) {
                        linkForType.delete(linkID);
                        if (linkForType.size === 0) {
                            invalidLinkTypes.add(type);
                        }
                    }
                });
                this.linksSet.get(linkID).destroy();
                this.linksSet.linksMap.delete(linkID);
                this.linksSet.connectedLinks.delete(linkID);
                this.linksSet.disconnectedLinks.delete(linkID);
            });
            if (invalidLinkTypes.size > 0) {
                this.linksSet.linksManager.removeTypes(invalidLinkTypes);
            }
        }
    }

    async initSets() : Promise<void> {
        FUNC_NAMES && console.log("[Graph] initSets");
        // Sleep for a short duration to let time to the engine to apply user filters
        await new Promise(r => setTimeout(r, 200));

        let requestList: Promise<void>[] = [];
        requestList = requestList.concat(this.nodesSet.load());
        requestList = requestList.concat(this.linksSet.load());

        await Promise.all(requestList);

        this.removeAdditionalData();

        // Create link types
        this.linksSet.linksMap.forEach((linkWrapper, linkID) => {
            let sourceNode = this.nodesSet.get(linkWrapper.sourceID);
            const sourceFile = sourceNode.file;

            let types = new Set<string>();

            const frontmatterLinks = this.app.metadataCache.getFileCache(sourceFile)?.frontmatterLinks;
            if (frontmatterLinks) {
                // For each link in the frontmatters, check if target matches
                frontmatterLinks.forEach(linkCache => {
                    const linkType = linkCache.key.split('.')[0];
                    const targetID = linkCache.link + ".md";
                    if (targetID == linkWrapper.targetID) {
                        // Set the pair
                        (!this.linkTypesMap.get(linkType)) &&  this.linkTypesMap.set(linkType, new Set<string>());
                        this.linkTypesMap.get(linkType)?.add(linkID);
                        types.add(linkType);
                    }
                });
            }
            if (!frontmatterLinks || types.size === 0) {
                (!this.linkTypesMap.get(NONE_TYPE)) &&  this.linkTypesMap.set(NONE_TYPE, new Set<string>());
                this.linkTypesMap.get(NONE_TYPE)?.add(linkID);
                types.add(NONE_TYPE);
            }

            linkWrapper.setTypes(types);
        });

        // Initialize colors for each node/link type
        this.nodesSet.tagsManager.update(this.nodesSet.getAllTagTypesFromCache(this.app));
        this.linksSet.linksManager.update(this.getAllLinkTypes());
    }

    getAllLinkTypes() : Set<string> {
        FUNC_NAMES && console.log("[Graph] getAllLinkTypes");
        return new Set<string>(this.linkTypesMap.keys());
    }

    getLinks(types: string[]) : Set<string> {
        let links = new Set<string>();
        types.forEach(type => {
            this.linkTypesMap.get(type)?.forEach(linkID => {
                links.add(linkID);
            })
        });
        return links;
    }

    disableLinkTypes(types: string[]) {
        FUNC_NAMES && console.log("[LinksSet] disableLinkTypes");
        this.linksSet.disableLinks(this.getLinks(types)).then((hasChanged) => {
            if (hasChanged) {
                this.leaf.trigger('extended-graph:engine-needs-update');
            }
        });
    }

    enableLinkTypes(types: string[]) {
        FUNC_NAMES && console.log("[LinksSet] enableLinkTypes");
        this.linksSet.enableLinks(this.getLinks(types)).then((hasChanged) => {
            if (hasChanged) {
                this.leaf.trigger('extended-graph:engine-needs-update');
            }
        });
    }
        
    updateWorker() : void {
        FUNC_NAMES && console.log("[LinksSet] updateWorker");
        let nodes: any = {};
        this.nodesSet.connectedNodes.forEach(id => {
            nodes[id] = [this.nodesSet.get(id).node.x, this.nodesSet.get(id).node.y];
        });

        let links: any = [];
        this.linksSet.connectedLinks.forEach(id => {
            links.push([this.linksSet.get(id).sourceID, this.linksSet.get(id).targetID]);
        });

        this.renderer.worker.postMessage({
            nodes: nodes,
            links: links,
            alpha: .3,
            run: !0
        });
    }

    newView(name: string) : string {
        FUNC_NAMES && console.log("[Graph] newView");
        let view = new GraphView(name);
        view.setID();
        view.saveGraph(this);
        this.app.workspace.trigger('extended-graph:view-needs-saving', view.data);
        return view.data.id;
    }

    setFilter(filter: string) {
        this.engine.filterOptions.search.setValue(filter);
        this.engine.updateSearch();
    }

    setEngineOptions(options: EngineOptions) {
        this.engine.setOptions(options);
    }

    saveView(id: string) : void {
        FUNC_NAMES && console.log("[Graph] saveView");
        if (id === DEFAULT_VIEW_ID) return;
        let viewData = this.settings.views.find(v => v.id == id);
        if (!viewData) return;
        let view = new GraphView(viewData?.name);
        view.setID(id);
        view.saveGraph(this);
        this.app.workspace.trigger('extended-graph:view-needs-saving', view.data);
    }

    deleteView(id: string) : void {
        this.app.workspace.trigger('extended-graph:view-needs-deletion', id);
    }

    test() : void {
        
    }
}
