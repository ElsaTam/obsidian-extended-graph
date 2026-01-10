/** 
 * All credits for this go to romgrk's color-bits code
 * https://github.com/romgrk/color-bits
 * 
 * I just adapted it to remove the alpha channel from the numeric result in 
 * order to comply with the {rgb: number, a: number} structure used in
 * Obsidian and Pixi (which doesn't support alpha in decimal colors)
 */


// ========================================================================== //
//                                     BIT                                  //
// ========================================================================== //

import chroma from "chroma-js";
import { GraphColorAttributes } from "obsidian-typings";


export function get(n: number, offset: number) {
    return (n >> offset) & 0xff;
}

export function set(n: number, offset: number, byte: number) {
    return n ^ ((n ^ (byte << offset)) & (0xff << offset));
}


// ========================================================================== //
//                                    CORE                                    //
// ========================================================================== //

export type Color = number;

export const OFFSET_R = 16;
export const OFFSET_G = 8;
export const OFFSET_B = 0;

/**
 * Creates a new color from the given RGBA components.
 * Every component should be in the [0, 255] range.
 */
export function newColor(r: number, g: number, b: number) {
    return (
        (r << OFFSET_R) +
        (g << OFFSET_G) +
        (b << OFFSET_B)
    );
}

/**
 * Creates a new color from the given number value, e.g. 0x599eff.
 */
export function from(color: number) {
    return newColor(
        get(color, OFFSET_R),
        get(color, OFFSET_G),
        get(color, OFFSET_B)
    );
}


export function getRed(c: Color) { return get(c, OFFSET_R); }
export function getGreen(c: Color) { return get(c, OFFSET_G); }
export function getBlue(c: Color) { return get(c, OFFSET_B); }

export function setRed(c: Color, value: number) { return set(c, OFFSET_R, value); }
export function setGreen(c: Color, value: number) { return set(c, OFFSET_G, value); }
export function setBlue(c: Color, value: number) { return set(c, OFFSET_B, value); }


// ========================================================================== //
//                                   FORMAT                                   //
// ========================================================================== //

// Return buffer, avoid allocations
const buffer = [0, 0, 0]

/**
 * Map 8-bits value to its hexadecimal representation
 * ['00', '01', '02', ..., 'fe', 'ff']
 */
const FORMAT_HEX =
    Array.from({ length: 256 })
        .map((_, byte) => byte.toString(16).padStart(2, '0'))

/** Format to a #RRGGBBAA string */
export function formatHEX(color: Color, a?: number): string {
    if (a === undefined) {
        return (
            '#' +
            FORMAT_HEX[getRed(color)] +
            FORMAT_HEX[getGreen(color)] +
            FORMAT_HEX[getBlue(color)]
        )
    }
    else {
        return (
            '#' +
            FORMAT_HEX[getRed(color)] +
            FORMAT_HEX[getGreen(color)] +
            FORMAT_HEX[getBlue(color)] +
            FORMAT_HEX[Math.round(a * 255)]
        )
    }
}

export function formatRGB(color: Color) {
    return `rgb(${getRed(color)} ${getGreen(color)} ${getBlue(color)}})`
}

export function toRGB(color: Color) {
    return {
        r: getRed(color),
        g: getGreen(color),
        b: getBlue(color),
    }
}

export function formatHSL(color: Color) {
    rgbToHSL(
        getRed(color),
        getGreen(color),
        getBlue(color),
    )
    const h = buffer[0]
    const s = buffer[1]
    const l = buffer[2]

    return `hsl(${h} ${s}% ${l}%})`
}

export function toHSL(color: Color) {
    rgbToHSL(
        getRed(color),
        getGreen(color),
        getBlue(color),
    )
    const h = buffer[0]
    const s = buffer[1]
    const l = buffer[2]

    return { h, s, l }
}

export function formatHWB(color: Color) {
    rgbToHWB(
        getRed(color),
        getGreen(color),
        getBlue(color),
    )
    const h = buffer[0]
    const w = buffer[1]
    const b = buffer[2]

    return `hsl(${h} ${w}% ${b}%)`
}

