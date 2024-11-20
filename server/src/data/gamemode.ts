import { Layer } from "@common/constants"
import { Vector } from "@common/utils/vector"
import { DefaultGasStages, GasStage } from "./gasStages"
import { type GamePlugin } from "../pluginManager"
import { type Game } from "../game"
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
    readonly plugins:Array<new (game: Game) => GamePlugin>
}
export const DefaultGamemode:Gamemode={
    gas:{
        mode:GasMode.Staged,
        stages:DefaultGasStages
    },
    plugins:[],
    globalDamage:.73,
    weaponsSelect:false,
    armorProtection:1,
    spawn:{
        mode:SpawnMode.Normal
    }
}