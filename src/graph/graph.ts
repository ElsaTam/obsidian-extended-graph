
import { Component } from 'obsidian';
import { Renderer } from './renderer';
import { InteractiveManager } from './interactiveManager';
import { GraphView } from 'src/views/view';
import { NodesSet } from './nodesSet';
import { LinksSet } from './linksSet';
import { DEFAULT_VIEW_ID, DisconnectionCause } from 'src/globalVariables';
import { EngineOptions } from 'src/views/viewData';
import { GraphEventsDispatcher } from './graphEventsDispatcher';
import { ExtendedGraphSettings } from 'src/settings/settings';
import { getLinkID } from './elements/link';
import { ONode } from './elements/node';

export class Graph extends Component {
    nodesSet: NodesSet;
    linksSet: LinksSet;
    interactiveManagers = new Map<string, InteractiveManager>();
    hasChangedFilterSearch: boolean = false;

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
        let tagsManager = this.settings.enableTags ? new InteractiveManager(dispatcher, dispatcher.graphsManager.plugin.settings, "tag") : null;
        this.nodesSet = new NodesSet(this, tagsManager);
        if (tagsManager) {
            this.interactiveManagers.set("tag", tagsManager);
            this.addChild(tagsManager);
        }

        let linksManager = this.settings.enableLinks ? new InteractiveManager(dispatcher, dispatcher.graphsManager.plugin.settings, "link") : null;
        this.linksSet = new LinksSet(this, linksManager);
        if (linksManager) {
            this.interactiveManagers.set("link", linksManager);
            this.addChild(linksManager);
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
            console.error("[Extended Graph plugin] Leaf is not a graph.");
            throw new Error("[Extended Graph plugin] Leaf is not a graph.");
        }
        