export function toHWB(color: Color) {
    rgbToHWB(
        getRed(color),
        getGreen(color),
        getBlue(color),
    )
    const h = buffer[0]
    const w = buffer[1]
    const b = buffer[2]

    return { h, w, b }
}

// Conversion functions

// https://www.30secondsofcode.org/js/s/rgb-hex-hsl-hsb-color-format-conversion/
function rgbToHSL(r: number, g: number, b: number) {
    r /= 255;
    g /= 255;
    b /= 255;

    const l = Math.max(r, g, b);
    const s = l - Math.min(r, g, b);
    const h = s
        ? l === r
            ? (g - b) / s
            : l === g
                ? 2 + (b - r) / s
                : 4 + (r - g) / s
        : 0;

    buffer[0] = 60 * h < 0 ? 60 * h + 360 : 60 * h
    buffer[1] = 100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0)
    buffer[2] = (100 * (2 * l - s)) / 2
}

// https://stackoverflow.com/a/29463581/3112706
function rgbToHWB(r: number, g: number, b: number) {
    r /= 255
    g /= 255
    b /= 255

    const w = Math.min(r, g, b)
    const v = Math.max(r, g, b)
    const black = 1 - v

    if (v === w) {
        buffer[0] = 0
        buffer[1] = w
        buffer[2] = black
        return
    }

    let f = r === w ? g - b : (g === w ? b - r : r - g);
    let i = r === w ? 3 : (g === w ? 5 : 1);

    buffer[0] = (i - f / (v - w)) / 6
    buffer[1] = w
    buffer[2] = black
}




// ========================================================================== //
//                                   PARSE                                    //
// ========================================================================== //


const HASH = '#'.charCodeAt(0);
const PERCENT = '%'.charCodeAt(0);
const G = 'g'.charCodeAt(0);
const N = 'n'.charCodeAt(0);
const D = 'd'.charCodeAt(0);
const E = 'e'.charCodeAt(0);



/**
 * Parse CSS color
 * @param color CSS color string: #xxx, #xxxxxx, #xxxxxxxx, rgb(), rgba(), hsl(), hsla(), color()
 */
export function parse(color: string): GraphColorAttributes {
    if (color.charCodeAt(0) === HASH) {
        return parseHex(color);
    } else {
        return parseCSS(color);
    }
}

/**
 * Parse hexadecimal CSS color
 * @param color Hex color string: #xxx, #xxxxxx, #xxxxxxxx
 */
export function parseHex(color: string): GraphColorAttributes {
    let r = 0x00;
    let g = 0x00;
    let b = 0x00;
    let a = 0xff;

    switch (color.length) {
        // #59f
        case 4: {
            r = (hexValue(color.charCodeAt(1)) << 4) + hexValue(color.charCodeAt(1));
            g = (hexValue(color.charCodeAt(2)) << 4) + hexValue(color.charCodeAt(2));
            b = (hexValue(color.charCodeAt(3)) << 4) + hexValue(color.charCodeAt(3));
            break;
        }
        // #5599ff
        case 7: {
            r = (hexValue(color.charCodeAt(1)) << 4) + hexValue(color.charCodeAt(2));
            g = (hexValue(color.charCodeAt(3)) << 4) + hexValue(color.charCodeAt(4));
            b = (hexValue(color.charCodeAt(5)) << 4) + hexValue(color.charCodeAt(6));
            break;
        }
        // #5599ff88
        case 9: {
            r = (hexValue(color.charCodeAt(1)) << 4) + hexValue(color.charCodeAt(2));
            g = (hexValue(color.charCodeAt(3)) << 4) + hexValue(color.charCodeAt(4));
            b = (hexValue(color.charCodeAt(5)) << 4) + hexValue(color.charCodeAt(6));
            a = (hexValue(color.charCodeAt(7)) << 4) + hexValue(color.charCodeAt(8));
            break;
        }
        default: {
            break;
        }
    }

    return { rgb: newColor(r, g, b), a: a };
}

