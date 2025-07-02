import { NullString, ReferenceTo } from "../../utils/objectDefinitions"
import { FloorNames } from "../../utils/terrain"
import { Vec, Vector } from "../../utils/vector"
import { Biomes } from "./biome"
import { BuildingDefinition } from "../buildings"
import { ObstacleDefinition } from "../obstacles"
import { LootTables } from "./lootTables"

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
export enum Atlases{
    normal="normal",
    shared="shared",
    desert="desert",
    savannah="savannah",
    strange_lands="strange_lands"
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
    readonly lootTable?:string
    readonly atlas:Atlases[]
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
    readonly biome?:string
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
    Trees:[
        {obstacle:"small_oak_tree", weight:20},
        {obstacle:"oak_tree", weight:17},
        {obstacle:"birch_tree", weight:10},
        {obstacle:"pine_tree", weight:4},
        {obstacle:"trumpet_tree", weight:2.2},
    ],
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
    Bushs:[
        {obstacle:"bush", weight:1.2},
        {obstacle:"berry_bush", weight:0.8},
    ],
}
const StrangeLandsChooses:Record<string,WeightedMapOBJ[]>={
    Trees:[
        {obstacle:"small_oak_tree_sl", weight:20},
        {obstacle:"oak_tree_sl", weight:17},
        {obstacle:"birch_tree_sl", weight:10},
        {obstacle:"pine_tree_sl", weight:4},
    ],
    Bushs:[
        {obstacle:"bush_sl", weight:1.2},
        {obstacle:"berry_bush_sl", weight:0.8},
    ],
}
export const maps={
    normal: {
        width: 1900,
        height: 1900,
        oceanSize: 128,
        beachSize: 32,
        atlas:[Atlases.shared,Atlases.normal],
        islands:[
            {
                spawn:IslandSpawns.Center,
                chooses:[
                    //Vanilla
                    {
                        rivers: {
                            minAmount: 1,
                            maxAmount: 3,
                            maxWideAmount: 1,
                            wideChance: 0.25,
                            minWidth: 11,
                            maxWidth: 27,
                            minWideWidth: 26,
                            maxWideWidth: 33,
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
                            regular_crate: 150,
                            flint_crate: 12,
                            aegis_crate: 12,
                            vending_machine:12,
                            survival_crate:3,
                            grenade_crate: 55,
                            rock: 430,
                            river_chest: 2,
                            river_rock: 30,
                            // birthday_cake: 100, // birthday mode
                            lily_pad: 30,
                            barrel:70,
                            viking_chest: 2,
                            super_barrel: 20,
                            melee_crate: 2,
                            gold_rock: 1,
                            loot_barrel: 3,
                            flint_stone: 1
                        },
                        chooses:[
                            {
                                objects:DefaultChooses.Bushs,
                                min:210,
                                max:250,
                            },
                            {
                                objects:DefaultChooses.Trees,
                                min:150,
                                max:190,
                            }
                        ],
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
    strange_island: {
        width: 1900,
        height: 1900,
        oceanSize: 128,
        beachSize: 32,
        biome:"strange_lands",
        atlas:[Atlases.strange_lands,Atlases.shared,Atlases.normal],
        islands:[
            {
                spawn:IslandSpawns.Center,
                chooses:[
                    //Vanilla
                    {
                        rivers: {
                            minAmount: 1,
                            maxAmount: 3,
                            maxWideAmount: 1,
                            wideChance: 0.25,
                            minWidth: 11,
                            maxWidth: 27,
                            minWideWidth: 26,
                            maxWideWidth: 33,
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
                            murders_house:1,
                            container_3: 3,
                            container_4: 3,
                            container_5: 3,
                            container_6: 3,
                            container_7: 3,
                            container_8: 3,
                            container_9: 3,
                            container_10: 3
                        },
                        majorBuildings: ["armory", "refinery", "port_complex", "headquarters","murders_house"],
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
                            oak_tree_sl: 40,
                            regular_crate: 150,
                            flint_crate: 12,
                            aegis_crate: 12,
                            survival_crate:3,
                            grenade_crate: 55,
                            rock: 430,
                            river_chest: 2,
                            pod_locked:100,
                            river_rock: 30,
                            lily_pad: 30,
                            barrel:70,
                            viking_chest: 2,
                            super_barrel: 20,
                            melee_crate: 2,
                            gold_rock: 1,
                            loot_barrel: 3,
                            flint_stone: 1
                        },
                        chooses:[
                            {
                                objects:StrangeLandsChooses.Bushs,
                                min:210,
                                max:250,
                            },
                            {
                                objects:StrangeLandsChooses.Trees,
                                min:150,
                                max:190,
                            }
                        ],
                        obstacleClumps: [
                            {
                                clumpAmount: 140,
                                clump: {
                                    minAmount: 2,
                                    maxAmount: 4,
                                    jitter: 5,
                                    obstacles: ["small_oak_tree_sl"],
                                    radius: 12
                                }
                            },
                            {
                                clumpAmount: 50,
                                clump: {
                                    minAmount: 2,
                                    maxAmount: 4,
                                    jitter: 5,
                                    obstacles: ["birch_tree_sl"],
                                    radius: 12
                                }
                            },
                            {
                                clumpAmount: 8,
                                clump: {
                                    minAmount: 2,
                                    maxAmount: 4,
                                    jitter: 5,
                                    obstacles: ["pine_tree_sl","birch_tree_sl"],
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
    savannah: {
        width: 1900,
        height: 1900,
        oceanSize: 128,
        beachSize: 32,
        atlas:[Atlases.shared,Atlases.normal],
        biome:"savannah",
        islands:[
            {
                spawn:IslandSpawns.Center,
                chooses:[
                    {
                        rivers: {
                            minAmount: 1,
                            maxAmount: 3,
                            maxWideAmount: 1,
                            wideChance: 0.25,
                            minWidth: 11,
                            maxWidth: 27,
                            minWideWidth: 26,
                            maxWideWidth: 33,
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
                            sea_traffic_control: 1,
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
                        },
                        majorBuildings: ["armory", "refinery"],
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
                            regular_crate: 150,
                            flint_crate: 12,
                            aegis_crate: 12,
                            survival_crate:3,
                            grenade_crate: 55,
                            rock: 430,
                            river_chest: 2,
                            river_rock: 30,
                            // birthday_cake: 100, // birthday mode
                            lily_pad: 30,
                            barrel:70,
                            viking_chest: 2,
                            super_barrel: 20,
                            melee_crate: 2,
                            gold_rock: 1,
                            loot_barrel: 3,
                            flint_stone: 1
                        },
                        chooses:[
                            {
                                objects:DefaultChooses.Bushs,
                                min:210,
                                max:250,
                            },
                            {
                                objects:DefaultChooses.Trees,
                                min:150,
                                max:190,
                            }
                        ],
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
        atlas:[Atlases.shared,Atlases.normal],
        width: 4000,
        height: 4000,
        oceanSize: 100,
        beachSize: 29,
        islands:[
            {
                chooses:[
                    {
                        beach:FloorNames.Sand,
                        beachSize:32,
                        grass:FloorNames.Grass,
                        interiorSize:1300,
                        chooses:[
                            {
                                max:2,
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
                                max:11,
                                min:10,
                                objects:DefaultChooses.ContainersChoose,
                            },
                            {
                                max:13,
                                min:12,
                                objects:DefaultChooses.SpecialLootTables
                            },
                            {
                                max:80,
                                min:60,
                                objects:DefaultChooses.LootTables
                            }
                        ],
                        obstacles:{
                            rock:80,
                            oak_tree: 30,
                            small_oak_tree: 60,
                            birch_tree: 20,
                            pine_tree: 7,
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
                    {
                        beach:FloorNames.SandBeach,
                        beachSize:32,
                        grass:FloorNames.Sand,
                        interiorSize:1300,
                        chooses:[
                            {
                                max:2,
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
                                max:11,
                                min:10,
                                objects:DefaultChooses.ContainersChoose,
                            },
                            {
                                max:13,
                                min:12,
                                objects:DefaultChooses.SpecialLootTables
                            },
                            {
                                max:80,
                                min:60,
                                objects:DefaultChooses.LootTables
                            }
                        ],
                        obstacles:{
                            rock:160,
                            loot_tree: 2,
                            barrel:40,
                            super_barrel:20,
                        },
                        loots:{
                            ground_loot:30,
                        },
                        obstacleClumps: [
                            {
                                clumpAmount: 30,
                                clump: {
                                    minAmount: 3,
                                    maxAmount: 12,
                                    jitter: 9,
                                    obstacles: ["rock"],
                                    radius: 20
                                }
                            },
                            {
                                clumpAmount: 6,
                                clump: {
                                    minAmount: 3,
                                    maxAmount: 12,
                                    jitter: 9,
                                    obstacles: ["rock","barrel"],
                                    radius: 20
                                }
                            },
                        ],
                    },
                ],
                max:2,
                min:4,
                spawnAttempts:150,
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
    double_island: {
        atlas:[Atlases.shared,Atlases.normal],
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
                            },
                            {
                                objects:DefaultChooses.Bushs,
                                min:80,
                                max:120,
                            },
                            {
                                objects:DefaultChooses.Trees,
                                min:60,
                                max:120,
                            }
                        ],
                        obstacles:{
                            rock:40,
                            oak_tree: 20,
                            loot_tree: 1,
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
                            },

                            {
                                objects:DefaultChooses.Bushs,
                                min:50,
                                max:60,
                            },
                            {
                                objects:DefaultChooses.Trees,
                                min:30,
                                max:50,
                            }
                        ],
                        obstacles:{
                            rock:20,
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
                            },
                            {
                                objects:DefaultChooses.Bushs,
                                min:20,
                                max:30,
                            },
                            {
                                objects:DefaultChooses.Trees,
                                min:10,
                                max:25,
                            }
                        ],
                        obstacles:{
                            rock:10,
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
                            {
                                objects:DefaultChooses.Bushs,
                                min:1,
                                max:1,
                            },
                            {
                                objects:DefaultChooses.Trees,
                                min:1,
                                max:1,
                            }
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
                    },
                ],
                max:7,
                min:7,
                spawnAttempts:90,
            },
        ],
    },
    deathmatch: {
        atlas:[Atlases.shared,Atlases.normal],
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
                    berry_bush: 5,
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
    desert: {
        atlas:[Atlases.shared,Atlases.normal,Atlases.desert],
        width: 1800,
        height: 1800,
        oceanSize: 128,
        beachSize: 55,
        
        islands:[
            {
                spawn:IslandSpawns.Center,
                chooses:[
                    {
                        rivers: {
                            minAmount: 1,
                            maxAmount: 2,
                            maxWideAmount: 1,
                            wideChance: 0.1,
                            minWidth: 9,
                            maxWidth: 24,
                            minWideWidth: 16,
                            maxWideWidth: 13,
                        },
                        loots: {
                            ground_loot: 100
                        },
                        beachSize:55,
                        interiorSize:1700,
                        beach:FloorNames.SandBeach,
                        grass:FloorNames.Sand,
                        buildings:{
                            desert_town:1,
                            battlefield:1,
                            sea_traffic_control: 1,
                            //armory: 1,
                            //refinery: 1,
                            warehouse: 3,
                            green_house: 2,
                            blue_house: 2,
                            red_house: 1,
                            red_house_v2: 1,
                            mobile_home: 4,
                            porta_potty: 13,
                            container_3: 2,
                            container_4: 3,
                            container_5: 2,
                            container_6: 2,
                            container_7: 2,
                            container_8: 2,
                            container_9: 2,
                            container_10: 3,
                        },
                        majorBuildings: ["armory", "refinery","battlefield"],
                        quadBuildingLimit: {
                            red_house: 1,
                            red_house_v2: 1,
                            warehouse: 2,
                            green_house: 1,
                            blue_house: 1,
                            mobile_home: 3,
                            porta_potty: 3,
                            battlefield:1
                        },
                        obstacles:{
                            oil_tank: 25,
                            regular_crate: 170,
                            flint_crate: 25,
                            grenade_crate: 55,
                            rock: 460,
                            river_chest: 1,
                            river_rock: 10,
                            barrel:75,
                            propane_tank:30,
                            viking_chest: 2,
                            super_barrel: 25,
                            melee_crate: 2,
                            gold_rock: 1,
                            loot_barrel: 2,
                            flint_stone: 8,
                            oak_tree_desert:160,
                            big_desert_tree:60,
                        },
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
        ],
        lootTable:"desert"
    },
    debug: {
        atlas:[Atlases.shared,Atlases.normal],
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
        places: [
            { name: "[object Objecto]", position: Vec.create(0.8, 0.7) },
            { name: "Kevin Panic", position: Vec.create(0.6, 0.8) },
            { name: "UnullPointerException", position: Vec.create(0.7, 0.3) },
            { name: "defined Forest", position: Vec.create(0.3, 0.2) },
            { name: "seg. have\n(core dumped)", position: Vec.create(0.3, 0.7) },
            { name: "Can read props of null", position: Vec.create(0.4, 0.5) }
        ]
    },
    singleBuilding: {
        width: 1024,
        height: 1024,
        beachSize: 32,
        oceanSize: 64,
        atlas:[Atlases.shared,Atlases.desert,Atlases.normal,Atlases.strange_lands],
        islands:[
            {
                spawn:IslandSpawns.Center,
                major:true,
                chooses:[
                    {
                        beach:FloorNames.Sand,
                        beachSize:20,
                        grass:FloorNames.Grass,
                        interiorSize:800,

                    }
                ]
            },
        ],
        places: [
            { name: "[object Objecto]", position: Vec.create(0.8, 0.7) },
            { name: "Kevin Panic", position: Vec.create(0.6, 0.8) },
            { name: "UnullPointerException", position: Vec.create(0.7, 0.3) },
            { name: "defined Forest", position: Vec.create(0.3, 0.2) },
            { name: "seg. have\n(core dumped)", position: Vec.create(0.3, 0.7) },
            { name: "Can read props of null", position: Vec.create(0.4, 0.5) }
        ]
    },
    singleObstacle: {
        width: 512,
        height: 512,
        beachSize: 8,
        oceanSize: 8,
        atlas:[Atlases.shared,Atlases.desert,Atlases.normal,Atlases.strange_lands],
        islands:[
            {
                spawn:IslandSpawns.Center,
                major:true,
                chooses:[
                    {
                        beach:FloorNames.Sand,
                        beachSize:20,
                        grass:FloorNames.Grass,
                        interiorSize:800,

                    }
                ]
            },
        ]
    },
} satisfies Record<string,MapDefinition>;

export type MapName = keyof typeof maps;
export const Maps: Record<MapName, MapDefinition> = maps;