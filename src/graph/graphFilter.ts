import Graphology from 'graphology';
import { undirectedSingleSourceLength } from 'graphology-shortest-path/unweighted';
import { TFile } from "obsidian";
import { GraphColorAttributes, GraphData, GraphNode, LocalGraphView } from "obsidian-typings";
import { getFile, getFileInteractives, getOutlinkTypes, regExpFromString, TAG_KEY } from "../internal";
import { GraphInstances, ExtendedGraphInstances } from "../pluginInstances";

interface GraphNodeData {
    type: string;
    links: Record<string, boolean>;
    color?: GraphColorAttributes;
}

export class GraphFilter {
    instances: GraphInstances;

    constructor(instances: GraphInstances) {
        this.instances = instances;
    }

    filterData(data: GraphData): GraphData {
        // Filter out nodes
        this.excludeNodes(data);

        this.addExternalLinks(data);

        let nodesToRemove: string[] = [];

        const potentialOrphans: string[] = [];
        let dataNodesEntries = Object.entries(data.nodes);
        for (const [source, node] of dataNodesEntries) {
            if (this.flagAsPotentialOrphan(node, source, potentialOrphans)) {
                continue;
            }

            const file = getFile(source);
            if (file) {
                if (this.filterLinksByFolders(node, source, potentialOrphans)) {
                    continue;
                }

                this.ignoreInlineLinks(file, node);
                this.filterLinksByTypes(file, node, source, nodesToRemove);

                if (this.flagAsPotentialOrphan(node, source, potentialOrphans)) {
                    continue;
                }
            }

            // Actually remove source and targets
            for (const id of nodesToRemove) {
                delete data.nodes[id];
            }
            nodesToRemove = [];
        }

        data = this.filterOrphans(data, potentialOrphans);

        ExtendedGraphInstances.graphsManager.updateStatusBarItem(this.instances.view.leaf, Object.keys(data.nodes).length);

        return data;
    }

    private excludeNodes(data: GraphData) {
        const nodesToRemove: string[] = [];
        for (const [id, node] of Object.entries(data.nodes)) {
            if (this.shouldRemoveNode(id, node)) {
                nodesToRemove.push(id);
            }
        }

        const nodesToKeep = Object.keys(data.nodes).filter(id => !nodesToRemove.includes(id));
        for (const id of nodesToRemove) {
            delete data.nodes[id];

            for (const sourceID of nodesToKeep.filter(source => id in data.nodes[source].links)) {
                delete data.nodes[sourceID].links[id]
            }
        }

    }

    private shouldRemoveNode(id: string, node: GraphNodeData): boolean {
        for (const filter of this.instances.settings.filterAbstractFiles) {
            if (new RegExp(filter.regex, filter.flag).test(id)) {
                return true;
            }
        }

        if (this.instances.settings.enableFeatures[this.instances.type].layers && this.instances.layersManager?.isEnabled) {
            if (this.instances.settings.nodesWithoutLayerOpacity === 0 && this.instances.layersManager.notInLayers.nodeIDs.contains(id)) {
                return true;
            }
            if (this.instances.layersManager.nodeLookup[id]?.group.alpha === 0) {
                return true;
            }
        }

        if (!this.instances.settings.fadeOnDisable) {
            // Remove file nodes
            const file = getFile(id);
            if (file) {
                for (const [key, manager] of this.instances.nodesSet.managers) {
                    const settings = this.instances.settings.interactiveSettings[key];
                    let interactives = getFileInteractives(key, file, this.instances.settings);
                    if (interactives === null) {
                        // Property doesn't exist
                        interactives = new Set([settings.undefinedType ?? settings.noneType]);
                    } else if (interactives.size === 0) {
                        // Property exists but is empty
                        interactives.add(settings.noneType);
                    }
                    if (interactives.size > 0 && !manager.isActiveBasedOnTypes([...interactives])) {
                        return true;
                    }
                }
            }

            // Remove tag nodes
            else if (node.type === 'tag' && this.instances.settings.enableFeatures[this.instances.type]['tags']) {
                const manager = this.instances.interactiveManagers.get(TAG_KEY);
                if (manager && !manager.isActiveBasedOnTypes([id.replace('#', '')])) {
                    return true;
                }
            }
        }

        return false;
    }

    private filterOrphans(data: GraphData, potentialOrphans: string[]): GraphData {
        // Filter existing orphans
        if (!this.instances.engine.options.showOrphans) {
            const remainingNodes = Object.values(data.nodes);
            for (const source of potentialOrphans) {
                if (!remainingNodes.find(n => source in n.links)) {
                    delete data.nodes[source];
                }
            }
        }

        // Filter non-existing orphans or tags
        const remainingNodes = Object.values(data.nodes);
        const invalidOrphans = Object.entries(data.nodes)
            .filter(([id, node]) =>
                (node.type === 'unresolved' || node.type === 'tag')
                && !remainingNodes.find(m => id in m.links)
            );
        for (const orphan of invalidOrphans) {
            delete data.nodes[orphan[0]];
        }

        return data;
    }

