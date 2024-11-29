import { GasState, Layer } from "@common/constants"
import { Vector } from "@common/utils/vector"
import { DefaultGasStages, GasStage } from "./gasStages"
import { type PluginDefinition } from "../pluginManager"
import { InitWithPlugin, startsWithD } from "../defaultPlugins/initWithPlugin"
import { type MapDefinition, type Maps } from "./maps"
import { mergeDeep,cloneDeep } from "@common/utils/misc"
import { PerkIds } from "@common/definitions/perks"
import { RemoveLootAfterTimePlugin } from "../defaultPlugins/removeLootAfterTime"
import { weaponSwapArgsD, WeaponSwapPlugin } from "../defaultPlugins/weaponSwapPlugin"
export const enum GasMode {
    Staged,
    Debug,
    Disabled
}
/**
 * There are 3 gas modes: GasMode.Normal, GasMode.Debug, and GasMode.Disabled.
 * GasMode.Normal: Default gas behavior. overrideDuration is ignored.
 * GasMode.Debug: The duration of each stage is always the duration specified by overrideDuration.
 * GasMode.Disabled: Gas is disabled.
 */
export type GasConfig={ readonly mode: GasMode.Disabled }
| { readonly mode: GasMode.Staged,readonly stages:GasStage[] }
| {
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
    }&Partial<MapDefinition>)
export interface Gamemode{
    readonly weaponsSelect:boolean,
    readonly globalDamage:number,
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
    readonly button?:{
        readonly icon: string,
        readonly buttonCss: string,
        readonly buttonText: string,
    }
    readonly score:{
        readonly kill:number
        readonly becomeKillLeader:number,
        readonly killKillLeader:number,
        readonly reviveFriend:number
        readonly position:number
        readonly win:number
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
    start_after:5,
    weaponsSelect:false,

    adrenalineLoss:0.0004,
    globalDamage:.75,
    armorProtection:1,

    defaultGroup:-1,
    group:false,

    score:{
        kill:5,
        position:0.1,
        becomeKillLeader:10,
        killKillLeader:10,
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
            ]
        },
        plugins:[
            {construct:InitWithPlugin,params:startsWithD},
            {construct:RemoveLootAfterTimePlugin}
        ],
        joinTime:(60*3)+10,
        weaponsSelect:true,
        maxPlayersPerGame:10,
        map:"deathmatch"
    },
    monster_hunter:{
        group:true,
        defaultGroup:0,
        start_after:60,
        joinTime:70,
        maxPlayersPerGame:36,
        button:{
            buttonCss:"btn-redmode",
            buttonText:"monster-hunter",
            icon:""
        },
        plugins:[
            //Monster
            {
                construct:InitWithPlugin,
                params:mergeDeep(cloneDeep(startsWithD),{
                    giveTo:1,
                    maxHealth:2,
                    group:1,
                    dropAll:true,
                    dropable:{
                        vest:false,
                        perks:false,
                        skin:false,
                    },
                    equipaments:{
                        gun1:["vepr12","m3k","usas12","m590m"],
                        gun2:["l115a1","mg5","negev"],
                        skin:"hasanger",
                        vest:"ultra_vest",
                        metalicBody:true,
                        ping:"warning_ping",
                        repeatPing:20,
                        infinityAmmo:true,
                        perks:[[PerkIds.Flechettes,PerkIds.AdvancedAthletics],PerkIds.SabotRounds,PerkIds.FieldMedic]
                    }
                })
            }
        ]
    },
    apple:{
        map:{
            extends:"normal",
            obstacles:{
                apple:250,
            }
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

                    "aug",
                    "m16a4",
                    "stoner_63",
                    "mg36",
                    "cz600",
                    "mini14",
                    "acr",
                    "negev",

                    "hp18",
                    "flues",
                    "model_37",
                    "m3k",
                    "vepr12",
                    "usas12",
                    "m590m",

                    "l11a1",
                    "mk18",

                    "deagle",
                    "dual_deagle",
                    "model_89",
                    "rsh12",
                    "dual_rsh12",

                    "g17_scoped",
                    "dual_g17_scoped",
                ],
                selectableMelees:[
                    "baseball_bat",
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
                ]
            })}
        ]
    },
    debug:{
        map:"debug",
        gas:{mode:GasMode.Disabled},
        weaponsSelect:true,
        plugins:[
            {
                construct:InitWithPlugin,
            }
        ],
        spawn:{mode:SpawnMode.Center}
    },
    normal:DefaultGamemode,
}