// https://lemire.me/blog/2019/04/17/parsing-short-hexadecimal-strings-efficiently/
function hexValue(c: number) {
    return (c & 0xF) + 9 * (c >> 6)
}


export function parseCSS(color: string): GraphColorAttributes {
    try {
        const chromaColor = chroma(color);
        return { rgb: chromaColor.num(), a: chromaColor.alpha() }
    }
    catch (error) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw error;
        }
        canvas.width = 1;
        canvas.height = 1;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const rgb = ctx.getImageData(0, 0, 1, 1).data;
        return { rgb: newColor(rgb[0], rgb[1], rgb[2]), a: rgb[3] / 255 };
    }
}




// ========================================================================== //
//                                  FUNCTIONS                                 //
// ========================================================================== //

/**
 * Darkens a color.
 * @param color - Color
 * @param coefficient - Multiplier in the range [0, 1]
 */
export function darken(color: Color, coefficient: number): Color {
    const r = getRed(color)
    const g = getGreen(color)
    const b = getBlue(color)

    const factor = 1 - coefficient

    return newColor(
        Math.clamp(r * factor, 0, 255),
        Math.clamp(g * factor, 0, 255),
        Math.clamp(b * factor, 0, 255)
    )
}

/**
 * Lighten a color.
 * @param color - Color
 * @param coefficient - Multiplier in the range [0, 1]
 */
export function lighten(color: Color, coefficient: number): Color {
    const r = getRed(color)
    const g = getGreen(color)
    const b = getBlue(color)

    return newColor(
        Math.clamp(r + (255 - r) * coefficient, 0, 255),
        Math.clamp(g + (255 - g) * coefficient, 0, 255),
        Math.clamp(b + (255 - b) * coefficient, 0, 255)
    )
}

export function multiply(color: Color, coefficient: number): Color {
    return newColor(
        Math.clamp(getRed(color) * coefficient, 0, 255),
        Math.clamp(getGreen(color) * coefficient, 0, 255),
        Math.clamp(getBlue(color) * coefficient, 0, 255)
    )
}

/**
 * Blend (aka mix) two colors together.
 * @param background The background color
 * @param overlay The overlay color that is affected by @opacity
 * @param opacity Opacity (alpha) for @overlay
 * @param [gamma=1.0] Gamma correction coefficient. `1.0` to match browser behavior, `2.2` for gamma-corrected blending.
 */
export function blend(background: Color, overlay: Color, opacity: number, gamma = 1.0): Color {
    if (opacity <= 0) return background;
    if (opacity >= 1) return overlay;

    const blendChannel = (b: number, o: number) =>
        Math.round((b ** (1 / gamma) * (1 - opacity) + o ** (1 / gamma) * opacity) ** gamma)

    const r = blendChannel(getRed(background), getRed(overlay))
    const g = blendChannel(getGreen(background), getGreen(overlay))
    const b = blendChannel(getBlue(background), getBlue(overlay))

    return newColor(r, g, b)
}

/**
 * Blend multiple colors together with equal weight.
 * @param colors Array of colors to blend
 * @returns The blended color, or 0 if the array is empty
 */
export function blendMultiple(colors: Color[]): Color {
    if (colors.length === 0) return 0;
    if (colors.length === 1) return colors[0];

    let result = colors[0];
    for (let i = 1; i < colors.length; i++) {
        result = blend(result, colors[i], 1 / (i + 1));
    }
    return result;
}

/**
 * The relative brightness of any point in a color space, normalized to 0 for
 * darkest black and 1 for lightest white.
 * @returns The relative brightness of the color in the range 0 - 1, with 3 digits precision
 */
export function getLuminance(color: Color) {
    const r = getRed(color) / 255
    const g = getGreen(color) / 255
    const b = getBlue(color) / 255

    const apply = (v: number) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4

    const r1 = apply(r)
    const g1 = apply(g)
    const b1 = apply(b)

    return Math.round((0.2126 * r1 + 0.7152 * g1 + 0.0722 * b1) * 1000) / 1000
}