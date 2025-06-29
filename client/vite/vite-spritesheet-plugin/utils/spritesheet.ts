import { type Image, createCanvas, loadImage } from "canvas";
import { createHash } from "crypto";
import { type IOption, MaxRectsPacker } from "maxrects-packer";
import path from "path";
import { type SpritesheetData } from "pixi.js";
import { writeFileSync } from "fs";

export const cacheDir = ".spritesheet-cache";
export type CacheData = {
    lastModified: number
    fileMap: Record<string, string>
    atlasFiles: {
        low: Record<string,string[]>
        high: Record<string,string[]>
    }
};
export const supportedFormats = ["png", "jpeg"] as const;

export interface CompilerOptions {
    /**
    * Format of the output image
    * @default "png"
    */
    outputFormat: typeof supportedFormats[number]

    /**
     * Output directory
     * @default "atlases"
     */
    outDir: string

    name: string

    /**
    * Added pixels between sprites (can prevent pixels leaking to adjacent sprite)
    * @default 1
    */
    margin: number

    /**
     * Remove file extensions from the atlas frames
     * @default true
     */
    removeExtensions: boolean

    /**
    * The Maximum width and height a generated image can be
    * Once a spritesheet exceeds this size a new one will be created
    * @default 4096
    */
    maximumSize: number

    /**
     * maxrects-packer options
     * See https://soimy.github.io/maxrects-packer/
     * Currently does not support `allowRotation` option
     */
    packerOptions: Omit<IOption, "allowRotation">
}

export type AtlasList = Array<{ readonly json: SpritesheetData, readonly image: Buffer, readonly cacheName?: string }>;

export type MultiResAtlasList = { readonly low: Record<string,AtlasList>, readonly high: Record<string,AtlasList> };

/**
 * Pack images spritesheets.
 * @param paths List of paths to the images.
 * @param options Options passed to the packer.
 */
export async function createSpritesheets(pathMap: Record<string,Map<string, { lastModified: number, path: string }>>, options: CompilerOptions): Promise<MultiResAtlasList> {
    if (!supportedFormats.includes(options.outputFormat)) {
        throw new Error(`outputFormat should only be one of ${JSON.stringify(supportedFormats)}, but "${options.outputFormat}" was given.`);
    }

    interface PackerRectData {
        readonly image: Image
        readonly path: string
    }

    const start = performance.now();

    const writeFromStart = (str: string): boolean => process.stdout.write(`\r${str}`);

    console.log();

    const images: Record<string,PackerRectData[]> = {}
    for(const a of Object.keys(pathMap)){
        images[a]=[]
        for(const [_,path] of pathMap[a].entries()){
            images[a].push({
                image:await loadImage(path.path),
                path:path.path
            })
        }
    }

    function createSheet(atlas:string,resolution: number): AtlasList{
        console.log(`Building spritesheet @ ${resolution}x...`);
        const packer = new MaxRectsPacker(
            options.maximumSize * resolution,
            options.maximumSize * resolution,
            options.margin,
            {
                ...options.packerOptions,
                allowRotation: false
            }
        );
        for (const image of images[atlas]) {
            packer.add(
                image.image.width * resolution,
                image.image.height * resolution,
                image
            );
        }
        const atlases: AtlasList = [];

        let binn=0
        for (const bin of packer.bins) {
            const canvas = createCanvas(bin.width, bin.height);

            const ctx = canvas.getContext("2d");

            const json: SpritesheetData = {
                meta: {
                    image: "",
                    scale: resolution,
                    size: {
                        w: bin.width,
                        h: bin.height
                    },
                },
                frames: {}
            };

            const rects = bin.rects.length;
            writeFromStart(`Parsing ${rects} rects`);
            for (const rect of bin.rects) {
                const data = rect.data as PackerRectData;

                ctx.drawImage(data.image, rect.x, rect.y, rect.width, rect.height);

                const sourceParts = data.path.split(path.sep);

                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                let name = sourceParts.at(-1)!;

                if (options.removeExtensions) {
                    name = name.split(".").slice(0, -1).join("");
                }

                json.frames[name] = {
                    frame: {
                        w: rect.width,
                        h: rect.height,
                        x: rect.x,
                        y: rect.y
                    },
                    sourceSize: {
                        w: rect.width,
                        h: rect.height
                    }
                };
            }
            
            const buffer = canvas.toBuffer(`image/${options.outputFormat}` as "image/png");
            json.meta.image = `${options.outDir}/${options.name}-${atlas}-${binn}@${resolution}x.${options.outputFormat}`;
            const cacheName = `${options.name}-${atlas}-${binn}@${resolution}x`;
            
            writeFileSync(path.join(cacheDir, `${cacheName}.json`), JSON.stringify(json));
            writeFileSync(path.join(cacheDir, `${cacheName}.${options.outputFormat}`), buffer);
            atlases.push({
                json,
                image: buffer,
                cacheName
            });
            binn++
        }
        return atlases
    }
    const sheets:MultiResAtlasList={
        low:{},
        high:{}
    }
    
    const cacheData: CacheData = {
        lastModified: Date.now(),
        fileMap: {},
        atlasFiles:{
            high:{},
            low:{}
        }
    }
    for(const k of Object.keys(pathMap)){
        sheets.high[k]=createSheet(k,1)
        sheets.low[k]=createSheet(k,0.5)
        cacheData.fileMap={...cacheData.fileMap,...Object.fromEntries(Array.from(pathMap[k].entries(), ([name, data]) => [name.slice(1), data.path]))}
        cacheData.atlasFiles.low[k]=sheets.low[k].map(s => s.cacheName ?? "")
        cacheData.atlasFiles.high[k]=sheets.high[k].map(s => s.cacheName ?? "")
    }

    writeFileSync(path.join(cacheDir, "data.json"), JSON.stringify(cacheData));

    console.log(`Finished building spritesheets in ${Math.round(performance.now() - start) / 1000}s`);

    return sheets;
}
