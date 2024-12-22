
import { Component } from 'obsidian';
import { Renderer } from './renderer';
import { InteractiveManager } from './interactiveManager';
import { GraphView } from 'src/views/view';
import { NodesSet } from './nodesSet';
import { LinksSet } from './linksSet';
import { DEFAULT_VIEW_ID, INVALID_KEYS } from 'src/globalVariables';
import { EngineOptions } from 'src/views/viewData';
import { GraphEventsDispatcher } from './graphEventsDispatcher';
import { ExtendedGraphSettings } from 'src/settings/settings';
import { getAPI as getDataviewAPI } from "obsidian-dataview";

export class Graph extends Component {
    nodesSet: NodesSet | null;
    linksSet: LinksSet | null;
    linkTypesMap: Map<string, Set<string>> | null; // key: type / value: link ids
    interactiveManagers = new Map<string, InteractiveManager>();

    dispatcher: GraphEventsDispatcher;
    engine: any;
    renderer: Renderer;
    settings: ExtendedGraphSettings;

    constructor(dispatcher: GraphEventsDispatcher) {
        super();
        this.dispatcher = dispatcher;
        this.renderer = dispatcher.leaf.view.renderer;
        this.settings = structuredClone(dispatcher.graphsManager.plugin.settings);

        // Initialize nodes and links sets
        if (this.settings.enableTags || this.settings.enableImages || this.settings.enableFocusActiveNote || this.settings.enableLinks) {
            let tagsManager = this.settings.enableTags ? new InteractiveManager(dispatcher.leaf, this.settings, "tag") : null;
            this.nodesSet = new NodesSet(this, tagsManager);
            if (this.settings.enableTags && tagsManager) {
                this.interactiveManagers.set("tag", tagsManager);
                this.addChild(tagsManager);
            }
        }
        if (this.settings.enableLinks) {
            this.linkTypesMap = new Map<string, Set<string>>();
            this.linksSet = new LinksSet(this, new InteractiveManager(dispatcher.leaf, this.settings, "link"));
            this.interactiveManagers.set("link", this.linksSet.linksManager);
            this.addChild(this.linksSet.linksManager);
        }

        // Intercept search filter
        if (dispatcher.leaf.view.getViewType() === "graph") {
            // @ts-ignore
            this.engine =  this.dispatcher.leaf.view.dataEngine;
        }
        else if(dispatcher.leaf.view.getViewType() === "localgraph") {
            // @ts-ignore
            this.engine =  this.dispatcher.leaf.view.engine;
        }
        else {
            throw new Error("[Extended Graph plugin] Leaf is not a graph.")
        }
        
        this.engine.filterOptions.search.getValue = (function() {
            let prepend = this.dispatcher.graphsManager.plugin.settings.globalFilter + " ";
            let append = "";
            if (this.nodesSet.disconnectedNodes) {
                this.nodesSet.disconnectedNodes.forEach((id: string) => {
                    append += ` -path:"${id}"`;
                });
            }
            return prepend + this.engine.filterOptions.search.inputEl.value + append;
        }).bind(this);
        this.setFilter("");
        this.engine.updateSearch();
    }

    onload() : void {
        this.initSets().then(() => {
            // Obsidian handles search filter after loading the graph. Which
            // means that it will first load and trigger changes with all nodes,
            // creating a lot of Promises.
            this.removeAdditionalData();

            this.dispatcher.onGraphReady();
        });
    }

    onunload() : void {
        this.engine.filterOptions.search.getValue = (function() {
            return this.filterOptions.search.inputEl.value;
        }).bind(this.engine);

        let graphCorePlugin = this.dispatcher.graphsManager.plugin.app.internalPlugins.getPluginById("graph");
        let defaultViewData = this.settings.views.find(v => v.id === DEFAULT_VIEW_ID);
        (defaultViewData) && this.setEngineOptions(defaultViewData.engineOptions);
        // @ts-ignore
        (graphCorePlugin && defaultViewData) && (graphCorePlugin.instance.options.search = defaultViewData.engineOptions.search);
    }

