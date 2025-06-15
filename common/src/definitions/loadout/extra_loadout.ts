import { PerkIds } from "../perks"

export enum ExtraLoadoutType{
    Fist,
    HealParticle,
    AdrParticle,
    Aura,
    Role
}
export interface FistDefinition{
    readonly frame:string
    readonly type:ExtraLoadoutType.Fist
}
export interface AuraDefinition{
    readonly frame:string
    readonly subaura?:AuraDefinition
    readonly type:ExtraLoadoutType.Aura
}

export interface RoleDefinition{
    readonly frame:string
    readonly perks:PerkIds[]
    readonly helmet:string
    readonly type:ExtraLoadoutType.Role
}
export type ExtraLoadoutDefinition=AuraDefinition|RoleDefinition|FistDefinition

export const ExtraLoadout:Record<string,ExtraLoadoutDefinition>={
    //Fists
    "pirate_fist":{
        frame:"pirate_fist",
        type:ExtraLoadoutType.Fist
    },
    "emote_fist":{
        frame:"emote_fist",
        type:ExtraLoadoutType.Fist
    },
    "party_hand_emu_fist":{
        frame:"party_hand_emu_fist",
        type:ExtraLoadoutType.Fist
    },
    //Healing Particles

    //Auras
    shiny_aura:{
        frame:"shiny_aura",
        type:ExtraLoadoutType.Aura
    },
    medic_aura:{
        frame:"medic_aura",
        type:ExtraLoadoutType.Aura
    },

    medic_role:{
        type:ExtraLoadoutType.Role,
        frame:"max_mcfly",
        helmet:"medic",
        perks:[PerkIds.HealingAura,PerkIds.SelfRevive]
    },
    forest_queen_role:{
        type:ExtraLoadoutType.Role,
        frame:"amanda_corey",
        helmet:"lastwoman",
        perks:[PerkIds.InfiniteAmmo]
    }

}as const
export const ExtraLoadoutList=Object.keys(ExtraLoadout)