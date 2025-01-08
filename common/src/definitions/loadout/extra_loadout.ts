export enum ExtraLoadoutType{
    Fist,
    HealParticle,
    AdrParticle,
    Aura
}
export interface ExtraLoadoutDefinition{
    readonly frame:string
    readonly type:ExtraLoadoutType
}
export interface AuraDefinition{
    readonly frame:string
    readonly subaura?:AuraDefinition
    readonly type:ExtraLoadoutType.Aura
}

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
    }

}as const
export const ExtraLoadoutList=Object.keys(ExtraLoadout)