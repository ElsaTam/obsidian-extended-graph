export type Feature =
    'auto-enabled'
    | 'arrows'
    | 'elements-stats'
    | 'focus'
    | 'folders'
    | 'groups'
    | 'icons'
    | 'imagesForAttachments'
    | 'imagesFromEmbeds'
    | 'imagesFromProperty'
    | 'links'
    | 'linksSameColorAsNode'
    | 'names'
    | 'properties'
    | 'property-key'
    | 'shapes'
    | 'tags';
export type GraphType = 'graph' | 'localgraph';

export const graphTypeLabels: Record<GraphType, string> = {
    'graph': "Global",
    'localgraph': "Local"
}