import { GameConstants, Layer } from "@common/constants";
import { Buildings, type BuildingDefinition } from "@common/definitions/buildings";
import { Loots } from "@common/definitions/loots";
import { Obstacles, RotationMode, type ObstacleDefinition } from "@common/definitions/obstacles";
import { Orientation, type Variation } from "@common/typings";
import { CircleHitbox } from "@common/utils/hitbox";
import { Collision } from "@common/utils/math";
import { ItemType, MapObjectSpawnMode, NullString, type ReferenceTo } from "@common/utils/objectDefinitions";
import { random, randomFloat } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";
import { type WebSocket } from "uWebSockets.js";
import { type GunItem } from "../inventory/gunItem";
import { GameMap } from "../map";
import { Player, type PlayerContainer } from "../objects/player";
import { getLootFromTable, LootTables } from "./lootTables";
import { PerkCategories } from "@common/definitions/perks";
import { Skins } from "@common/definitions/skins";
import { Backpacks } from "@common/definitions/backpacks";
import { Guns } from "@common/definitions/guns";
import { FloorNames, IslandReturn } from "@common/utils/terrain";
export interface RiverDefinition {
    readonly minAmount: number
    readonly maxAmount: number
    readonly maxWideAmount: number
    readonly wideChance: number
    readonly minWidth: number
    readonly maxWidth: number
    readonly minWideWidth: number
    readonly maxWideWidth: number
    readonly outline?:FloorNames
    readonly floor?:FloorNames
}
export enum IslandSpawns{
    Random,
    Smart,
    Center
}
export type WeightedMapOBJ =
    (
        | { readonly build: ReferenceTo<BuildingDefinition> | typeof NullString }
        | { readonly obstacle: ReferenceTo<ObstacleDefinition> | typeof NullString }
    )& { readonly weight: number }
export interface IslandDef{
    readonly rivers?: RiverDefinition
    readonly grass:(FloorNames|undefined),
    readonly beachSize: number,
    readonly beach:(FloorNames|undefined)
    readonly interiorSize:number

    readonly bridges?: ReadonlyArray<ReferenceTo<BuildingDefinition>>
    readonly majorBuildings?: ReadonlyArray<ReferenceTo<BuildingDefinition>>
    readonly obstacles?: Record<ReferenceTo<ObstacleDefinition>, number>
    readonly buildings?: Record<ReferenceTo<BuildingDefinition>, number>
    readonly quadBuildingLimit?: Record<ReferenceTo<BuildingDefinition>, number>
    readonly loots?: Record<keyof typeof LootTables, number>
    readonly obstacleClumps?: readonly ObstacleClump[]
    readonly chooses?:{
        readonly objects:WeightedMapOBJ[],
        readonly min:number,
        readonly max:number
    }[]
    readonly clearings?: {
        readonly minWidth: number
        readonly minHeight: number
        readonly maxWidth: number
        readonly maxHeight: number
        readonly count: number
        readonly allowedObstacles: Array<ReferenceTo<ObstacleDefinition>>
        readonly obstacles: Array<{ idString: ReferenceTo<ObstacleDefinition>, min: number, max: number }>
    }
    readonly onGenerate?: (map: GameMap,is:IslandReturn) => void
}
export interface MapPlace{
    readonly name: string
    readonly position: Vector
}
export interface MapDefinition {
    readonly width: number
    readonly height: number
    readonly oceanSize: number
    readonly beachSize: number
    readonly islands?: {
        readonly chooses:IslandDef[],
        readonly spawn?:IslandSpawns,
        readonly smartList?:Vector[],
        readonly smartOffset?:number,
        readonly major?:boolean
        readonly min?:number
        readonly max?:number
        readonly spawnAttempts?:number
        readonly names?:{
            readonly names:string[]
            readonly orden?:boolean
        }
    }[]

    readonly places?: ReadonlyArray<MapPlace>

    readonly onGenerate?: (map: GameMap, params: string[]) => void
}

