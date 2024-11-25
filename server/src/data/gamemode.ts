import { GasState, Layer } from "@common/constants"
import { Vector } from "@common/utils/vector"
import { DefaultGasStages, GasStage } from "./gasStages"
import { type PluginDefinition } from "../pluginManager"
import { InitWithPlugin, startsWithD } from "../defaultPlugins/initWithPlugin"
import { type Maps } from "./maps"
import { mergeDeep,cloneDeep } from "@common/utils/misc"
import { PerkIds } from "@common/definitions/perks"
import { RemoveLootAfterTimePlugin } from "../defaultPlugins/removeLootAfterTime"
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
export interface Gamemode{
    readonly weaponsSelect:boolean,
    readonly globalDamage:number,
    readonly gas:GasConfig
    readonly spawn:Spawn
    readonly armorProtection:number
    readonly plugins:Array<PluginDefinition>
    readonly joinTime:number
    readonly maxPlayersPerGame:number
    readonly map?:`${keyof typeof Maps}${string}`
    readonly group:boolean
    readonly start_after:number
    readonly defaultGroup:number
    readonly adrenalineLoss:number
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
    globalDamage:.73,
    armorProtection:1,

    defaultGroup:-1,
    group:false,
}

export const Gamemodes:Record<string,Partial<Gamemode>>={
    deathmatch:{
        adrenalineLoss:0.0001,
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
                    duration:60*7,
                    newRadius:0.8,
                    oldRadius:0.8,
                    state:GasState.Waiting,
                    summonAirdrop:true,
                },
                {
                    dps:10,
                    duration:45,
                    newRadius:0.5,
                    oldRadius:0.8,
                    state:GasState.Advancing,
                    summonAirdrop:true,
                },
                {
                    dps:10,
                    duration:60,
                    newRadius:0.5,
                    oldRadius:0.5,
                    state:GasState.Waiting,
                    summonAirdrop:true,
                },
                {
                    dps:13,
                    duration:40,
                    newRadius:0,
                    oldRadius:0.5,
                    state:GasState.Advancing,
                    summonAirdrop:true,
                },
            ]
        },
        plugins:[
            {construct:InitWithPlugin,params:startsWithD},
            {construct:RemoveLootAfterTimePlugin}
        ],
        joinTime:(60*7)+10,
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
        plugins:[
            //Monster
            {
                construct:InitWithPlugin,
                params:mergeDeep(cloneDeep(startsWithD),{
                    monster:1,
                    maxHealth:2,
                    group:1,
                    dropAll:true,
                    size:1.17,
                    equipaments:{
                        canDrop:false,
                        gun1:"vepr12",
                        gun2:"l115a1",
                        skin:"hasanger",
                        vest:"ultra_vest",
                        metalicBody:true,
                        perks:[PerkIds.Flechettes,PerkIds.SabotRounds,PerkIds.InfiniteAmmo,PerkIds.FieldMedic]
                    }
                })
            }
        ]
    },
    normal:DefaultGamemode
}