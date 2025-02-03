import { GasState, Layer } from "@common/constants"
import { Vector } from "@common/utils/vector"
import { DefaultGasStages, GasStage } from "./gasStages"
import { type PluginDefinition } from "../pluginManager"
import { IslandDef, type MapDefinition, type Maps } from "./maps"
import { mergeDeep,cloneDeep } from "@common/utils/misc"
import { PerkIds } from "@common/definitions/perks"
import { RemoveLootAfterTimePlugin } from "../defaultPlugins/removeLootAfterTime"
import { weaponSwapArgsD, WeaponSwapPlugin } from "../defaultPlugins/weaponSwapPlugin"
import { Airstrike, Airstrikes } from "@common/definitions/guns"
import { type Player } from "../objects/player"
import { GiveRoleAfterDownsArgs, GiveRoleAfterDownsPlugin, GiveRoleAfterStartArgs, GiveRoleAfterStartPlugin, StartWithRolePlugin } from "../defaultPlugins/rolesPlugins"
import { ReloadGamemodePlugin } from "../defaultPlugins/reloadGamemodePlugin"
import { LootTable } from "./lootTables"
import { NullString } from "@common/utils/objectDefinitions"
export const enum GasMode {
    Staged,
    Debug,
    Disabled,
    Procedural
}
export interface Gamerole{
    name:string
    equipments:{
        vest?:string,
        helmet?:string,
        backpack?:string,
        
        gun1?:string|string[],
        gun2?:string|string[],
        melee?:string|string[],
        skin?:string,

        canDrop?:boolean,
        metalicBody?:boolean,
        infinityAmmo?:boolean,

        perks?:(PerkIds|PerkIds[])[],

        ping?:string,
        repeatPing?:number
    },
    adrenaline?:number,
    maxHealth?:number,
    size?:number,
    nameColor?:number,
    dropable?:Partial<Player["dropable"]>,
    items:Record<string,number>
}
const DefaultRoles:Record<string,Gamerole>={
    full:{
        name:"full",
        equipments:{
            vest:"tactical_vest",
            helmet:"tactical_helmet",
            backpack:"tactical_pack",
            infinityAmmo:true,
        },
        adrenaline:100,
        items:{
            "cola":8,
            "tablets":4,
            "medikit":4,
            "gauze":10,
            "2x_scope":1,
            "4x_scope":1,
        },
    },
    red_captain:{
        name:"red_captain",
        nameColor:0x640000,
        size:1.25,
        dropable:{
            helmet:false,
            perks:false,
            skin:false,
        },
        equipments:{
            gun1:["super90","usas12","m590m"],
            gun2:["radio"],
            skin:"shiny_hasanger",
            vest:"tactical_vest",
            melee:"fire_hatchet",
            backpack:"tactical_pack",
            helmet:"captain_helmet",
        },
        items:{
            "gauze":15,
            "medikit":4,
            "12g":90,
            "762mm":0,
            "2x_scope":1,
            "4x_scope":1,
            "8x_scope":1,
        }
    },
    red_sergeant:{
        name:"red_sergeant",
        nameColor:0x800000,
        dropable:{
            helmet:false,
            perks:false,
            skin:false,
        },
        equipments:{
            gun1:["pp19","vector","m1_garand"],
            skin:"shiny_error",
            vest:"tactical_vest",
            melee:"seax",
            backpack:"tactical_pack",
            helmet:"sergeant_helmet",
        },
        items:{
            "9mm":150,
            "762mm":100,
            "gauze":7,
            "medikit":2,
            "cola":4,
            "tablets":1,
            "2x_scope":1,
            "4x_scope":1,
        }
    },
    red_medic:{
        name:"red_medic",
        nameColor:0xff1155,
        dropable:{
            helmet:false,
            perks:false,
            skin:false,
        },
        equipments:{
            skin:"shiny_max_mcfly",
            vest:"tactical_vest",
            melee:"battlesaw",
            backpack:"tactical_pack",
            helmet:"medic_helmet",
            gun1:"medic_pistol",
        },
        items:{
            "medic_charge":400,
            "gauze":7,
            "medikit":2,
            "cola":4,
            "tablets":1,
            "2x_scope":1,
            "4x_scope":1,
        }
    },
    red_lastman:{
        name:"red_lastman",
        maxHealth:2,
        adrenaline:100,
        size:1.4,
        dropable:{
            vest:false,
            helmet:false,
            perks:false,
            skin:false,
        },
        items:{
            "gauze":7,
            "medikit":2,
            "cola":4,
            "tablets":1,
            "2x_scope":1,
            "4x_scope":1,
            "8x_scope":1,
        },
        equipments:{
            gun1:["vepr12","m3k","super90","usas12","m590m"],
            gun2:["l115a1","awms","pfeifer_zeliska","dual_pfeifer_zeliska","mg5","pkp","m134","m134_22lr","negev","m249","vickers"],
            melee:"battlesaw",
            skin:"shiny_max_mcfly",
            vest:"ultra_vest",
            backpack:"tactical_pack",
            helmet:"last_man_helmet",
            metalicBody:true,
            infinityAmmo:true,
            perks:[[PerkIds.SabotRounds,PerkIds.CloseQuartersCombat,PerkIds.SecondWind,PerkIds.ExtendedMags,PerkIds.AdvancedAthletics],PerkIds.Flechettes,PerkIds.FieldMedic]
        }
    }
}
//Blue Team
DefaultRoles["blue_captain"]=mergeDeep(cloneDeep(DefaultRoles["red_captain"]),{
    name:"blue_captain",
    nameColor:0x000064,
    equipments:{
        gun1:["an94","mg5","pkp"],
        skin:"shiny_123op",
    },
    items:{
        "762mm":300,
        "12g":0,
    }
} as Partial<Gamerole>)
//Blue sergeant
DefaultRoles["blue_sergeant"]=mergeDeep(cloneDeep(DefaultRoles["red_sergeant"]),{
    name:"blue_sergeant",
    nameColor:0x000080,
    equipments:{
        skin:"shiny_pap",
    }
} as Partial<Gamerole>)
//Blue Medic
DefaultRoles["blue_medic"]=mergeDeep(cloneDeep(DefaultRoles["red_medic"]),{
    name:"blue_medic",
    nameColor:0x000080,
    equipments:{
        skin:"shiny_amanda_corey",
    }
} as Partial<Gamerole>)
//Blue Lastman
DefaultRoles["blue_lastman"]=mergeDeep(cloneDeep(DefaultRoles["red_lastman"]),{
    name:"blue_lastman",
    nameColor:0x000080,
    equipments:{
        gun1:["vepr12","m3k","super90","usas12","m590m"],
        gun2:["l115a1","awms","pfeifer_zeliska","dual_pfeifer_zeliska","mg5","pkp","m134","m134_22lr","negev","m249","vickers"],
        melee:"battlesaw",
        skin:"shiny_amanda_corey",
    }
} as Partial<Gamerole>)