    private removeAdditionalData() : void {
        if (this.nodesSet) {
            // Remove invalid nodes
            let invalidNodes = new Set<string>();
            this.nodesSet.nodesMap.forEach((nodeWrapper, nodeID) => {
                if (! this.renderer.nodes.find(n => n.id === nodeID)) {
                    invalidNodes.add(nodeID);
                }
            });
    
            if (invalidNodes.size > 0) {
                for (const nodeID of invalidNodes) {
                    let wrapper = this.nodesSet.nodesMap.get(nodeID);
                    wrapper?.parent?.removeChild(wrapper);
                    wrapper?.destroy();
                    this.nodesSet.nodesMap.delete(nodeID);
                    this.nodesSet.connectedNodes.delete(nodeID);
                    this.nodesSet.disconnectedNodes?.delete(nodeID);
                }
            }
        }

        // Remove invalid links
        if (this.linksSet && this.nodesSet && this.linkTypesMap) {
            let invalidLinks = new Set<string>();
            for (const [linkID, linkWrapper] of this.linksSet.linksMap.entries()) {
                try {
                    this.nodesSet.get(linkWrapper.sourceID);
                    this.nodesSet.get(linkWrapper.targetID);
                }
                catch (error) {
                    invalidLinks.add(linkID);
                    continue;
                }
            }
            
            if (invalidLinks.size > 0) {
                let invalidLinkTypes = new Set<string>();
                for (const linkID of invalidLinks) {
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
                }
                if (invalidLinkTypes.size > 0) {
                    this.linksSet.linksManager.removeTypes(invalidLinkTypes);
                }
            }
        }
    }

    async initSets() : Promise<void> {
        // Sleep for a short duration to let time to the engine to apply user filters
        await new Promise(r => setTimeout(r, 200));

        let requestList: Promise<void>[] = [];
        (this.nodesSet) && (requestList = requestList.concat(this.nodesSet.load()));
        (this.linksSet) && (requestList = requestList.concat(this.linksSet.load()));
        
        await Promise.all(requestList);

        this.removeAdditionalData();

        // Update node opacity layer colors
        if (this.settings.fadeOnDisable) {
            this.nodesSet?.updateOpacityLayerColor();
        }

        this.initLinkTypes();
        this.initColors();
    }

    initLinkTypes() : void {
        let setType = (function(type: string, id: string, types: Set<string>) {
            if (this.settings.unselectedInteractives["link"].includes(type)) return;
            if (INVALID_KEYS["link"].includes(type)) return;

            if (this.linksSet && this.nodesSet && this.linkTypesMap) {
                (!this.linkTypesMap.get(type)) && this.linkTypesMap.set(type, new Set<string>());
                this.linkTypesMap.get(type)?.add(id);
                types.add(type);
            }
        }).bind(this);

        // Create link types
        if (this.linksSet && this.nodesSet && this.linkTypesMap) {
            const dv = getDataviewAPI();
            for (const [linkID, linkWrapper] of this.linksSet.linksMap) {
                let sourceNode = this.nodesSet.get(linkWrapper.sourceID);
                const sourceFile = sourceNode.file;
                if (!sourceFile) continue;
    
                let types = new Set<string>();

                // Links with dataview inline properties
                if (dv) {
                    let sourcePage = dv.page(linkWrapper.sourceID);
                    for (const [key, value] of Object.entries(sourcePage)) {
                        if (key === "file" || key === this.settings.imageProperty) continue;
                        if (value === null || value === undefined || value === '') continue;

                        if ((typeof value === "object") && ("path" in value) && ((value as any).path === linkWrapper.targetID)) {
                            setType(key, linkID, types);
                        }

                        if (Array.isArray(value)) {
                            for (const link of value) {
                                if (link.path === linkWrapper.targetID) {
                                    setType(key, linkID, types);
                                }
                            }
                        }
                    }
                }
    
                // Links in the frontmatter
                else {
                    const frontmatterLinks = this.dispatcher.graphsManager.plugin.app.metadataCache.getFileCache(sourceFile)?.frontmatterLinks;
                    if (frontmatterLinks) {
                        // For each link in the frontmatters, check if target matches
                        for (const linkCache of frontmatterLinks) {
                            const linkType = linkCache.key.split('.')[0];
                            const targetID = this.dispatcher.graphsManager.plugin.app.metadataCache.getFirstLinkpathDest(linkCache.link, ".")?.path;
                            if (targetID === linkWrapper.targetID) {
                                setType(linkType, linkID, types);
                            }
                        }
                    }
                }

                if (types.size === 0) {
                    setType(this.settings.noneType["link"], linkID, types);
                }
    
                linkWrapper.setTypes(types);
            }
        }
    }

