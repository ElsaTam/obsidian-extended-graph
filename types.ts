export interface ObsidianNode {
	id: string;
	weight: number;
}

export interface ObsidianRenderer {
	nodes: ObsidianNode[];
}

export interface ObsidianView {
	renderer: ObsidianRenderer;
}