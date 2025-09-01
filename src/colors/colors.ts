import { HexString } from 'obsidian';
import { getSortedColorAndStopPoints, getCMapData } from './colormaps';
import { ExtendedGraphSettings } from '../internal';
import * as Color from './color-bits';
import chroma from 'chroma-js';
import { Color as PixiColor, TextStyleFill, ColorSource } from "pixi.js";

export function rgb2int(rgb: number[]): Color.Color {
    return Color.newColor(rgb[0], rgb[1], rgb[2]);
}

export function rgb2hex(rgb: number[]): HexString {
    return int2hex(rgb2int(rgb));
}

export function int2hex(n: Color.Color): HexString {
    return Color.formatHEX(n);
}

export function hex2int(hex: string): Color.Color {
    return Color.parseHex(hex).rgb;
}

export function textColor(backgroundColor: Color.Color, dark: string = "black", light: string = "white"): string {
    return (Color.getRed(backgroundColor) * 0.299 + Color.getGreen(backgroundColor) * 0.587 + Color.getBlue(backgroundColor) * 0.114 > 150) ? dark : light;
}

export function pixiColor2int(color: ColorSource): Color.Color {
    return new PixiColor(color).toNumber();
}

export function pixiColor2hex(color: ColorSource): HexString {
    return new PixiColor(color).toHex();
}

export function textStyleFill2int(fill: TextStyleFill) {
    if (typeof fill === "string") {
        return hex2int(fill);
    }
    else if (typeof fill === "number") {
        return fill;
    }
    else if (Array.isArray(fill)) {
        const middle = fill[Math.floor(fill.length / 2)];
        if (typeof middle === "string") {
            return hex2int(middle);
        }
        else if (typeof middle === "number") {
            return middle;
        }
    }
    else if (fill instanceof CanvasGradient || fill instanceof CanvasPattern) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (ctx) {
            canvas.width = 100;
            canvas.height = 100;
            ctx.fillStyle = fill;
            ctx.fillRect(0, 0, 100, 100);
            const pixelData = ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1);
            return rgb2int([pixelData.data[0], pixelData.data[1], pixelData.data[2]]);
        }
        canvas.detach();
    }
}

export function plotColorMapFromName(canvas: HTMLCanvasElement, name: string, settings: ExtendedGraphSettings) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let data = getCMapData(name, settings);
    if (!data) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    plotColorMap(canvas, data.reverse, data.interpolate, data.colors, data.stops);
}

/**
 * 
 * @param canvas 
 * @param reverse 
 * @param interpolate 
 * @param colors - Between 0 and 1
 * @param stops 
 * @returns 
 */
export function plotColorMap(canvas: HTMLCanvasElement, reverse: boolean, interpolate: boolean, colors: Color.Color[], stops?: number[]) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { colors: sortedColors, stops: sortedStops } = getSortedColorAndStopPoints(colors, stops);

    /*
    // Display the values from the sampling algorithm rather than the canvas methods
    for (let x = 0; x <= 256; x++) {
        const color = sampleColor(x / 256, interpolate, sortedColors, sortedStops, reverse);
        const r = color[0];
        const g = color[1];
        const b = color[2];
        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        ctx.fillRect(x * canvas.width / 256, 0, canvas.width / 256, canvas.height);
    }
    return;
    */

    if (interpolate) {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        for (let i = 0; i < sortedColors.length; ++i) {
            const stop = sortedStops[i];
            gradient.addColorStop(stop, Color.formatHEX(sortedColors[i]));
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    else {
        for (let i = 0; i < sortedColors.length; ++i) {
            const stopPrevious = i === 0 ? 0 : sortedStops[i];
            const stopNext = i === sortedColors.length - 1 ? 1 : sortedStops[Math.min(i + 1, sortedStops.length - 1)];
            ctx.fillStyle = Color.formatHEX(sortedColors[i]);
            ctx.fillRect(stopPrevious * canvas.width, 0, stopNext * canvas.width, canvas.height);
        }
    }

    canvas.addClass("palette-canvas");
    canvas.toggleClass("reversed", reverse);
}

export function randomColor(): Color.Color {
    return GoldenColor.random(50, 95);
}

class GoldenColor {
    private static goldenRatioConjugate: number = 0.618033988749895;
    private static h: number = Math.random();

    private constructor() { }

    public static random(s: number = 50, v: number = 95): Color.Color {
        GoldenColor.h += GoldenColor.goldenRatioConjugate;
        GoldenColor.h %= 1;
        const color = chroma.hsl(Math.floor(GoldenColor.h * 360), s, v);
        return color.num();
    }
}

// Get the average color of an emoji
export function getEmojiColor(emoji: string): Color.Color | undefined {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
        canvas.width = 30;
        canvas.height = 30;
        ctx.font = `20px "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "Android Emoji", EmojiSymbols, Symbola, "Twemoji Mozilla", "Twemoji Mozilla Color Emoji", "Twemoji Mozilla Color Emoji 13.1.0"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, canvas.width / 2, canvas.height / 2);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        let rSum = 0, gSum = 0, bSum = 0;
        let pixelCount = 0;

        for (let i = 0; i < pixels.length; i += 4) {
            // Only consider non-transparent pixels
            if (pixels[i + 3] > 0) {
                rSum += pixels[i];
                gSum += pixels[i + 1];
                bSum += pixels[i + 2];
                pixelCount++;
            }
        }

        const avgR = Math.round(rSum / pixelCount);
        const avgG = Math.round(gSum / pixelCount);
        const avgB = Math.round(bSum / pixelCount);

        return rgb2int([avgR, avgG, avgB]);
    }
}

function smoothChannelChange(e: number, t: number, n?: number) {
    return void 0 === n && (n = .9),
        e * n + t * (1 - n)
}
export function smoothColorChange(from: Color.Color, to: Color.Color) {
    return Color.newColor(
        smoothChannelChange(Color.getRed(from), Color.getRed(to)),
        smoothChannelChange(Color.getGreen(from), Color.getGreen(to)),
        smoothChannelChange(Color.getBlue(from), Color.getBlue(to))
    );
}