import { ReferenceTo } from "../utils/objectDefinitions";
import { FloorNames } from "../utils/terrain";
import { ScopeDefinition } from "./scopes";

export enum OtherColorKeys{
    border="border",
    gas="gas",
    void="void"
};
export type ColorKeys=OtherColorKeys|FloorNames

export interface BiomeDefinition {
    readonly idString: string
    readonly colors: Partial<Record<ColorKeys, string>>
    readonly ambience?: string
    readonly specialSounds?: string[]
    readonly defaultScope?: ReferenceTo<ScopeDefinition>
    // will be multiplied by the bullet trail color
    readonly bulletTrailAdjust?: string
    readonly particleEffects?: {
        readonly frames: string | string[]
        readonly delay: number
        readonly tint?: number
        readonly gravity?: boolean
    }
}


export const Biomes: Record<string, BiomeDefinition> = {
    normal: {
        idString: "normal",
        colors: {
            [OtherColorKeys.border]: "hsl(211, 63%, 30%)",
            [OtherColorKeys.gas]: "hsla(17, 100%, 50%, 0.55)",
            [OtherColorKeys.void]: "hsl(25, 80%, 6%)"
        },
        ambience: "wind_ambience",
        particleEffects: {
            frames: ["leaf_particle_1", "leaf_particle_2", "leaf_particle_3", "leaf_particle_4", "leaf_particle_5", "leaf_particle_6"],
            delay:1000,
        }
    },
    desert: {
        idString: "desert",
        colors: {
        },
        ambience: "wind_ambience",
    },
    savannah: {
        idString: "normal",
        colors: {
            [FloorNames.Grass]:"hsl(82, 36.20%, 44.90%)",
            [FloorNames.Water]:"hsl(190, 87%, 49%)",
            [FloorNames.Sand]: "#C9843A",
            [OtherColorKeys.border]: "hsl(211, 63%, 30%)",
        },
        ambience: "wind_ambience",
        particleEffects: {
            frames: ["leaf_particle_1", "leaf_particle_2", "leaf_particle_3", "leaf_particle_4", "leaf_particle_5", "leaf_particle_6"],
            delay:1000,
        }
    },
};
export const ObstacleModeVariations: Partial<Record<string, string>> = {
    winter: "_winter"
};