        if (this.nodesSet?.disconnectedNodes) {
            this.engine.filterOptions.search.getValue = (function() {
                let prepend = this.dispatcher.graphsManager.plugin.settings.globalFilter + " ";
                return prepend + this.engine.filterOptions.search.inputEl.value;
            }).bind(this);
            this.hasChangedFilterSearch = true;
        }
    }

    onload() : void {
        this.initSets().then(() => {
            // Obsidian handles search filter after loading the graph. Which
            // means that it will first load and trigger changes with all nodes,
            // creating a lot of Promises.
            this.removeAdditionalData();

            this.dispatcher.onGraphReady();
        }).catch(e => {
            console.error(e);
        });
    }

    onunload() : void {
        if (this.hasChangedFilterSearch) {
            this.engine.filterOptions.search.getValue = (function() {
                return this.filterOptions.search.inputEl.value;
            }).bind(this.engine);
        }
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
            for (const nodeID of invalidNodes) {
                let wrapper = this.nodesSet.nodesMap.get(nodeID);
                wrapper?.parent?.removeChild(wrapper);
                wrapper?.destroy({children:true});
                this.nodesSet.nodesMap.delete(nodeID);
                this.nodesSet.connectedNodes.delete(nodeID);
                for (const set of Object.values(this.nodesSet.disconnectedNodes)) {
                    set.delete(nodeID);
                }
            }
        }

        // Remove invalid links
        if (this.linksSet.linkTypesMap) {
            let invalidLinks = new Set<string>();
            for (const [linkID, l] of this.linksSet.linksMap.entries()) {
                if (!l) continue;
                if (!this.nodesSet.nodesMap.get(l.link.source.id) || !this.nodesSet.nodesMap.get(l.link.target.id)) {
                    invalidLinks.add(linkID);
                }
            }
            
            if (invalidLinks.size > 0) {
                let invalidLinkTypes = new Set<string>();
                for (const linkID of invalidLinks) {
                    this.linksSet.linkTypesMap.forEach((linkForType, type) => {
                        if (linkForType.has(linkID)) {
                            linkForType.delete(linkID);
                            if (linkForType.size === 0) {
                                invalidLinkTypes.add(type);
                            }
                        }
                    });
                    this.linksSet.linksMap.get(linkID)?.wrapper?.destroy({children:true});
                    this.linksSet.linksMap.delete(linkID);
                    this.linksSet.connectedLinks.delete(linkID);
                    for (const set of Object.values(this.linksSet.disconnectedLinks)) {
                        set.delete(linkID);
                    }
                }
                if (invalidLinkTypes.size > 0) {
                    this.linksSet.linksManager?.removeTypes(invalidLinkTypes);
                }
            }
        }
    }

    async initSets() : Promise<void> {
        // Sleep for a short duration to let time to the engine to apply user filters
        await new Promise(r => setTimeout(r, 200));

        this.nodesSet.load();
        this.linksSet.load();

        this.removeAdditionalData();

        // Update node opacity layer colors
        if (this.settings.fadeOnDisable) {
            this.nodesSet?.updateOpacityLayerColor();
        }
    }

    disableLinkTypes(types: string[]) : boolean {
        const links = this.linksSet.getLinks(types);
        if (links) {
            this.disableLinks(links);
            return true;
        }
        return false;
    }

    enableLinkTypes(types: string[]) : boolean {
        const links = this.linksSet.getLinks(types);
        if (links) {
            this.enableLinks(links);
            return true;
        }
        return false;
    }

    /*
    disableOrphans() : boolean {
        if (this.engine.options.showOrphans) return false;

        let newOrphans = [...this.nodesSet.connectedNodes].filter(id => {
            return this.nodesSet.nodesMap.get(id)?.node.renderer && this.nodeIsOrphan(id);
        });
        if (newOrphans.length === 0) return false;

        console.log(this.engine.options.showOrphans, newOrphans);
        this.nodesSet.disableNodes(newOrphans, DisconnectionCause.ORPHAN);
        return true;
    }
    enableOrphans() : boolean {
        if (this.engine.options.showOrphans) {
            let oldOrphans = this.nodesSet.disconnectedNodes[DisconnectionCause.ORPHAN];
            if (oldOrphans.size === 0) return false;

            this.nodesSet.enableNodes([...oldOrphans], DisconnectionCause.ORPHAN);
            return true;
        }
        else {
            let oldOrphans = this.nodesSet.disconnectedNodes[DisconnectionCause.ORPHAN];
            let nonOrphans = [...oldOrphans].filter(id => !this.nodeIsOrphan(id));
            if (nonOrphans.length === 0) return false;
            
            this.nodesSet.enableNodes(nonOrphans, DisconnectionCause.ORPHAN);
            return true;
        }
    }
    nodeIsOrphan(id: string) : boolean {
        for (const linkID of this.linksSet.connectedLinks) {
            const link = this.linksSet.linksMap.get(linkID)?.link;
            if (!link) continue;
            if (link.source.id === id || link.target.id === id) return false;
        }
        return true;
    }
    */

    disableLinks(ids: Set<string>) {
        this.linksSet.disableLinks(ids, DisconnectionCause.USER);

        if (this.settings.removeSource || this.settings.removeTarget) {
            let nodesToDisable = new Set<string>();
            for (const id of ids) {
                let link = this.linksSet.linksMap.get(id)?.link;
                if (!link) continue;

                if (this.settings.removeSource && this.nodesSet.connectedNodes.has(link.source.id)) {
                    nodesToDisable.add(link.source.id);
                }
                if (this.settings.removeTarget && this.nodesSet.connectedNodes.has(link.target.id)) {
                    nodesToDisable.add(link.target.id);
                }
            }
            this.nodesSet.disableNodes([...nodesToDisable], DisconnectionCause.LINK_CASCADE);

            let additionalLinksToDisable = this.findLinksToDisable(nodesToDisable);
            this.linksSet.disableLinks(additionalLinksToDisable, DisconnectionCause.LINK_CASCADE);
        }

        //this.disableOrphans();
    }

    enableLinks(ids: Set<string>) {
        this.linksSet.enableLinks(ids, DisconnectionCause.USER);

        if (this.settings.removeSource || this.settings.removeTarget) {
            let nodesToEnable = new Set<string>();
            for (const id of ids) {
                let link = this.linksSet.linksMap.get(id)?.link;
                if (!link) continue;

                if (this.settings.removeSource && this.nodesSet.disconnectedNodes[DisconnectionCause.LINK_CASCADE].has(link.source.id)) {
                    nodesToEnable.add(link.source.id);
                }
                if (this.settings.removeTarget && this.nodesSet.disconnectedNodes[DisconnectionCause.LINK_CASCADE].has(link.target.id)) {
                    nodesToEnable.add(link.target.id);
                }
            }
            this.nodesSet.enableNodes([...nodesToEnable], DisconnectionCause.LINK_CASCADE);

            let additionalLinksToEnable = this.findLinksToEnable(nodesToEnable, DisconnectionCause.LINK_CASCADE);
            this.linksSet.enableLinks(additionalLinksToEnable, DisconnectionCause.LINK_CASCADE);
        }

        //this.enableOrphans();
    }

    findLinksToDisable(nodeIds: Set<string>) : Set<string> {
        let linksToDisable = new Set<string>();
        for (const id of nodeIds) {
            let node = this.nodesSet.nodesMap.get(id)?.node;
            if (!node) continue;
            for (const forward in node.forward) {
                const linkID = getLinkID({source: {id: id}, target: {id: forward}});
                this.linksSet.connectedLinks.has(linkID) && linksToDisable.add(linkID);
            }
            for (const reverse in node.reverse) {
                const linkID = getLinkID({source: {id: reverse}, target: {id: id}});
                this.linksSet.connectedLinks.has(linkID) && linksToDisable.add(linkID);
            }
        }
        return linksToDisable;
    }

    findLinksToEnable(nodeIds: Set<string>, cause: string) : Set<string> {
        let linksToEnable = new Set<string>();
        for (const id of nodeIds) {
            let node = this.nodesSet.nodesMap.get(id)?.node;
            if (!node) continue;
            for (const forward in node.forward) {
                const linkID = getLinkID({source: {id: id}, target: {id: forward}});
                this.linksSet.disconnectedLinks[cause].has(linkID) && linksToEnable.add(linkID);
            }
            for (const reverse in node.reverse) {
                const linkID = getLinkID({source: {id: reverse}, target: {id: id}});
                this.linksSet.disconnectedLinks[cause].has(linkID) && linksToEnable.add(linkID);
            }
        }
        return linksToEnable;
    }

    disableNodes(ids: string[]) {
        this.nodesSet.disableNodes(ids, DisconnectionCause.USER);

        let linksToDisable = this.findLinksToDisable(new Set<string>(ids));
        this.linksSet.disableLinks(linksToDisable, DisconnectionCause.NODE_CASCADE);
    }

    enableNodes(ids: string[]) {
        this.nodesSet.enableNodes(ids, DisconnectionCause.USER);

        let linksToEnable = this.findLinksToEnable(new Set<string>(ids), DisconnectionCause.NODE_CASCADE);
        this.linksSet.enableLinks(linksToEnable, DisconnectionCause.NODE_CASCADE);
    }
        
    updateWorker() : void {
        let nodes: { [node: string] : number[]} = {};
        for (const id of this.nodesSet.connectedNodes) {
            let wrapper = this.nodesSet.nodesMap.get(id);
            (wrapper) && (nodes[id] = [wrapper.node.x, wrapper.node.y]);
        }
        let nodesToRemove = this.renderer.nodes.filter(n => !nodes.hasOwnProperty(n.id)).concat(this.findDuplicates(this.renderer.nodes).nodes);
        console.log("Nodes to send to the worker:", Object.keys(nodes));
        console.log("Nodes in the renderer:", this.renderer.nodes);
        console.log("Nodes to remove:", nodesToRemove);
        for (const node of nodesToRemove) {
            node.clearGraphics();
            this.renderer.nodes.remove(node);
        }

        let links: any[] = [];
        for (const id of this.linksSet.connectedLinks) {
            const l = this.linksSet.linksMap.get(id);
            (l) && links.push([l.link.source.id, l.link.target.id]);
        }

        console.log("Update Worker with", Object.keys(nodes).length, "nodes and", links.length, "links");

        this.renderer.worker.postMessage({
            nodes: nodes,
            links: links,
            alpha: .3,
            run: !0
        });

        console.log("Graph after message", this);
    }

    findDuplicates(nodes: ONode[]) {
        let sortedNodes = nodes.slice().sort((a, b) => {
            return a.id.localeCompare(b.id);
        });
        let duplicateNodes = [];
        for (let i = 0; i < sortedNodes.length - 1; i++) {
            if (sortedNodes[i + 1].id == sortedNodes[i].id) {
                duplicateNodes.push(sortedNodes[i]);
            }
        }
        console.log("Duplicate nodes:", duplicateNodes);
        return {
            nodes: duplicateNodes,
            links: []
        };
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