    private filterLinksByFolders(node: GraphNodeData, source: string, potentialOrphans: string[]): boolean {
        const matchFolder = (file: string, folder: string): boolean => {
            return regExpFromString(folder)?.test(file) ?? file.startsWith(folder);
        };

        // Filter out based on source folders
        if (this.instances.settings.enableFeatures[this.instances.type]['links']
            && this.instances.settings.excludedSourcesFolder.find(folder => matchFolder(source, folder))) {
            node.links = {};
            return true;
        }

        // Filter out based on target folders
        const targets = Object.keys(node.links);
        for (const target of targets) {
            if (this.instances.settings.enableFeatures[this.instances.type]['links']
                && this.instances.settings.excludedTargetsFolder.find(folder => matchFolder(target, folder))) {
                delete node.links[target];
            }
        }

        if (Object.keys(node.links).length === 0) {
            if (!this.instances.engine.options.showOrphans) {
                potentialOrphans.push(source);
            }
            return true;
        }

        return false;
    }

    private ignoreInlineLinks(file: TFile, node: GraphNodeData) {
        if (!this.instances.settings.ignoreInlineLinks) return;
        if (!node.links) return;

        const frontmatterLinks = ExtendedGraphInstances.app.metadataCache.getFileCache(file)?.frontmatterLinks;
        if (!frontmatterLinks) {
            node.links = {};
            return;
        }

        const validLinks = frontmatterLinks.map(cache => ExtendedGraphInstances.app.metadataCache.getFirstLinkpathDest(cache.link, file.path)?.path ?? cache.link);

        for (const target of Object.keys(node.links)) {
            if (!validLinks.contains(target)) {
                delete node.links[target];
            }
        }
    }

    private filterLinksByTypes(file: TFile, node: GraphNodeData, source: string, nodesToRemove: string[]) {
        for (const [key, manager] of this.instances.linksSet.managers) {
            const typedLinks = getOutlinkTypes(this.instances.settings, file); // id -> types
            const validTypedLinks = new Map([...typedLinks.entries()].reduce((acc: [string, Set<string>][], curr: [string, Set<string>]) => {
                curr[1] = new Set([...curr[1]].filter(type => manager.getTypes().includes(type)));
                if (curr[1].size > 0) {
                    acc.push(curr);
                }
                return acc;
            }, []));

            for (const [target, types] of validTypedLinks) {
                if (!(target in node.links)) continue;

                if (types.size > 0 && !manager.isActiveBasedOnTypes([...types])) {
                    // We can remove directly from the record since we are not iterating over the record
                    delete node.links[target];

                    // Remove source or target if settings enabled
                    if (this.instances.settings.disableSource) {
                        nodesToRemove.push(source);
                    }
                    if (this.instances.settings.disableTarget) {
                        nodesToRemove.push(target);
                    }
                }
            }

            if (!manager.isActiveBasedOnTypes([this.instances.settings.interactiveSettings[manager.name].noneType])) {
                const noneTargets = Object.keys(node.links).filter(target => !validTypedLinks.has(target));
                for (const target of noneTargets) {
                    delete node.links[target];
                }
            }
        }
    }

    private flagAsPotentialOrphan(node: GraphNodeData, source: string, potentialOrphans: string[]): boolean {
        if (Object.keys(node.links).length === 0) {
            if (!this.instances.engine.options.showOrphans) {
                potentialOrphans.push(source);
            }
            return true;
        }
        return false;
    }

    private addExternalLinks(data: GraphData) {
        if (!this.instances.engine.options.showAttachments) return;
        if (this.instances.settings.ignoreInlineLinks) return;

        let addedURLs: string[] = [];
        const nodeIDs = Object.keys(data.nodes);
        for (const nodeID of nodeIDs) {
            const URLs = this.instances.nodesSet.getExternalLinks(nodeID);
            for (const url of URLs) {
                if (url.href) {
                    data.numLinks++;
                    data.nodes[nodeID].links[url.href] = true;
                    if (!(url.href in data.nodes)) {
                        addedURLs.push(url.href);
                        data.nodes[url.href] = {
                            color: this.instances.renderer.colors.fillAttachment,
                            type: "attachment",
                            links: {}
                        };
                    }
                }
                if (url.domain) {
                    data.numLinks++;
                    if (!(url.domain in data.nodes)) {
                        addedURLs.push(url.domain);
                        data.nodes[url.domain] = {
                            color: this.instances.renderer.colors.fillAttachment,
                            type: "attachment",
                            links: {}
                        };
                    }
                    if (url.href) {
                        data.nodes[url.href].links[url.domain] = true;
                    }
                    else {
                        data.nodes[nodeID].links[url.domain] = true;
                    }
                }
            }
        }

        // If this is a local graph, we have to make sure we don't add nodes
        // that are too deep.
        // We clean it after adding them in order to keep the neighbor links if
        // they exist
        // So for example the following should not exist with a depth of 2:
        // Main --> A --> B --> external link
        // But this would work:
        // Main --> A --> external link
        //            --> B --> external link
        if (this.instances.type === "localgraph" && addedURLs.length > 0) {
            const mainNode = (this.instances.view as LocalGraphView).file?.path;
            const maxDepth = this.instances.engine.options.localJumps ?? 1;
            const graphology = new Graphology();
            for (const source in data.nodes) {
                if (!graphology.hasNode(source)) {
                    graphology.addNode(source);
                }
                for (const target in data.nodes[source].links) {
                    if (!graphology.hasNode(target)) {
                        graphology.addNode(target);
                    }
                    graphology.addDirectedEdge(source, target);
                }
            }
            const paths = undirectedSingleSourceLength(graphology, mainNode);
            for (const externalLink of addedURLs) {
                if (paths[externalLink] > maxDepth) {
                    delete data.nodes[externalLink];
                    data.numLinks--;
                }
            }
        }
    }
}