/**
 * There are 3 gas modes: GasMode.Normal, GasMode.Debug, and GasMode.Disabled.
 * GasMode.Normal: Default gas behavior. overrideDuration is ignored.
 * GasMode.Debug: The duration of each stage is always the duration specified by overrideDuration.
 * GasMode.Disabled: Gas is disabled.
 */
export type GasConfig={ readonly mode: GasMode.Disabled }
| { readonly mode: GasMode.Staged,readonly stages:GasStage[] }
| { 
    readonly mode: GasMode.Procedural,
    readonly minRadius:number
    readonly radiusDecay:number
    readonly initialRadius:number
    readonly advance:{
        readonly timeDecay:number
        readonly timeMin:number
        readonly initialTime:number
    }
    readonly waiting:{
        readonly timeDecay:number
        readonly timeMin:number
        readonly initialTime:number
    },
    readonly damage:number[]
    readonly airdrop:number[]
    readonly airstrikes?:{airstrike:Airstrike,stage:number}[]
 } | {
    readonly mode: GasMode.Debug
    readonly overridePosition?: boolean
    readonly overrideDuration?: number
}
export const enum SpawnMode {
    Normal,
    Radius,
    Fixed,
    Center
}
/**
 * There are 4 spawn modes: `Normal`, `Radius`, `Fixed`, and `Center`.
 * - `SpawnMode.Normal` spawns the player at a random location that is at least 50 units away from other players.
 * - `SpawnMode.Radius` spawns the player at a random location within the circle with the given position and radius.
 * - `SpawnMode.Fixed` always spawns the player at the exact position given.
 * - `SpawnMode.Center` always spawns the player in the center of the map.
 */
