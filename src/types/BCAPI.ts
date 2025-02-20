type Neighbor = {
    field: string,
    implied?: boolean,
    to: string
};

type Direction = 'up' | 'same' | 'down' | 'next' | 'prev'

export interface BCAPI {
    ARROW_DIRECTIONS: Record<Direction, string>;
    DIRECTIONS: Direction[];
    buildObsGraph: () => void;
    closedG: any;
    createIndex: (allPaths: string[], wikilinks?: boolean, indent?: string) => {};
    dfsAllPaths: (fromNode?: string) => {};
    getFieldInfo: (field: string) => {};
    getFields: (dir: string) => {};
    getMatrixNeighbours: (fromNode?: string) => Record<Direction, { reals: Neighbor[], implieds: Neighbor[]}>;
    getOppDir: (dir: string) => string;
    getOppFields: (field: string) => {};
    getSubForFields: (fields: string[], g?: any) => any;
    getSubInDirs: (dirs: string[], g?: any) => any;
    mainG: any;
    plugin: BreadcrumbsPlugin;
    refreshIndex: () => Promise<void>;
}

interface BreadcrumbsPlugin {
    settings: {
        userHiers: Record<Direction, string[]>[],
    }
}