    initColors() : void {
        // Initialize colors for each node/link type
        if (this.nodesSet) {
            const types = this.nodesSet.getAllTagTypesFromCache(this.dispatcher.graphsManager.plugin.app);
            types && this.nodesSet.tagsManager?.update(types);
        }
        if (this.linksSet) {
            const types = this.getAllLinkTypes();
            types && this.linksSet?.linksManager.update(types);
        }
    }

    getAllLinkTypes() : Set<string> | null {
        if (!this.linksSet) return null;
        return new Set<string>(this.linkTypesMap?.keys());
    }

    getLinks(types: string[]) : Set<string> | null {
        if (!this.linksSet) return null;
        const links = new Set<string>();
        for (const type of types) {
            this.linkTypesMap?.get(type)?.forEach(linkID => {
                links.add(linkID);
            })
        }
        return links;
    }

    disableLinkTypes(types: string[]) {
        if (!this.linksSet) return;
        const links = this.getLinks(types);
        (links) && this.linksSet?.disableLinks(links).then((hasChanged) => {
            if (hasChanged) {
                this.dispatcher.onEngineNeedsUpdate();
            }
        });
    }

    enableLinkTypes(types: string[]) {
        if (!this.linksSet) return;
        const links = this.getLinks(types);
        (links) && this.linksSet?.enableLinks(links).then((hasChanged) => {
            if (hasChanged) {
                this.dispatcher.onEngineNeedsUpdate();
            }
        });
    }
        
    updateWorker() : void {
        if (!this.linksSet && !this.nodesSet) return;

        let nodes: any = {};
        if (this.nodesSet) {
            for (const id of this.nodesSet.connectedNodes) {
                nodes[id] = [this.nodesSet.get(id).node.x, this.nodesSet.get(id).node.y];
            }
        }
        else {
            for (const node of this.renderer.nodes) {
                nodes[node.id] = [node.x, node.y];
            }
        }

        let links: any = [];
        if (this.linksSet) {
            for (const id of this.linksSet.connectedLinks) {
                links.push([this.linksSet.get(id).sourceID, this.linksSet.get(id).targetID]);
            }
        }
        else {
            for (const link of this.renderer.links) {
                links.push([link.source.id, link.target.id]);
            }
        }

        this.renderer.worker.postMessage({
            nodes: nodes,
            links: links,
            alpha: .3,
            run: !0
        });
    }

    setFilter(filter: string) {
        this.engine.filterOptions.search.setValue(filter);
        this.engine.updateSearch();
    }

    setEngineOptions(options: EngineOptions) {
        this.engine.setOptions(options);
    }

    newView(name: string) : string {
        let view = new GraphView(name);
        view.setID();
        view.saveGraph(this);
        this.dispatcher.graphsManager.onViewNeedsSaving(view.data);
        return view.data.id;
    }

    saveView(id: string) : void {
        if (id === DEFAULT_VIEW_ID) return;
        let viewData = this.settings.views.find(v => v.id == id);
        if (!viewData) return;
        let view = new GraphView(viewData?.name);
        view.setID(id);
        view.saveGraph(this);
        this.dispatcher.graphsManager.onViewNeedsSaving(view.data);
    }

    deleteView(id: string) : void {
        this.dispatcher.graphsManager.onViewNeedsDeletion(id);
    }

    test() : void {
        
    }
}