export type Spawn={ readonly mode: SpawnMode.Normal }
| {
    readonly mode: SpawnMode.Radius
    readonly position: Vector
    readonly radius: number
}
| {
    readonly mode: SpawnMode.Fixed
    readonly position: Vector
    readonly layer?: Layer
}
| { readonly mode: SpawnMode.Center }
export type GamemodeMap=`${keyof typeof Maps}${string}`|({
        readonly extends:`${keyof typeof Maps}${string}`
        readonly change_island:{
            island:[number,number],//Island And Choose
            def:Partial<IslandDef>
        }[]
    })
export interface Gamemode{
    readonly weaponsSelect:boolean
    readonly globalDamage:number
    readonly globalRange:number
    readonly gas:GasConfig
    readonly spawn:Spawn
    readonly armorProtection:number
    readonly plugins:Array<PluginDefinition>
    readonly joinTime:number
    readonly maxPlayersPerGame:number
    readonly map?:GamemodeMap
    readonly group:boolean
    readonly start_after:number
    readonly defaultGroup:number
    readonly adrenalineLoss:number
    readonly lootTables?:Record<string,LootTable>
    readonly button?:{
        readonly icon: string
        readonly buttonCss: string
        readonly buttonText: string
    }
    readonly airdrop:{
        readonly particlesCount:number
        readonly particlesDelay:number
        readonly crate:string
    },
    readonly score:{
        readonly kill:number
        readonly becomeKillLeader:number
        readonly killKillLeader:number
        readonly reviveFriend:number
        readonly position:number
        readonly win:number
    }
    readonly emotes_replace?:string
    readonly canRespawn?:boolean
    readonly keepInventory?:boolean
    readonly data?:number
    readonly factions?:{
        readonly count:number
        readonly spawnIslands?:number[]
    }
}
export const DefaultGamemode:Gamemode={
    gas:{
        mode:GasMode.Staged,
        stages:DefaultGasStages
    },
    plugins:[],
    joinTime:60,
    maxPlayersPerGame: 70,
    spawn:{
        mode:SpawnMode.Normal
    },
    factions:undefined,
    start_after:5,
    weaponsSelect:false,

    adrenalineLoss:0.0004,
    globalDamage:.75,
    globalRange:2.25,
    armorProtection:1,

    data:Date.UTC(87,2,24,2,4,25),

    defaultGroup:-1,
    group:false,

    airdrop:{
        crate:"airdrop_crate_locked",
        particlesCount:5,
        particlesDelay:100
    },

    score:{
        kill:5,
        position:0.1,
        becomeKillLeader:10,
        killKillLeader:8,
        reviveFriend:3,
        win:10,
    }
}
export const Gamemodes:Record<string,Partial<Gamemode>>={
    deathmatch:{
        adrenalineLoss:0.0001,
        button:{
            buttonCss:"btn-redmode",
            buttonText:"deathmatch",
            icon:"img/misc/player_icon.svg"
        },
        gas:{
            mode:GasMode.Staged,
            stages:[
                {
                    dps:0,
                    duration:0,
                    newRadius:0.8,
                    oldRadius:0.8,
                    state:GasState.Inactive
                },
                {
                    dps:0,
                    duration:60*3,
                    newRadius:0.8,
                    oldRadius:0.8,
                    state:GasState.Waiting,
                    summonAirdrop:true,
                },
                {
                    dps:10,
                    duration:45,
                    newRadius:0.4,
                    oldRadius:0.8,
                    state:GasState.Advancing,
                    summonAirdrop:true,
                },
                {
                    dps:10,
                    duration:60,
                    newRadius:0,
                    oldRadius:0.4,
                    state:GasState.Waiting,
                    summonAirdrop:true,
                },
                {
                    dps:13,
                    duration:40,
                    newRadius:0,
                    oldRadius:0.4,
                    state:GasState.Advancing,
                    summonAirdrop:true,
                },
                {
                    dps:14,
                    duration:0,
                    newRadius:0,
                    oldRadius:0,
                    state:GasState.Waiting,
                },
            ]
        },
        plugins:[
            {construct:StartWithRolePlugin,params:DefaultRoles["full"]},
            {construct:RemoveLootAfterTimePlugin}
        ],
        joinTime:(60*3)+10,
        weaponsSelect:true,
        canRespawn:true,
        keepInventory:true,
        maxPlayersPerGame:10,
        map:"deathmatch"
    },
    desert:{
        adrenalineLoss:0.0006,
        data:Date.UTC(91,4,13,3,26,30),
        lootTables:{
            ammo: [
                { item: "45acp", count: 60, weight: 1.1 },
                { item: "556mm", count: 60, weight: 1 },
                { item: "762mm", count: 60, weight: 1 },
                { item: "12g", count: 10, weight: 0.75 },
                { item: "50cal", count: 20, weight: 0.05 },
                { item: "medic_charge", count: 30, weight: 0.006 },
                { item: "338lap", count: 6, weight: 0.005 },
                { item: "curadell", count: 1, weight: 0.003 }
            ],
            common_guns:[
                { item: "fort_17", weight: 1 },
                { item: "m1895", weight: 0.5 },
                { item: "peacemaker", weight: 0.25 },
            ],
            uncommon_guns:[
                { item: "tommy", weight: 2 },
                { item: "radio", weight: 1.63 },
                { item: "hp18", weight: 1.1 },
                { item: "model_94", weight: 1 },
                { item: "aug", weight: 0.6 },
                { item: "model_37", weight: 0.55 },
                { item: "ak47", weight: 0.53 },
                { item: "flues", weight: 0.5 },
            ],
            rare_guns:[
                { item: "m16a4", weight:1 },
                { item: "acr", weight:1 },
                { item: "arx160", weight:1 },
                { item: "lewis_gun", weight: 0.85 },
                { item: "cz600", weight: 0.85 },
                { item: "m3k", weight: 0.8 },
                { item: "mg36", weight: 0.6 },
            ],
            epic_guns:[
                { item: "sr25", weight: 1 },
                { item: "mini14", weight: 1 },
                { item: "mcx_spear", weight: 1 },
                { item: "deagle", weight: 0.9 },
                { item: "bar", weight: 0.9 },
                { item: "vepr12", weight: 0.8 },
                { item: "mosin_nagant", weight: 0.7 },
                { item: "blr", weight: 0.7 },
                { item: "tango_51", weight: 0.65 },
                { item: "vector_acp", weight: 0.6 },
                { item: "nuke_radio", weight: 0.6 },
                { item: "stoner_63", weight: 0.6 },
                { item: "sv98", weight: 0.5 },
                { item: "medic_pistol", weight: 0.2 },
                { item: "p90", weight: 0.15 },
            ],
            legendary_guns:[
                { item: "m1_garand", weight: 1.1 },
                { item: "l86a2", weight: 1.05 },
                { item: "svd", weight: 1.05 },
                { item: "vickers", weight: 1 },
                { item: "negev", weight: 1 },
                { item: "m249", weight: 1 },
                { item: "mg5", weight: 1 },
                { item: "pkp", weight: 1 },
                { item: "super90", weight: 0.8 },
                { item: "delisle", weight: 0.8 },
                { item: "m590m", weight: 0.8 },
                { item: "usas12", weight: 0.6 },
                { item: "mk18", weight: 0.5 },
                { item: "l115a1", weight: 0.5 },
                { item: "pfeifer_zeliska", weight: 0.5 },
                { item: "dual_rsh12", weight: 0.5 },
                { item: "awms", weight: 0.4 },
                { item: "m134", weight: 0.4 },
            ],
            guns: [
                { table: "common_guns", weight: 23 },
                { table: "uncommon_guns", weight: 21 },
                { table: "rare_guns", weight: 9.5 },
                { table: "epic_guns", weight: 0.7 },
                { table: "legendary_guns", weight: 0.04 },
            ],
            special_guns: [
                { table: "uncommon_guns", weight: 24 },
                { table: "common_guns", weight: 23 },
                { table: "rare_guns", weight: 10 },
                { table: "epic_guns", weight: 0.8 },
                { table: "legendary_guns", weight: 0.065 },
            ],
            throwables: [
                { item: "frag_grenade", count: 2, weight: 1 },
                { item: "airstrike", count: 1, weight: 0.7 },
                { item: "mirv_grenade", count: 1, weight: 0.6 },
                { item: "smoke_grenade", count: 1, weight: 0.4 },
                { item: "c4", count: 2, weight: 0.2 },
            ],
            special_throwables: [
                { item: "frag_grenade", count: 1, weight: 1 },
                { item: "smoke_grenade", count: 1, weight: 1 },
                { item: "mirv_grenade", count: 1, weight: 0.6 },
                { item: "c4", count: 2, weight: 0.6 },
                { item: "airstrike", count: 1, weight: 0.25 },
            ],
            aegis_golden_case: [
                [{ item: "sergeant_helmet", weight: 1 }],
                [{ item: "fire_hatchet", weight: 1 }],
                [
                    { item: "super90", weight: 1 },
                    { item: "m590m", weight: 0.5 },
                    { item: "usas12", weight: 0.1 },
                ],
                [{ table: "vests", weight: 1 }],
                [{ table: "backpacks", weight: 1 }],
                [{ table: "special_healing_items", weight: 1 }],
                [{ table: "special_scopes", weight: 1 }],
                [{ item: "shiny_hasanger", weight: 1 }],
            ],
            aegis_golden_case1: [
                [{ item: "sergeant_helmet", weight: 1 }],
                [{ item: "fire_hatchet", weight: 1 }],
                [
                    { item: "an94", weight: 1 },
                    { item: "mg5", weight: 0.5 },
                    { item: "pkp", weight: 0.1 }
                ],
                [{ table: "vests", weight: 1 }],
                [{ table: "backpacks", weight: 1 }],
                [{ table: "special_healing_items", weight: 1 }],
                [{ table: "special_scopes", weight: 1 }],
                [{ item: "shiny_123op", weight: 1 }],
            ],
            shiny_skins:[
                { item: "shiny_anonymous", weight: 1.3 },
                { item: "shiny_max_mcfly", weight: 0.95  },
            ],
            gold_airdrop_crate: [
                [{ table: "airdrop_equipment", weight: 1 }],
                [{ table: "airdrop_scopes", weight: 1 }],
                [{ table: "airdrop_healing_items", weight: 1 }],
                [{ item: NullString, weight: 2.5 },{ table: "airdrop_skins", weight: .6 },{ table: "shiny_skins", weight: 1 }],
                [{ table: "perks", weight: 1 }],
                [{ table: "airdrop_melee", weight: 1 }],
                [{ table: "ammo", weight: 1 }],
                [{ table: "legendary_guns", weight: 1 }],
                [{ table: "special_throwables", count: 1, weight: 2 }]
            ],
            airdrop_melee: [
                { item: NullString, weight: 1 },
                { item: "hatchet", weight: 0.3 },
                { item: "maul", weight: 0.25 },
                { item: "fire_hatchet", weight: 0.2 },
                { item: "battlesaw", weight: 0.1 },
            ],
            perks: {
                min: 1,
                max: 1,
                noDuplicates: true,
                loot: [
                    { item: PerkIds.Flechettes, weight: 1 },
                    { item: PerkIds.SecondWind, weight: 1 },
                    { item: PerkIds.FieldMedic, weight: 1 },
                    { item: PerkIds.SabotRounds, weight: 1 },
                    { item: PerkIds.AdvancedAthletics, weight: 1 },
                ]
            },
        },
        map:"desert",
    },
    manhunt:{
        group:true,
        defaultGroup:0,
        start_after:2,
        joinTime:10,
        maxPlayersPerGame:36,
        button:{
            buttonCss:"btn-redmode",
            buttonText:"manhunt",
            icon:""
        },
        data:Date.UTC(88,2,10,1,23,15),
        airdrop:{
            particlesCount:15,
            crate:"big_airdrop_crate_locked",
            particlesDelay:20,
        },
        plugins:[
            {
                construct:GiveRoleAfterStartPlugin,
                params:{
                    group:{
                        group:1
                    },
                    role:DefaultRoles["red_lastman"],
                }satisfies GiveRoleAfterStartArgs
            },
            {
                construct:GiveRoleAfterStartPlugin,
                params:{
                    afterTime:10,
                    group:{
                        group:0,
                        needGroup:true,
                    },
                    role:DefaultRoles["blue_medic"],
                }satisfies GiveRoleAfterStartArgs
            },
            /*Not Cannon Just By Gameplay
            {
                construct:GiveRoleAfterDownsPlugin,
                params:{
                    group:0,
                    count:1,
                    role:DefaultRoles["blue_lastman"],
                    preferenceRole:"blue_medic",
                }satisfies GiveRoleAfterDownsArgs
            },
            */
        ]
    },
    reload:{
        canRespawn:true,
        map:"islands",
        plugins:[{
            construct:ReloadGamemodePlugin,
            params:{
                delay:100,
            }
        }],
        joinTime:((10*60)*60)+10,//10M And 10S
        start_after:5,
        gas:{
            mode:GasMode.Staged,
            stages:[
                {
                    dps:0,
                    duration:0,
                    newRadius:0.8,
                    oldRadius:0.8,
                    state:GasState.Inactive
                },
                {
                    dps:0,
                    duration:(10*60)*60,//10M
                    newRadius:0.8,
                    oldRadius:0.8,
                    state:GasState.Waiting,
                    summonAirdrop:true,
                },
                {
                    dps:10,
                    duration:120,
                    newRadius:0.4,
                    oldRadius:0.8,
                    state:GasState.Advancing,
                    summonAirdrop:true,
                },
                {
                    dps:10,
                    duration:60,
                    newRadius:0,
                    oldRadius:0.4,
                    state:GasState.Waiting,
                    summonAirdrop:true,
                },
                {
                    dps:13,
                    duration:70,
                    newRadius:0,
                    oldRadius:0.4,
                    state:GasState.Advancing,
                    summonAirdrop:true,
                },
                {
                    dps:14,
                    duration:0,
                    newRadius:0,
                    oldRadius:0,
                    state:GasState.Waiting,
                },
            ]
        }
    },
    apple:{
        map:{
            extends:"normal",
            change_island:[{
                island:[0,0],
                def:{
                    obstacles:{
                        apple:100,
                    }
                }
            }]
        },
        lootTables:{
            aegis_golden_case:[
                { item: "apple_launcher", weight: 1 },
            ]
        },
        button:{
            buttonCss:"btn-redmode",
            buttonText:"apples-mode",
            icon:""
        },
        plugins:[
            {construct:WeaponSwapPlugin,params:mergeDeep(cloneDeep(weaponSwapArgsD),{
                obstacles:[
                    "apple"
                ],
                selectableGuns:[
                    "taurus_tx22",
                    "dual_taurus_tx22",
                    "uzi_22lr",
                    "rifle_cbc",
                    "m134_22lr",

                    "g19",
                    "dual_g19",
                    "cz75a",
                    "dual_cz75a",
                    "mp40",
                    "saf200",
                    "micro_uzi",
                    "vector",
                    "vss",
                    "pp19",

                    "m1895",
                    "dual_m1895",
                    "ak47",
                    "mcx_spear",
                    "arx160",
                    "lewis_gun",
                    "mosin_nagant",
                    "sr25",
                    "tango_51",
                    "mg5",
                    "blr",
                    "svd",
                    "an94",
                    "m134",
                    "sv98",
                    "pkp",
                    "bar",
                    "vickers",
                    "ppsh41",

                    "aug",
                    "m16a4",
                    "stoner_63",
                    "mg36",
                    "cz600",
                    "mini14",
                    "acr",
                    "negev",
                    "l86a2",
                    "m249",

                    "model_94",
                    "peacemaker",
                    "dual_peacemaker",
                    "p90",
                    "tommy",
                    "delisle",
                    "vector_acp",

                    "hp18",
                    "flues",
                    "model_37",
                    "m3k",
                    "vepr12",
                    "usas12",
                    "m590m",
                    "super90",

                    "l11a1",
                    "mk18",
                    "awms",
                    "pfeifer_zeliska",
                    "dual_pfeifer_zeliska",

                    "deagle",
                    "dual_deagle",
                    "model_89",
                    "rsh12",
                    "dual_rsh12",

                    "g17_scoped",
                    "dual_g17_scoped",

                    "medic_pistol",
                    "dual_medic_pistol",
                ],
                selectableMelees:[
                    "baseball_bat",
                    "battlesaw",
                    "maul",
                    "steelfang",
                    "seax",
                    "falchion",
                    "ice_pick",
                    "feral_claws",
                    "sickle",
                    "kbar",
                    "hatchet",
                    "fire_hatchet",
                    "crowbar",
                    "gas_can"
                ],
                selectableThrowables:[
                    "frag_grenade",
                    "smoke_grenade",
                    "mirv_grenade",
                    "ice_grenade"
                ],
                blackList:[
                    "apple_launcher"
                ]
            })}
        ],
        emotes_replace:"apple_emote"
    },
    "1v1":{
        adrenalineLoss:0.0001,
        maxPlayersPerGame:2,
        start_after:1,
        joinTime:5,
        gas:{
            mode:GasMode.Staged,
            stages:[
                {
                    dps:0,
                    duration:0,
                    newRadius:0.8,
                    oldRadius:0.8,
                    state:GasState.Inactive
                },
                {
                    dps:0,
                    duration:20,
                    newRadius:0.4,
                    oldRadius:0.8,
                    state:GasState.Waiting,
                },
                {
                    dps:10,
                    duration:20,
                    newRadius:0.4,
                    oldRadius:0.8,
                    state:GasState.Advancing,
                },
                {
                    dps:10,
                    duration:20,
                    newRadius:0.2,
                    oldRadius:0.4,
                    state:GasState.Waiting,
                },
                {
                    dps:13,
                    duration:20,
                    newRadius:0.2,
                    oldRadius:0.4,
                    state:GasState.Advancing,
                },
                {
                    dps:13,
                    duration:60,
                    newRadius:0,
                    oldRadius:0.2,
                    state:GasState.Waiting,
                },
                {
                    dps:14,
                    duration:20,
                    newRadius:0,
                    oldRadius:0.2,
                    state:GasState.Advancing,
                },
                {
                    dps:4,
                    duration:0,
                    newRadius:0,
                    oldRadius:0,
                    state:GasState.Waiting,
                },
            ]
        },
        button:{
            buttonCss:"btn-redmode",
            buttonText:"1v1",
            icon:""
        },
        plugins:[
            {construct:StartWithRolePlugin,params:DefaultRoles["full"]},
            {construct:RemoveLootAfterTimePlugin}
        ],
        weaponsSelect:true,
        map:"deathmatch"
    },
    factions:{
        map:"double_island",
        group:true,
        data:Date.UTC(88,2,10,1,23,15),
        gas:{
            damage:[1,1,2,2,4,4,10,10,13,13,15,15],
            airdrop:[3,5],
            airstrikes:[
                {
                    airstrike:Airstrikes["tactical_nuke"],
                    stage:2
                },
                {
                    airstrike:Airstrikes["bombs"],
                    stage:2
                },
                {
                    airstrike:Airstrikes["tactical_nuke"],
                    stage:4
                },
                {
                    airstrike:Airstrikes["bombs"],
                    stage:4
                },
                {
                    airstrike:Airstrikes["tactical_nuke"],
                    stage:6
                },
                {
                    airstrike:Airstrikes["bombs"],
                    stage:6
                },
            ],
            mode:GasMode.Procedural,
            advance:{
                initialTime:50,
                timeMin:14,
                timeDecay:0.9,
            },
            waiting:{
                initialTime:140,
                timeMin:30,
                timeDecay:0.9,
            },
            minRadius:0.005,
            initialRadius:0.72,
            radiusDecay:0.73,
        },
        factions:{
            count:2,
            spawnIslands:[0,1]
        },
        joinTime:100,
        maxPlayersPerGame:60,
        airdrop:{
            particlesCount:15,
            crate:"big_airdrop_crate_locked",
            particlesDelay:20,
        },
        plugins:[
            //
            //Red
            //
            //Red Captain
            {
                construct:GiveRoleAfterStartPlugin,
                params:{
                    afterTime:50,
                    group:{
                        group:0,
                        needGroup:true,
                        canDowned:true,
                    },
                    role:DefaultRoles["red_captain"],
                }satisfies GiveRoleAfterStartArgs
            },
            //Red Medic
            {
                construct:GiveRoleAfterStartPlugin,
                params:{
                    afterTime:55,
                    group:{
                        group:0,
                        needGroup:true,
                        canDowned:true,
                    },
                    role:DefaultRoles["red_medic"],
                }satisfies GiveRoleAfterStartArgs
            },
            //Red Extra
            {
                construct:GiveRoleAfterStartPlugin,
                params:{
                    afterTime:60,
                    group:{
                        group:0,
                        needGroup:true,
                        canDowned:true,
                    },
                    count:1,
                    role:DefaultRoles["red_sergeant"],
                }satisfies GiveRoleAfterStartArgs
            },
            //Red Lastman
            {
                construct:GiveRoleAfterDownsPlugin,
                params:{
                    group:0,
                    count:1,
                    role:DefaultRoles["red_lastman"],
                }satisfies GiveRoleAfterDownsArgs
            },
            //
            //Blue
            //
            //Blue Captain
            {
                construct:GiveRoleAfterStartPlugin,
                params:{
                    afterTime:50,
                    group:{
                        group:1,
                        needGroup:true,
                        canDowned:true,
                    },
                    role:DefaultRoles["blue_captain"],
                }satisfies GiveRoleAfterStartArgs
            },
            //Blue Medic
            {
                construct:GiveRoleAfterStartPlugin,
                params:{
                    afterTime:55,
                    group:{
                        group:1,
                        needGroup:true,
                        canDowned:true,
                    },
                    role:DefaultRoles["blue_medic"],
                }satisfies GiveRoleAfterStartArgs
            },
            //Blue Extra
            {
                construct:GiveRoleAfterStartPlugin,
                params:{
                    afterTime:60,
                    group:{
                        group:1,
                        needGroup:true,
                        canDowned:true,
                    },
                    count:1,
                    role:DefaultRoles["blue_sergeant"],
                }satisfies GiveRoleAfterStartArgs
            },
            //Blue Lastman
            {
                construct:GiveRoleAfterDownsPlugin,
                params:{
                    group:1,
                    count:1,
                    role:DefaultRoles["blue_lastman"],
                }satisfies GiveRoleAfterDownsArgs
            },
        ],
        button:{
            buttonCss:"btn-red-blue",
            buttonText:"factions",
            icon:""
        }
    },
    debug:{
        map:"debug",
        gas:{mode:GasMode.Disabled},
        weaponsSelect:true,
        adrenalineLoss:0,
        plugins:[
            {construct:StartWithRolePlugin,params:DefaultRoles["full"]},
        ],
        airdrop:{
            particlesCount:15,
            crate:"big_airdrop_crate_locked",
            particlesDelay:20,
        },
        spawn:{mode:SpawnMode.Center}
    },
    gas_debug:{
        spawn:{mode:SpawnMode.Center},
        weaponsSelect:true,
        adrenalineLoss:0,
        start_after:1,
        plugins:[
            {construct:StartWithRolePlugin,params:DefaultRoles["full"]},
        ],
        gas:{mode:GasMode.Staged,stages:[
            {
                dps:0,
                duration:0,
                newRadius:0,
                oldRadius:1,
                state:GasState.Inactive,
            },
            {
                dps:0,
                duration:12,
                newRadius:0,
                oldRadius:1,
                state:GasState.Advancing,
            },
            {
                dps:0,
                duration:0,
                newRadius:0,
                oldRadius:0,
                state:GasState.Waiting,
            },
        ]},
    },
    normal:DefaultGamemode,
    mini_normal:{
        map:"mini_normal",
        maxPlayersPerGame:20,
    }
}
