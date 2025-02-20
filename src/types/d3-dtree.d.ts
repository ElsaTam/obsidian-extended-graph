


declare module 'd3-dtree' {
    export type TreeOptions = {
        target: string,
        debug: boolean,
        width: number,
        height: number,
        hideMarriageNodes: boolean,
        marriageNodeSize: 10,
        callbacks: {},
        margin: {
            top: number,
            right: number,
            bottom: number,
            left: number,
        },
        nodeWidth: number,
        stryles: {
            node: string,
            linage: string,
            marriage: string,
            text: string
        }
    }
    export function init(seededData: any[], options?: Partial<TreeOptions>): any;
}