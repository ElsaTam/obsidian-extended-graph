/**
 * Code from SkepticMystic
 * https://github.com/SkepticMystic/graph-analysis
 * 
 * Released under the GNU General Public License v3.0
 */

import { GraphologyGraph, LinkStat, LinkStatCalculator, ExtendedGraphInstances } from "../../internal";
import { Attributes, EdgeEntry } from "graphology-types";
import { CacheItem, getAllTags, getLinkpath, HeadingCache, ListItemCache, ReferenceCache, TagCache } from "obsidian";
import tokenizer from "sbd";

interface CoCitation {
    sentence: string[];
    measure: number;
    source: string;
    line: number;
}

interface LineSentences {
    line: number;
    linkSentence: number;
    linkSentenceStart: number;
    linkSentenceEnd: number;
    sentences: string[];
    link: ReferenceCache;
}

export class CoCitationsCalculator extends LinkStatCalculator {
    cache: { [source: string]: { [target: string]: number } } = {};

    constructor(stat: LinkStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "Co-Citations", graphologyGraph);
    }

    protected override async getStat(link: EdgeEntry<Attributes, Attributes>): Promise<number> {
        if (link.source in this.cache) {
            return this.cache[link.source][link.target];
        }

        const graphologyGraph = this.graphologyGraph;
        const g = graphologyGraph?.graphology;
        if (!g) return NaN;

        const source = link.source;
        const mdCache = ExtendedGraphInstances.app.metadataCache;
        const results: Record<string, number> = {};

        g.forEachInNeighbor(source, async (pre) => {
            const file = mdCache.getFirstLinkpathDest(pre, '');
            if (!file) return;

            const cache = mdCache.getFileCache(file);
            if (!cache?.links) return;

            const preCocitations: { [name: string]: [number, CoCitation[]] } = {};
            const allLinks = [...cache.links];
            if (cache.embeds) {
                allLinks.push(...cache.embeds);
            }
            const ownLinks = allLinks.filter((link) => {
                const linkFile = mdCache.getFirstLinkpathDest(
                    getLinkpath(link.link),
                    file.path
                );
                if (!linkFile) return false;

                return linkFile.path === source;
            })

            const cachedRead = await ExtendedGraphInstances.app.vault.cachedRead(file);
            const lines = cachedRead.split('\n');

            // Find the sentence the link is in
            const ownSentences: LineSentences[] =
                ownLinks.map((link) => {
                    let line = lines[link.position.end.line];
                    const sentences = tokenizer.sentences(line, {
                        preserve_whitespace: true,
                    });
                    let [linkSentence, linkSentenceStart, linkSentenceEnd] = this.findSentence(sentences, link);
                    return { sentences, link, line: link.position.end.line, linkSentence, linkSentenceStart, linkSentenceEnd };

                });

            const ownListItems: ListItemCache[] = cache.listItems ?
                cache.listItems.filter((listItem) => {
                    return ownLinks.find((link) =>
                        link.position.start.line >= listItem.position.start.line &&
                        link.position.end.line <= listItem.position.end.line)
                }) : [];

            // Find the section the link is in
            const ownSections = ownLinks.map((link) =>
                cache.sections?.find(
                    (section) =>
                        section.position.start.line <= link.position.start.line &&
                        section.position.end.line >= link.position.end.line
                )
            );

            // Find the headings the link is under
            let minHeadingLevel = 7;
            let maxHeadingLevel = 0;
            const ownHeadings: [HeadingCache, number][] = [];
            const cacheHeadings = cache.headings;
            if (cacheHeadings) {
                ownLinks.forEach((link) => {
                    if (!cache.headings) return;
                    cache.headings.forEach((heading, index) => {
                        minHeadingLevel = Math.min(minHeadingLevel, heading.level);
                        maxHeadingLevel = Math.max(maxHeadingLevel, heading.level);
                        // The link falls under this header!
                        if (heading.position.start.line <= link.position.start.line) {
                            for (const j of Array(cacheHeadings.length - index - 1).keys()) {
                                let nextHeading = cacheHeadings[j + index + 1];
                                // Scan for the next header with at least as low of a level
                                if (nextHeading.level >= heading.level) {
                                    if (
                                        nextHeading.position.start.line <= link.position.start.line
                                    )
                                        return;
                                    ownHeadings.push([heading, nextHeading.position.start.line]);
                                    return;
                                }
                            }
                            // No more headers after this one. Use arbitrarily number for length to keep things simple...
                            ownHeadings.push([heading, 100000000000]);
                        }
                    })
                });
            }
            minHeadingLevel =
                cache.headings && cache.headings.length > 0 ? minHeadingLevel : 0;
            maxHeadingLevel =
                cache.headings && cache.headings.length > 0 ? maxHeadingLevel : 0;

            // Intuition of weight: The least specific heading will give the weight 2 + maxHeadingLevel - minHeadingLevel
            // We want to weight it 1 factor less.
            const minScore = 1 / Math.pow(2, 4 + maxHeadingLevel - minHeadingLevel);

            const coCiteCandidates: CacheItem[] = [...allLinks];
            if (cache.tags) {
                coCiteCandidates.push(...cache.tags);
            }
            coCiteCandidates.forEach((item) => {
                let linkPath: string | null = null;
                if ('link' in item) {
                    const linkFile = mdCache.getFirstLinkpathDest(
                        getLinkpath((item as ReferenceCache)?.link ?? '') ?? '',
                        file.path
                    );
                    if (!linkFile) {
                        linkPath = (item as ReferenceCache).link;
                    }
                    else {
                        // Something is happening here where imgs aren't being added to preCocitations...
                        // I think it's because only the basename is being added as a key, but the whole path is needed when accessing it for `results`
                        linkPath = linkFile.path;
                        if (linkPath === source) return;
                    }
                } else if ('tag' in item) {
                    linkPath = (item as TagCache).tag;
                } else return;

                // Initialize to 0 if not set yet
                if (!(linkPath in preCocitations)) {
                    preCocitations[linkPath] = [0, []];
                }

                const lineContent = lines[item.position.start.line];
                // Check if the link is on the same line
                let hasOwnLine = false;
                ownSentences.forEach((lineSentence) => {
                    // On the same line
                    if (item.position.start.line === lineSentence.line) {
                        const [itemSentence, itemSentenceStart, itemSentenceEnd] = this.findSentence(lineSentence.sentences, item);
                        const ownLink = lineSentence.link;
                        const m1Start = Math.min(
                            item.position.start.col,
                            ownLink.position.start.col
                        );
                        const m1End = Math.min(
                            item.position.end.col,
                            ownLink.position.end.col
                        );
                        const m2Start = Math.max(
                            item.position.start.col,
                            ownLink.position.start.col
                        );
                        const m2End = Math.max(
                            item.position.end.col,
                            ownLink.position.end.col
                        );
                        // Break sentence up between the two links. Used for rendering
                        const slicedSentence = [
                            lineContent.slice(Math.min(itemSentenceStart, lineSentence.linkSentenceStart), m1Start),
                            lineContent.slice(m1Start, m1End),
                            lineContent.slice(m1End, m2Start),
                            lineContent.slice(m2Start, m2End),
                            lineContent.slice(m2End, Math.max(itemSentenceEnd, lineSentence.linkSentenceEnd)),
                        ];

                        let measure = 1 / 2;
                        const sentenceDist = Math.abs(itemSentence - lineSentence.linkSentence);

                        // Granularity of sentence distance scores
                        if (sentenceDist === 0) {
                            measure = 1;
                        }
                        else if (sentenceDist === 1) {
                            measure = 0.85;
                        }
                        else if (sentenceDist === 2) {
                            measure = 0.7;
                        }
                        else if (sentenceDist === 3) {
                            measure = 0.6;
                        }

                        preCocitations[linkPath][0] = Math.max(measure, preCocitations[linkPath][0]);
                        preCocitations[linkPath][1].push({
                            sentence: slicedSentence,
                            measure,
                            source: pre,
                            line: lineSentence.line,
                        });

                        // We have to run this for every OwnSentence since there might be multiple on the same line
                        hasOwnLine = true;
                    }
                })
                if (hasOwnLine) return;

                const sentence = [
                    lineContent.slice(0, item.position.start.col),
                    lineContent.slice(item.position.start.col, item.position.end.col),
                    lineContent.slice(item.position.end.col, lineContent.length),
                ];

                // Check if in an outline hierarchy
                const listItem: ListItemCache | undefined =
                    cache?.listItems?.find((listItem) =>
                        item.position.start.line >= listItem.position.start.line &&
                        item.position.end.line <= listItem.position.end.line
                    );
                let foundHierarchy = false;
                if (listItem) {
                    ownListItems.forEach((ownListItem) => {
                        // Shared parent is good!
                        if (ownListItem.parent === listItem.parent) {
                            this.addPreCocitation(preCocitations, linkPath, 0.4, sentence, pre, item.position.start.line);
                            foundHierarchy = true;
                            return;
                        }

                        // If one of the appearances is further down the hierachy,
                        //   but in the same one,
                        //   that is also nice! But has to be done in both directions
                        // First, up from ownListItem
                        const findInHierarchy = function (from: ListItemCache, to: ListItemCache): boolean {
                            let iterListItem: ListItemCache | undefined = from;
                            let distance = 1;
                            // Negative parents denote top-level list items
                            while (iterListItem && iterListItem.parent > 0) {
                                if (iterListItem.parent === to.position.start.line) {
                                    let measure = 0.3;
                                    if (distance === 1) {
                                        measure = 0.6;
                                    }
                                    else if (distance === 2) {
                                        measure = 0.5;
                                    }
                                    else if (distance === 3) {
                                        measure = 0.4;
                                    }
                                    else if (distance === 4) {
                                        measure = 0.35;
                                    }
                                    this.addPreCocitation(preCocitations, linkPath, measure, sentence, pre, item.position.start.line);
                                    return true;
                                }
                                distance += 1;
                                // Move to the parent
                                iterListItem = cache.listItems?.find((litem) =>
                                    iterListItem?.parent === litem.position.start.line);
                            }
                            return false;
                        }
                        if (findInHierarchy(ownListItem, listItem) || findInHierarchy(listItem, ownListItem)) {
                            foundHierarchy = true;
                        }
                    })
                }
                if (foundHierarchy) return;


                // Check if it is in the same paragraph
                const sameParagraph = ownSections.find(
                    (section) =>
                        section &&
                        section.position.start.line <= item.position.start.line &&
                        section.position.end.line >= item.position.end.line
                );
                if (sameParagraph) {
                    this.addPreCocitation(preCocitations, linkPath, 1 / 4, sentence, pre, item.position.start.line);
                    return;
                }

                // Find the best corresponding heading
                const headingMatches = ownHeadings.filter(
                    ([heading, end]) =>
                        heading.position.start.line <= item.position.start.line &&
                        end > item.position.end.line
                );
                if (headingMatches.length > 0) {
                    const bestLevel = Math.max(
                        ...headingMatches.map(([heading, _]) => heading.level)
                    );
                    // Intuition: If they are both under the same 'highest'-level heading, they get weight 1/4
                    // Then, maxHeadingLevel - bestLevel = 0, so we get 1/(2^2)=1/4. If the link appears only under
                    // less specific headings, the weight will decrease.
                    const score = 1 / Math.pow(2, 3 + maxHeadingLevel - bestLevel);
                    this.addPreCocitation(preCocitations, linkPath, score, sentence, pre, item.position.start.line);
                    return;
                }

                // The links appear together in the same document, but not under a shared heading
                this.addPreCocitation(preCocitations, linkPath, minScore, sentence, pre, item.position.start.line);
            })

            getAllTags(cache)?.forEach((tag) => {
                if (!(tag in preCocitations)) {
                    // Tag defined in YAML. Gets the lowest score (has no particular position)

                    preCocitations[tag] = [
                        minScore,
                        [
                            {
                                measure: minScore,
                                sentence: ['', '', ''],
                                source: pre,
                                line: 0,
                            },
                        ],
                    ];
                }
            })

            // Add the found weights to the results
            for (let key in preCocitations) {
                const file = mdCache.getFirstLinkpathDest(key, '');
                let name = null;
                let resolved = true;
                if (file) {
                    name = file.path;
                } else if (key[0] === '#') {
                    name = key;
                } else {
                    name = key + '.md';
                    resolved = false;
                }
                let cocitation = preCocitations[key];
                if (name in results) {
                    results[name] += cocitation[0];
                } else {
                    results[name] = cocitation[0];
                }
            }
        })
        results[source] = 0;
        this.cache[link.source] = results;

        return results[link.target];
    }

    private findSentence(sentences: string[], link: CacheItem): [number, number, number] {
        let aggrSentenceLength = 0
        let count = 0
        for (const sentence of sentences) {
            const nextLength = aggrSentenceLength + sentence.length
            // Edge case that does not work: If alias has end of sentences.
            if (link.position.end.col <= nextLength) {
                return [count, aggrSentenceLength, nextLength]
            }
            aggrSentenceLength = nextLength
            count += 1
        }
        return [-1, 0, aggrSentenceLength]
    }

    private addPreCocitation(preCocitations: { [name: string]: [number, CoCitation[]] },
        linkPath: string,
        measure: number,
        sentence: string[],
        source: string,
        line: number) {
        preCocitations[linkPath][0] = Math.max(
            preCocitations[linkPath][0],
            measure
        )
        preCocitations[linkPath][1].push({
            sentence,
            measure,
            source,
            line,
        })
    }
}