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
    readonly skin?:string[]
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
        skin:["shiny_amanda_corey","shiny_max_mcfly"],
        perks:[PerkIds.FieldMedic,PerkIds.NatureBreath]
    },
    scout_role:{
        type:ExtraLoadoutType.Role,
        frame:"leia",
        helmet:"pigmin",
        skin:["shiny_radians","shiny_leia"],
        perks:[PerkIds.LowProfile,PerkIds.SecondWind]
    },
    apple_master_role:{
        type:ExtraLoadoutType.Role,
        frame:"anonymous",
        helmet:"apple",
        skin:["shiny_sky","shiny_anonymous"],
        perks:[PerkIds.AppleArt,PerkIds.InfiniteAmmo]
    },
    sniper_role:{
        type:ExtraLoadoutType.Role,
        frame:"aurora",
        helmet:"sniper",
        skin:["shiny_aurora","shiny_nebula"],
        perks:[PerkIds.Takedown,PerkIds.Toploaded]
    },
    assault_role:{
        type:ExtraLoadoutType.Role,
        frame:"error",
        skin:["shiny_error","shiny_pap"],
        helmet:"sergeant",
        perks:[PerkIds.GreatAmmoBox,PerkIds.ExtendedMags]
    },
    demo_role:{
        type:ExtraLoadoutType.Role,
        frame:"anonymous",
        skin:["shiny_anonymous"],
        helmet:"demo_man",
        perks:[PerkIds.DemoExpert,PerkIds.NadeFabricator]
    },
    tank_role:{
        type:ExtraLoadoutType.Role,
        frame:"amanda_corey",
        skin:["shiny_amanda_corey","shiny_max_mcfly"],
        helmet:"last_man",
        perks:[PerkIds.IronSkin,PerkIds.SelfRevive]
    },
}as const
export const ExtraLoadoutList=Object.keys(ExtraLoadout)