export type ObstacleClump = {
    /**
     * How many of these clumps per map
     */
    readonly clumpAmount: number
    /**
     * Data for any given clump
     */
    readonly clump: {
        /**
         * Id's of obstacles that may appear in the clump
         */
        readonly obstacles: ReadonlyArray<ReferenceTo<ObstacleDefinition>>
        readonly minAmount: number
        readonly maxAmount: number
        readonly radius: number
        readonly jitter: number
    }
};
const DefaultChooses:Record<string,WeightedMapOBJ[]>={
    LootTables:[
        {obstacle:"regular_crate", weight:10},
        {obstacle:"grenade_crate", weight:7},
        {obstacle:"flint_crate", weight:1},
        {obstacle:"aegis_crate", weight:1},
        {obstacle:"loot_tree", weight:0.3},
        {obstacle:"gold_rock", weight:0.3},
        {obstacle:"viking_chest", weight:0.2},
        {obstacle:"river_chest", weight:0.2},
        {obstacle:"survival_crate", weight:0.1},
    ],
    SpecialLootTables:[
        {obstacle:"flint_crate", weight:3.5},
        {obstacle:"aegis_crate", weight:3.5},
        {obstacle:"loot_tree", weight:0.3},
        {obstacle:"gold_rock", weight:0.3},
        {obstacle:"viking_chest", weight:0.2},
        {obstacle:"river_chest", weight:0.2},
        {obstacle:"survival_crate", weight:0.1},
    ],
    MajorBuilds:[
        {build:"refinery", weight:1},
        {build:"armory", weight:0.8},
        {build:"headquarters", weight:0.5},
        {build:"port_complex", weight:0.5},
    ],
    ContainersChoose:[
        {build:"container_3", weight:1},
        {build:"container_4", weight:1},
        {build:"container_5", weight:1},
        {build:"container_6", weight:1},
        {build:"container_7", weight:1},
        {build:"container_8", weight:1},
        {build:"container_9", weight:1},
        {build:"container_10",weight:1},
        {build:"container_13",weight:0.1},
        {build:"container_14",weight:0.02},
    ],
    Houses:[
        {build:"red_house", weight:1},
        {build:"red_house_v2", weight:1},
        {build:"warehouse", weight:0.75},
        {build:"green_house", weight:0.6},
        {build:"blue_house", weight:0.5},
        {build:"sea_traffic_control",weight:0.1}
    ],
    MinorBuilds:[
        {build:"porta_potty", weight:1},
        {build:"mobile_home", weight:0.7},
        {build:"small_bunker", weight:0.05},
        {build:"construction_site", weight:0.05},
    ],
}
const maps:Record<string, MapDefinition> = {
    normal: {
        width: 1900,
        height: 1900,
        oceanSize: 128,
        beachSize: 32,
        islands:[
            {
                spawn:IslandSpawns.Center,
                chooses:[
                    //Vanilla
                    {
                        rivers: {
                            minAmount: 1,
                            maxAmount: 5,
                            maxWideAmount: 2,
                            wideChance: 0.35,
                            minWidth: 12,
                            maxWidth: 28,
                            minWideWidth: 27,
                            maxWideWidth: 34,
                        },
                        loots: {
                            ground_loot: 100
                        },
                        beachSize:32,
                        interiorSize:1650,
                        beach:FloorNames.Sand,
                        grass:FloorNames.Grass,
                        buildings:{
                            large_bridge: 3,
                            small_bridge: Infinity,
                            port_complex: 1,
                            sea_traffic_control: 1,
                            armory: 1,
                            headquarters: 1,
                            small_bunker: 2,
                            refinery: 1,
                            warehouse: 7,
                            green_house: 4,
                            blue_house: 4,
                            red_house: 4,
                            red_house_v2: 4,
                            construction_site: 1,
                            mobile_home: 16,
                            porta_potty: 23,
                            container_3: 3,
                            container_4: 3,
                            container_5: 3,
                            container_6: 3,
                            container_7: 3,
                            container_8: 3,
                            container_9: 3,
                            container_10: 3
                            /*
                            tugboat_red: 2,
                            tugboat_white: 7,
                            // firework_warehouse: 1, // birthday mode

                            */
                        },
                        majorBuildings: ["armory", "refinery", "port_complex", "headquarters"],
                        quadBuildingLimit: {
                            red_house: 1,
                            red_house_v2: 1,
                            warehouse: 2,
                            green_house: 1,
                            blue_house: 1,
                            mobile_home: 3,
                            porta_potty: 3,
                            construction_site: 1
                        },
                        obstacles:{
                            oil_tank: 25,
                            // christmas_tree: 1, // winter mode
                            oak_tree: 40,
                            small_oak_tree: 100,
                            birch_tree: 30,
                            pine_tree: 20,
                            loot_tree: 5,
                            regular_crate: 150,
                            flint_crate: 12,
                            aegis_crate: 12,
                            survival_crate:3,
                            grenade_crate: 55,
                            rock: 430,
                            river_chest: 2,
                            river_rock: 70,
                            bush: 180,
                            // birthday_cake: 100, // birthday mode
                            lily_pad: 30,
                            blueberry_bush: 50,
                            barrel:70,
                            viking_chest: 2,
                            super_barrel: 20,
                            melee_crate: 2,
                            gold_rock: 1,
                            loot_barrel: 3,
                            flint_stone: 1
                        },
                        obstacleClumps: [
                            {
                                clumpAmount: 140,
                                clump: {
                                    minAmount: 2,
                                    maxAmount: 4,
                                    jitter: 5,
                                    obstacles: ["small_oak_tree"],
                                    radius: 12
                                }
                            },
                            {
                                clumpAmount: 50,
                                clump: {
                                    minAmount: 2,
                                    maxAmount: 4,
                                    jitter: 5,
                                    obstacles: ["birch_tree"],
                                    radius: 12
                                }
                            },
                            {
                                clumpAmount: 8,
                                clump: {
                                    minAmount: 2,
                                    maxAmount: 4,
                                    jitter: 5,
                                    obstacles: ["pine_tree","birch_tree"],
                                    radius: 12
                                }
                            }
                        ],
                    },
                ],
                major:true
            },
        ],
        places: [
            { name: "Banana", position: Vec.create(0.23, 0.2) },
            { name: "Takedown", position: Vec.create(0.23, 0.8) },
            { name: "Lavlandet", position: Vec.create(0.75, 0.2) },
            { name: "Noskin Narrows", position: Vec.create(0.72, 0.8) },
            { name: "Mt. Sanger", position: Vec.create(0.5, 0.35) },
            { name: "Deepwood", position: Vec.create(0.5, 0.65) }
        ]
    },
    islands: {
        width: 1900,
        height: 1900,
        oceanSize: 100,
        beachSize: 29,
        islands:[
            {
                chooses:[
                    //Normal
                    {
                        beach:FloorNames.Sand,
                        beachSize:32,
                        grass:FloorNames.Grass,
                        interiorSize:600,
                        buildings:{
                            red_house: 1,
                            red_house_v2: 1,
                            blue_house: 1,
                            container_3: 1,
                            container_4: 1,
                            container_5: 1,
                            container_6: 1,
                            container_7: 1,
                            container_8: 1,
                            container_9: 1,
                            container_10: 1
                        },
                        obstacles:{
                            flint_crate: 5,
                            aegis_crate: 5,
                            survival_crate:1,
                            regular_crate: 50,
                            rock:40,
                            oak_tree: 20,
                            small_oak_tree: 50,
                            birch_tree: 10,
                            pine_tree: 5,
                            loot_tree: 2,
                        },
                        rivers: {
                            outline:FloorNames.Grass,
                            minAmount: 1,
                            maxAmount: 2,
                            maxWideAmount: 1,
                            wideChance: 0.35,
                            minWidth: 20,
                            maxWidth: 25,
                            minWideWidth: 10,
                            maxWideWidth: 15
                        },
                    },
                    //Sand
                    {
                        beach:FloorNames.Sand,
                        beachSize:2,
                        grass:FloorNames.Sand,
                        interiorSize:600,
                        buildings:{
                            warehouse: 2,
                            red_house_v2: 1,
                            container_3: 1,
                            container_4: 1,
                            container_5: 1,
                            container_6: 1,
                            container_7: 1,
                            container_8: 1,
                            container_9: 1,
                            container_10: 1
                        },
                        obstacles:{
                            regular_crate: 30,
                            flint_crate: 3,
                            aegis_crate: 3,
                            survival_crate:1,
                            grenade_crate: 10,
                            rock:50,
                            oil_tank:5,
                            barrel:40,
                            loot_barrel: 1,
                            gold_rock: 1,
                        },
                        rivers: {
                            outline:FloorNames.Sand,
                            minAmount: 1,
                            maxAmount: 1,
                            maxWideAmount: 1,
                            wideChance: 0,
                            minWidth: 30,
                            maxWidth: 30,
                            minWideWidth: 10,
                            maxWideWidth: 15
                        }
                    },
                    //Snow
                    {
                        beach:FloorNames.SnowSand,
                        beachSize:32,
                        grass:FloorNames.Snow,
                        interiorSize:600,
                        buildings:{
                            red_house: 1,
                            red_house_v2: 1,
                            blue_house: 1,
                            container_3: 1,
                            container_4: 1,
                            container_5: 1,
                            container_6: 1,
                            container_7: 1,
                            container_8: 1,
                            container_9: 1,
                            container_10: 1
                        },
                        obstacles:{
                            flint_crate: 5,
                            aegis_crate: 5,
                            survival_crate:1,
                            regular_crate: 50,
                            rock:40,
                            oak_tree: 20,
                            small_oak_tree: 50,
                            birch_tree: 10,
                            pine_tree: 5,
                            loot_tree: 2,
                        },
                        rivers: {
                            outline:FloorNames.Snow,
                            minAmount: 1,
                            maxAmount: 3,
                            maxWideAmount: 1,
                            wideChance: 0.35,
                            minWidth: 10,
                            maxWidth: 15,
                            minWideWidth: 8,
                            maxWideWidth: 13
                        },
                    },
                ],
                max:3,
                min:5,
                spawnAttempts:150,
            },
            {
                chooses:[
                    {
                        beach:FloorNames.Sand,
                        beachSize:20,
                        grass:FloorNames.Grass,
                        interiorSize:300,
                        obstacles:{
                            flint_crate: 1,
                            aegis_crate: 1,
                            regular_crate: 5,
                            oak_tree: 8,
                            small_oak_tree: 10,
                            birch_tree: 5,
                            pine_tree: 2,
                            rock:30
                        },
                        buildings:{
                            red_house:1,
                            red_house_v2:1,
                            container_3: 1,
                            container_4: 1,
                            container_5: 1,
                            container_6: 1,
                        },
                        rivers: {
                            outline:FloorNames.Grass,
                            minAmount: 1,
                            maxAmount: 2,
                            maxWideAmount: 1,
                            wideChance: 0.35,
                            minWidth: 3,
                            maxWidth: 6,
                            minWideWidth: 2,
                            maxWideWidth: 4
                        },
                    },
                    //Sand
                    {
                        beach:FloorNames.Sand,
                        beachSize:2,
                        grass:FloorNames.Sand,
                        interiorSize:300,
                        buildings:{
                            warehouse: 2,
                            container_7: 1,
                            container_8: 1,
                            container_9: 1,
                            container_10: 1
                        },
                        obstacles:{
                            regular_crate: 10,
                            flint_crate: 1,
                            aegis_crate: 1,
                            grenade_crate: 5,
                            rock:20,
                            oil_tank:2,
                            barrel:20,
                            loot_barrel: 1,
                        },
                        rivers: {
                            outline:FloorNames.Sand,
                            minAmount: 1,
                            maxAmount: 2,
                            maxWideAmount: 1,
                            wideChance: 0.35,
                            minWidth: 3,
                            maxWidth: 6,
                            minWideWidth: 2,
                            maxWideWidth: 4
                        },
                    },
                    //Snow Island
                    {
                        beach:FloorNames.SnowSand,
                        beachSize:2,
                        grass:FloorNames.Snow,
                        interiorSize:300,
                        buildings:{
                            warehouse: 2,
                            container_7: 1,
                            container_8: 1,
                            container_9: 1,
                            container_10: 1
                        },
                        obstacles:{
                            regular_crate: 10,
                            flint_crate: 1,
                            aegis_crate: 1,
                            grenade_crate: 5,
                            rock:20,
                            oil_tank:2,
                            barrel:20,
                            loot_barrel: 1,
                        },
                        rivers: {
                            outline:FloorNames.Snow,
                            minAmount: 1,
                            maxAmount: 2,
                            maxWideAmount: 1,
                            wideChance: 0.35,
                            minWidth: 5,
                            maxWidth: 8,
                            minWideWidth: 3,
                            maxWideWidth: 7
                        },
                    }
                ],
                major:false,
                max:5,
                min:7
            },
            {
                chooses:[
                    {
                        beach:FloorNames.Sand,
                        beachSize:10,
                        grass:FloorNames.Grass,
                        interiorSize:130,
                        obstacles:{
                            aegis_crate: 1,
                            regular_crate: 1,
                            oak_tree: 4,
                            birch_tree: 2,
                            rock:7
                        },
                        buildings:{
                            //red_house:1,
                            container_3: 1,
                            container_4: 1,
                        },
                        rivers: {
                            outline:FloorNames.Grass,
                            minAmount: 1,
                            maxAmount: 2,
                            maxWideAmount: 1,
                            wideChance: 0.35,
                            minWidth: 3,
                            maxWidth: 4,
                            minWideWidth: 2,
                            maxWideWidth: 3
                        },
                    },
                    //Sand
                    {
                        beach:FloorNames.Sand,
                        beachSize:2,
                        grass:FloorNames.Sand,
                        interiorSize:130,
                        buildings:{
                            container_7: 1,
                            container_10: 1
                        },
                        obstacles:{
                            regular_crate: 2,
                            flint_crate: 1,
                            grenade_crate: 1,
                            rock:5,
                            barrel:5,
                        },
                        rivers: {
                            outline:FloorNames.Sand,
                            minAmount: 1,
                            maxAmount: 1,
                            maxWideAmount: 1,
                            wideChance: 0,
                            minWidth: 7,
                            maxWidth: 8,
                            minWideWidth: 2,
                            maxWideWidth: 3
                        },
                    },
                    //Snow
                    {
                        beach:FloorNames.SnowSand,
                        beachSize:2,
                        grass:FloorNames.Snow,
                        interiorSize:130,
                        buildings:{
                            container_7: 1,
                            container_10: 1
                        },
                        obstacles:{
                            regular_crate: 2,
                            flint_crate: 1,
                            grenade_crate: 1,
                            rock:5,
                            barrel:5,
                        },
                        rivers: {
                            outline:FloorNames.Snow,
                            minAmount: 1,
                            maxAmount: 1,
                            maxWideAmount: 1,
                            wideChance: 0,
                            minWidth: 7,
                            maxWidth: 8,
                            minWideWidth: 2,
                            maxWideWidth: 3
                        },
                    }
                ],
                major:false,
                max:13,
                min:18,
                spawnAttempts:30,
            },
            {
                chooses:[
                    //Grass
                    {
                        beach:FloorNames.Sand,
                        beachSize:2,
                        grass:FloorNames.Grass,
                        interiorSize:50,
                        obstacles:{
                            oak_tree:1,
                            rock:1
                        },
                        rivers: {
                            outline:FloorNames.Grass,
                            minAmount: 1,
                            maxAmount: 1,
                            maxWideAmount: 1,
                            wideChance: 0.35,
                            minWidth: 5,
                            maxWidth: 6,
                            minWideWidth: 2,
                            maxWideWidth: 3
                        },
                    },
                    //Sand
                    {
                        beach:FloorNames.Sand,
                        beachSize:2,
                        grass:FloorNames.Sand,
                        interiorSize:50,
                        obstacles:{
                            rock:3,
                            barrel:1,
                        },
                        rivers: {
                            outline:FloorNames.Sand,
                            minAmount: 1,
                            maxAmount: 1,
                            maxWideAmount: 1,
                            wideChance: 0.35,
                            minWidth: 5,
                            maxWidth: 6,
                            minWideWidth: 2,
                            maxWideWidth: 3
                        },
                    },
                    //Snow
                    {
                        beach:FloorNames.SnowSand,
                        beachSize:2,
                        grass:FloorNames.Snow,
                        interiorSize:50,
                        obstacles:{
                            rock:3,
                            barrel:1,
                        },
                        rivers: {
                            outline:FloorNames.Snow,
                            minAmount: 1,
                            maxAmount: 1,
                            maxWideAmount: 1,
                            wideChance: 0.35,
                            minWidth: 5,
                            maxWidth: 6,
                            minWideWidth: 2,
                            maxWideWidth: 3
                        },
                    }
                ],
                major:false,
                max:10,
                min:17,
                spawnAttempts:20,
            }
        ],
        places: [
            { name: "Banana", position: Vec.create(0.23, 0.2) },
            { name: "Takedown", position: Vec.create(0.23, 0.8) },
            { name: "Lavlandet", position: Vec.create(0.75, 0.2) },
            { name: "Noskin Narrows", position: Vec.create(0.72, 0.8) },
            { name: "Mt. Sanger", position: Vec.create(0.5, 0.35) },
            { name: "Deepwood", position: Vec.create(0.5, 0.65) }
        ]
    },
    double_island: {
        width: 2600,
        height: 2600,
        oceanSize: 100,
        beachSize: 29,
        islands:[
            {
                spawn:IslandSpawns.Smart,
                smartOffset:170,
                smartList:[Vec.create(0,0),Vec.create(1,1)],
                names:{
                    names:["red centralis","blue centralis"],
                    orden:true
                },
                chooses:[
                    //Normal
                    {
                        beach:FloorNames.Sand,
                        beachSize:32,
                        grass:FloorNames.Grass,
                        interiorSize:1000,
                        chooses:[
                            {
                                max:1,
                                min:3,
                                objects:DefaultChooses.MajorBuilds,
                            },
                            {
                                max:4,
                                min:6,
                                objects:DefaultChooses.Houses,
                            },
                            {
                                max:5,
                                min:12,
                                objects:DefaultChooses.MinorBuilds,
                            },
                            {
                                max:10,
                                min:5,
                                objects:DefaultChooses.ContainersChoose,
                            },
                            {
                                max:7,
                                min:4,
                                objects:DefaultChooses.SpecialLootTables
                            },
                            {
                                max:70,
                                min:50,
                                objects:DefaultChooses.LootTables
                            }
                        ],
                        obstacles:{
                            rock:40,
                            oak_tree: 20,
                            small_oak_tree: 50,
                            birch_tree: 10,
                            pine_tree: 5,
                            loot_tree: 2,
                        },
                        loots:{
                            ground_loot:30,
                        },
                        rivers: {
                            outline:FloorNames.Grass,
                            minAmount: 1,
                            maxAmount: 2,
                            maxWideAmount: 1,
                            wideChance: 0.35,
                            minWidth: 20,
                            maxWidth: 25,
                            minWideWidth: 10,
                            maxWideWidth: 15
                        },
                        obstacleClumps: [
                            {
                                clumpAmount: 30,
                                clump: {
                                    minAmount: 2,
                                    maxAmount: 4,
                                    jitter: 5,
                                    obstacles: ["small_oak_tree"],
                                    radius: 12
                                }
                            },
                            {
                                clumpAmount: 20,
                                clump: {
                                    minAmount: 2,
                                    maxAmount: 4,
                                    jitter: 5,
                                    obstacles: ["birch_tree"],
                                    radius: 12
                                }
                            },
                            {
                                clumpAmount: 5,
                                clump: {
                                    minAmount: 2,
                                    maxAmount: 4,
                                    jitter: 5,
                                    obstacles: ["pine_tree","birch_tree"],
                                    radius: 12
                                }
                            }
                        ],
                    },
                ],
                max:2,
                min:2,
                spawnAttempts:150,
            },
            //SmallIslands
            {
                chooses:[
                    //Normal
                    {
                        beach:FloorNames.Sand,
                        beachSize:32,
                        grass:FloorNames.Grass,
                        interiorSize:600,
                        chooses:[
                            {
                                max:2,
                                min:4,
                                objects:DefaultChooses.Houses,
                            },
                            {
                                max:5,
                                min:7,
                                objects:DefaultChooses.MinorBuilds,
                            },
                            {
                                max:7,
                                min:3,
                                objects:DefaultChooses.ContainersChoose,
                            },
                            {
                                max:5,
                                min:2,
                                objects:DefaultChooses.SpecialLootTables
                            },
                            {
                                max:40,
                                min:20,
                                objects:DefaultChooses.LootTables
                            }
                        ],
                        obstacles:{
                            rock:20,
                            oak_tree: 10,
                            small_oak_tree: 20,
                            birch_tree: 7,
                            pine_tree: 3,
                        },
                        loots:{
                            ground_loot:10,
                        },
                        rivers: {
                            outline:FloorNames.Grass,
                            minAmount: 1,
                            maxAmount: 1,
                            maxWideAmount: 1,
                            wideChance: 0.35,
                            minWidth: 17,
                            maxWidth: 20,
                            minWideWidth: 10,
                            maxWideWidth: 15
                        },
                        obstacleClumps: [
                            {
                                clumpAmount: 10,
                                clump: {
                                    minAmount: 2,
                                    maxAmount: 4,
                                    jitter: 5,
                                    obstacles: ["small_oak_tree"],
                                    radius: 12
                                }
                            },
                            {
                                clumpAmount: 5,
                                clump: {
                                    minAmount: 2,
                                    maxAmount: 4,
                                    jitter: 5,
                                    obstacles: ["birch_tree"],
                                    radius: 12
                                }
                            },
                            {
                                clumpAmount: 3,
                                clump: {
                                    minAmount: 2,
                                    maxAmount: 4,
                                    jitter: 5,
                                    obstacles: ["pine_tree","birch_tree"],
                                    radius: 12
                                }
                            }
                        ],
                    },
                ],
                max:2,
                min:4,
                spawnAttempts:90,
            },
            //Tiny Island
            {
                chooses:[
                    //Normal
                    {
                        beach:FloorNames.Sand,
                        beachSize:32,
                        grass:FloorNames.Grass,
                        interiorSize:260,
                        chooses:[
                            {
                                max:2,
                                min:1,
                                objects:DefaultChooses.Houses,
                            },
                            {
                                max:3,
                                min:1,
                                objects:DefaultChooses.MinorBuilds,
                            },
                            {
                                max:4,
                                min:2,
                                objects:DefaultChooses.ContainersChoose,
                            },
                            {
                                max:2,
                                min:1,
                                objects:DefaultChooses.SpecialLootTables
                            },
                            {
                                max:8,
                                min:5,
                                objects:DefaultChooses.LootTables
                            }
                        ],
                        obstacles:{
                            rock:10,
                            small_oak_tree: 3,
                            birch_tree: 2,
                            pine_tree: 1,
                        },
                        loots:{
                            ground_loot:5,
                        },
                        rivers: {
                            outline:FloorNames.Grass,
                            minAmount: 1,
                            maxAmount: 1,
                            maxWideAmount: 1,
                            wideChance: 0.35,
                            minWidth: 10,
                            maxWidth: 6,
                            minWideWidth: 10,
                            maxWideWidth: 6
                        },
                        obstacleClumps: [
                            {
                                clumpAmount: 4,
                                clump: {
                                    minAmount: 2,
                                    maxAmount: 4,
                                    jitter: 5,
                                    obstacles: ["small_oak_tree"],
                                    radius: 12
                                }
                            },
                            {
                                clumpAmount: 2,
                                clump: {
                                    minAmount: 2,
                                    maxAmount: 4,
                                    jitter: 5,
                                    obstacles: ["birch_tree"],
                                    radius: 12
                                }
                            },
                            {
                                clumpAmount: 1,
                                clump: {
                                    minAmount: 2,
                                    maxAmount: 4,
                                    jitter: 5,
                                    obstacles: ["pine_tree","birch_tree"],
                                    radius: 12
                                }
                            }
                        ],
                    },
                ],
                max:4,
                min:3,
                spawnAttempts:90,
            },
            //Earth Peaces
            {
                chooses:[
                    //Normal
                    {
                        beach:FloorNames.Sand,
                        beachSize:32,
                        grass:FloorNames.Grass,
                        interiorSize:120,
                        chooses:[
                            {
                                max:1,
                                min:1,
                                objects:DefaultChooses.MinorBuilds,
                            },
                            {
                                max:1,
                                min:1,
                                objects:DefaultChooses.ContainersChoose,
                            },
                            {
                                max:3,
                                min:2,
                                objects:DefaultChooses.SpecialLootTables
                            },
                        ],
                        obstacles:{
                            rock:6,
                        },
                        loots:{
                            ground_loot:2,
                        },
                        rivers: {
                            outline:FloorNames.Grass,
                            minAmount: 1,
                            maxAmount: 1,
                            maxWideAmount: 1,
                            wideChance: 0.35,
                            minWidth: 5,
                            maxWidth: 2,
                            minWideWidth: 4,
                            maxWideWidth: 1
                        },
                        obstacleClumps: [
                            {
                                clumpAmount: 2,
                                clump: {
                                    minAmount: 2,
                                    maxAmount: 4,
                                    jitter: 5,
                                    obstacles: ["small_oak_tree"],
                                    radius: 12
                                }
                            },
                        ],
                    },
                ],
                max:7,
                min:7,
                spawnAttempts:90,
            },
        ],
    },
    deathmatch: {
        width: 1100,
        height: 1100,
        oceanSize:90,
        beachSize: 32,
        islands:[{
            chooses:[{
                beach:FloorNames.Sand,
                grass:FloorNames.Grass,
                beachSize:32,
                interiorSize:950-32-90,
                rivers: {
                    minAmount: 1,
                    maxAmount: 2,
                    maxWideAmount: 2,
                    wideChance: 0,
                    minWidth: 5,
                    maxWidth: 9,
                    minWideWidth: 3,
                    maxWideWidth: 5
                },
                buildings: {
                    small_bridge: Infinity,
                    tugboat_red: 1,
                    tugboat_white: 3,
                    armory:1,
                    small_bunker: 2,
                    // firework_warehouse: 1, // birthday mode
                    green_house: 1,
                    blue_house: 1,
                    red_house: 1,
                    red_house_v2: 1,
                    construction_site: 1,
                    mobile_home: 2,
                    porta_potty: 5,
                    container_3: 1,
                    container_4: 1,
                    container_5: 1,
                    container_6: 1,
                    container_7: 1,
                    container_8: 1,
                    container_9: 1,
                    container_10: 1
                },
                majorBuildings: [],
                quadBuildingLimit: {
                    red_house: 1,
                    red_house_v2: 1,
                    warehouse: 2,
                    green_house: 1,
                    blue_house: 1,
                    mobile_home: 3,
                    porta_potty: 3,
                    construction_site: 1
                },
                obstacles: {
                    oil_tank: 4,
                    survival_crate:1,
                    // christmas_tree: 1, // winter mode
                    oak_tree: 10,
                    birch_tree: 7,
                    pine_tree: 5,
                    loot_tree: 1,
                    regular_crate: 10,
                    flint_crate: 3,
                    aegis_crate: 3,
                    grenade_crate: 7,
                    rock: 20,
                    river_chest: 1,
                    river_rock: 10,
                    bush: 13,
                    // birthday_cake: 100, // birthday mode
                    lily_pad: 6,
                    blueberry_bush: 5,
                    barrel:10,
                    viking_chest: 1,
                    super_barrel: 5,
                    melee_crate: 1,
                    gold_rock: 1,
                    loot_barrel: 1,
                    flint_stone: 1
                },
                obstacleClumps: [
                    {
                        clumpAmount: 15,
                        clump: {
                            minAmount: 2,
                            maxAmount: 4,
                            jitter: 5,
                            obstacles: ["oak_tree"],
                            radius: 12
                        }
                    },
                    {
                        clumpAmount: 7,
                        clump: {
                            minAmount: 2,
                            maxAmount: 4,
                            jitter: 5,
                            obstacles: ["birch_tree"],
                            radius: 12
                        }
                    },
                    {
                        clumpAmount: 3,
                        clump: {
                            minAmount: 2,
                            maxAmount: 4,
                            jitter: 5,
                            obstacles: ["pine_tree"],
                            radius: 12
                        }
                    }
                ],
                loots: {
                    ground_loot: 10
                },
            }],
            spawn:IslandSpawns.Center,
            major:true
        }],
        places: [
            { name: "Banana", position: Vec.create(0.23, 0.2) },
            { name: "Takedown", position: Vec.create(0.23, 0.8) },
            { name: "Lavlandet", position: Vec.create(0.75, 0.2) },
            { name: "Noskin Narrows", position: Vec.create(0.72, 0.8) },
            { name: "Mt. Sanger", position: Vec.create(0.5, 0.35) },
            { name: "Deepwood", position: Vec.create(0.5, 0.65) }
        ]
    },
    mini_normal: {
        width: 1900,
        height: 1900,
        oceanSize:90,
        beachSize: 32,
        islands:[{
            chooses:[{
                beach:FloorNames.Sand,
                grass:FloorNames.Grass,
                beachSize:32,
                interiorSize:1150,
                rivers: {
                    minAmount: 1,
                    maxAmount: 2,
                    maxWideAmount: 2,
                    wideChance: 0,
                    minWidth: 13,
                    maxWidth: 19,
                    minWideWidth: 8,
                    maxWideWidth: 16
                },
                buildings: {
                    small_bridge: Infinity,
                    tugboat_red: 1,
                    tugboat_white: 3,
                    armory:1,
                    port_complex:1,
                    small_bunker: 1,
                    headquarters: 1,
                    refinery: 1,
                    green_house: 1,
                    blue_house: 1,
                    red_house: 2,
                    red_house_v2: 2,
                    construction_site: 1,
                    mobile_home: 6,
                    porta_potty: 8,
                    warehouse:5,
                    container_3: 1,
                    container_4: 1,
                    container_5: 2,
                    container_6: 1,
                    container_7: 1,
                    container_8: 2,
                    container_9: 1,
                    container_10: 1
                },
                majorBuildings: [],
                quadBuildingLimit: {
                    red_house: 1,
                    red_house_v2: 1,
                    warehouse: 2,
                    green_house: 1,
                    blue_house: 1,
                    mobile_home: 3,
                    porta_potty: 3,
                    construction_site: 1
                },
                obstacles: {
                    oil_tank: 6,
                    survival_crate:2,
                    // christmas_tree: 1, // winter mode
                    oak_tree: 15,
                    birch_tree: 10,
                    pine_tree: 7,
                    loot_tree: 1,
                    regular_crate: 25,
                    flint_crate: 4,
                    aegis_crate: 4,
                    grenade_crate: 12,
                    rock: 70,
                    river_chest: 1,
                    river_rock: 13,
                    bush: 20,
                    lily_pad: 7,
                    blueberry_bush: 8,
                    barrel:13,
                    viking_chest: 1,
                    super_barrel: 7,
                    melee_crate: 1,
                    gold_rock: 1,
                    loot_barrel: 1,
                    flint_stone: 1
                },
                obstacleClumps: [
                    {
                        clumpAmount: 26,
                        clump: {
                            minAmount: 2,
                            maxAmount: 4,
                            jitter: 5,
                            obstacles: ["oak_tree"],
                            radius: 12
                        }
                    },
                    {
                        clumpAmount: 12,
                        clump: {
                            minAmount: 2,
                            maxAmount: 4,
                            jitter: 5,
                            obstacles: ["birch_tree"],
                            radius: 12
                        }
                    },
                    {
                        clumpAmount: 6,
                        clump: {
                            minAmount: 2,
                            maxAmount: 4,
                            jitter: 5,
                            obstacles: ["pine_tree"],
                            radius: 12
                        }
                    }
                ],
                loots: {
                    ground_loot: 20
                },
            }],
            spawn:IslandSpawns.Center,
            major:true
        },
    ],
        places: [
            { name: "Banana", position: Vec.create(0.23, 0.2) },
            { name: "Takedown", position: Vec.create(0.23, 0.8) },
            { name: "Lavlandet", position: Vec.create(0.75, 0.2) },
            { name: "Noskin Narrows", position: Vec.create(0.72, 0.8) },
            { name: "Mt. Sanger", position: Vec.create(0.5, 0.35) },
            { name: "Deepwood", position: Vec.create(0.5, 0.65) }
        ]
    },
    debug: {
        width: 1620,
        height: 1620,
        oceanSize: 128,
        beachSize: 32,
        islands:[
            {
                spawn:IslandSpawns.Center,
                chooses:[
                    {
                        beachSize:32,
                        interiorSize:1450,
                        beach:FloorNames.Sand,
                        grass:FloorNames.Grass,
                    },
                ],
                major:true
            },
        ],
        onGenerate(map) {
            // Generate all buildings

            const buildingPos = Vec.create(200, map.height - 600);

            for (const building of Buildings.definitions) {
                map.generateBuilding(building.idString, buildingPos);
                const rect = building.spawnHitbox.toRectangle();
                buildingPos.x += rect.max.x - rect.min.x;

                buildingPos.x += 20;
                if (buildingPos.x > map.width - 300) {
                    buildingPos.x = 200 - 140;
                    buildingPos.y += 200;
                }
            }

            // Generate all obstacles
            const obstaclePos = Vec.create(200, 200);

            for (const obstacle of Obstacles.definitions) {
                if (obstacle.invisible) continue;
                for (let i = 0; i < (obstacle.variations ?? 1); i++) {
                    map.generateObstacle(obstacle.idString, obstaclePos, { variation: i as Variation });

                    obstaclePos.x += 20;
                    if (obstaclePos.x > map.width / 2 - 20) {
                        obstaclePos.x = map.width / 2 - 140;
                        obstaclePos.y += 20;
                    }
                }
            }

            // Generate all Loots
            const itemPos = Vec.create(map.width / 2, map.height / 2);
            for (const item of Loots.definitions) {
                map.game.addLoot(item, itemPos, 0, { count: Infinity, pushVel: 0, jitterSpawn: false });

                itemPos.x += 10;
                if (itemPos.x > map.width / 2 + 100) {
                    itemPos.x = map.width / 2;
                    itemPos.y += 10;
                }
            }
        },
        places: [
            { name: "[object Object]", position: Vec.create(0.8, 0.7) },
            { name: "Kernel Panic", position: Vec.create(0.6, 0.8) },
            { name: "NullPointerException", position: Vec.create(0.7, 0.3) },
            { name: "undefined Forest", position: Vec.create(0.3, 0.2) },
            { name: "seg. fault\n(core dumped)", position: Vec.create(0.3, 0.7) },
            { name: "Can't read props of null", position: Vec.create(0.4, 0.5) }
        ]
    },
    /*singleBuilding: {
        width: 1024,
        height: 1024,
        beachSize: 32,
        oceanSize: 64,
        onGenerate(map, [building]) {
            map.generateBuilding(building, Vec.create(this.width / 2, this.height / 2), 0);
        }
    },
    singleObstacle: {
        width: 256,
        height: 256,
        beachSize: 8,
        oceanSize: 8,
        onGenerate(map, [obstacle]) {
            map.generateObstacle(obstacle, Vec.create(this.width / 2, this.height / 2), { layer: 0, rotation: 0 });
        }
    },
    gunsTest: (() => {
        const Guns = Loots.byType(ItemType.Gun);

        return {
            width: 64,
            height: 48 + (16 * Guns.length),
            beachSize: 8,
            oceanSize: 8,
            onGenerate(map) {
                for (let i = 0, l = Guns.length; i < l; i++) {
                    const player = new Player(
                        map.game,
                        Vec.create(32, 32 + (16 * i)),
                        { getUserData: () => { return {}; } } as unknown as WebSocket<PlayerContainer>,
                    );
                    const gun = Guns[i];

                    player.inventory.addOrReplaceWeapon(0, gun.idString);
                    (player.inventory.getWeapon(0) as GunItem).ammo = gun.capacity;
                    player.inventory.items.setItem(gun.ammoType, Infinity);
                    player.disableInvulnerability();
                    // setInterval(() => player.activeItem.useItem(), 30);
                    map.game.addLoot(gun.idString, Vec.create(16, 32 + (16 * i)), 0);
                    map.game.addLoot(gun.ammoType, Vec.create(16, 32 + (16 * i)), 0, { count: Infinity });
                    map.game.grid.addObject(player);
                }
            }
        };
    })(),
    obstaclesTest: {
        width: 128,
        height: 128,
        beachSize: 0,
        oceanSize: 0,
        onGenerate(map, [obstacle]) {
            for (let x = 0; x <= 128; x += 16) {
                for (let y = 0; y <= 128; y += 16) {
                    map.generateObstacle(obstacle, Vec.create(x, y));
                }
            }
        }
    },*/
}

export type MapName = keyof typeof maps;
export const Maps: Record<MapName, MapDefinition> = maps;