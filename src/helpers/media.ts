import { arrayBufferToBase64, MarkdownRenderer, Platform, requestUrl } from "obsidian";
import { getFile, getLinkDestination, ExtendedGraphInstances, t } from "../internal";

export class Media {
    static async getImageUriFromProperty(keyProperty: string, id: string): Promise<string | null> {
        const metadata = ExtendedGraphInstances.app.metadataCache.getCache(id);
        if (!metadata) return null;

        const frontmatter = metadata.frontmatter;
        if (!frontmatter) return null;

        const values = frontmatter[keyProperty];

        if (typeof values === "string") {
            const uri = await Media.getImageUriFromLink(getLinkDestination(values));
            if (uri) return uri;
        }
        else if (Array.isArray(values)) {
            for (const value of values) {
                if (typeof value === "string") {
                    const uri = await Media.getImageUriFromLink(getLinkDestination(value));
                    if (uri) return uri;
                }
            }
        }

        return null;
    }

    static async getImageUriFromEmbeds(id: string): Promise<string | null> {
        const metadata = ExtendedGraphInstances.app.metadataCache.getCache(id);
        if (!metadata) return null;

        let embeds: string[] = metadata.embeds?.map(c => c.link) ?? [];
        if (embeds.length === 0) {
            const file = getFile(id);
            if (!file) return null;

            const data = await ExtendedGraphInstances.app.vault.cachedRead(file);
            const div = createDiv();
            await MarkdownRenderer.render(
                ExtendedGraphInstances.app,
                data,
                div,
                id,
                ExtendedGraphInstances.plugin
            );
            const images = Array.from(div.querySelectorAll("img")).map(img => img.src);
            const videos = Array.from(div.querySelectorAll("video")).map(vid => vid.src);
            embeds = embeds.concat(images.concat(videos));
        }

        for (const link of embeds) {
            const uri = await Media.getImageUriFromLink(link);
            if (uri) return uri;
        }

        return null;
    }

    static async getImageUriForAttachment(id: string): Promise<string | null> {
        const file = getFile(id);
        if (file) {
            return Media.getStaticImageUri(ExtendedGraphInstances.app.vault.getResourcePath(file));
        }
        return null;
    }

    private static async getImageUriFromLink(link: string): Promise<string | null> {
        const imageFile = ExtendedGraphInstances.app.metadataCache.getFirstLinkpathDest(link, ".");
        if (imageFile) {
            const src = ExtendedGraphInstances.app.vault.getResourcePath(imageFile);
            return Media.getStaticImageUri(src);
        }

        if (ExtendedGraphInstances.settings.allowExternalImages) {
            try {
                const validationUrl = new URL(link);
                if (validationUrl.protocol === 'http:' || validationUrl.protocol === 'https:') {
                    const response = await requestUrl(link);
                    const type = response.headers['content-type'];
                    if (!['image/avif', 'image/webp', 'image/png', 'image/svg+xml', 'image/jpeg'].includes(type)) return null;
                    return "data:" + type + ";base64," + arrayBufferToBase64(response.arrayBuffer);
                }
            } catch (err) {
                return null;
            }
        }

        if (ExtendedGraphInstances.settings.allowExternalLocalImages) {
            try {
                const validationUrl = new URL(link);
                if (validationUrl.protocol === 'file:') {
                    if (link.startsWith('file:///')) {
                        link = link.replace('file:///', '');
                    }
                    link = Platform.resourcePathPrefix + link;
                    return Media.getStaticImageUri(link);
                }
                if (validationUrl.protocol === 'app:') {
                    return Media.getStaticImageUri(link);
                }
            } catch (err) {
                return null;
            }
        }
        return null;
    }

    private static async getStaticImageUri(src: string): Promise<string | null> {
        // https://www.iana.org/assignments/media-types/media-types.xhtml
        const type = await Media.getMediaType(src);


        if (!type) return null;

        if (['image/avif', 'image/webp', 'image/png', 'image/svg+xml', 'image/jpeg'].includes(type)) {
            return src;
        }
        else if (['image/gif'].includes(type)) {
            return Media.getUriForGif(src);
        }
        else if (['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska'].includes(type)) {
            return Media.getUriForVideo(src);
        }
        return null;
    }

    private static async getUriForGif(src: string): Promise<string | null> {
        const canvas = createEl('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
            let uri: string | undefined = undefined;

            const image = new Image();
            image.onload = () => {
                canvas.width = image.width;
                canvas.height = image.height;
                ctx.drawImage(image, 0, 0);
                uri = canvas.toDataURL();
            };
            image.src = src;

            let waitLoop = 0;
            await (async () => {
                while (uri === undefined && waitLoop < 5) {
                    waitLoop += 1;
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            })();
            return uri ?? null;
        }
        return null;
    }

    private static async getUriForVideo(src: string): Promise<string | null> {
        const canvas = createEl('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
            let uri: string | undefined = undefined;

            const video = createEl('video');

            video.src = src;
            video.addEventListener('seeked', function () {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                uri = canvas.toDataURL();
            });
            video.onloadedmetadata = function () {
                if (video.duration) video.currentTime = video.duration / 2;
            };

            let waitLoop = 0;
            await (async () => {
                while (uri === undefined && waitLoop < 5) {
                    waitLoop += 1;
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            })();
            return uri ?? null;
        }
        return null;
    }

    private static async getMediaType(url: string): Promise<string | null> {
        let type: string | null | undefined;

        const request = new XMLHttpRequest();
        request.open('HEAD', url, false);
        request.onload = function () {
            type = request.getResponseHeader('Content-Type');
        };
        request.onerror = function (e) {
            console.warn(e);
            type = null;
        }
        request.onreadystatechange = function () {
            if (request.status === 401) {
                console.warn(t("errors.uri401"));
            }
        }
        try {
            request.send();
        }
        catch (e) {
            console.warn(e);
            type = null;
        }



        let waitLoop = 0;
        await (async () => {
            while (type === undefined && waitLoop < 5) {
                waitLoop += 1;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        })();
        return type ?? null;
    }
}