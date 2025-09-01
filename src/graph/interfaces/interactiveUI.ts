import * as Color from '../../colors/color-bits';

export interface InteractiveUI {
    update: (key: string, type: string, color: Color.Color) => void;
    add: (key: string, type: string, color: Color.Color) => void;
    remove: (key: string, types: string[]) => void;
    toggle: (key: string, type: string) => void;
    disableUI: (key: string, type: string) => void;
    enableUI: (key: string, type: string) => void;
    enableAllUI: (key: string) => void;
    disableAllUI: (key: string) => void;
}