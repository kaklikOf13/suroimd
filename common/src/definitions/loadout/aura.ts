/*
    `@stylistic/no-multi-spaces`: Disabled to allow nicer alignment
*/

export interface AuraDefinition{
    readonly frame:string
    subaura?:AuraDefinition
}

export const Auras:Record<string,AuraDefinition> = {
    shiny_aura:{
        frame:"shiny_aura",
    },
    medic_aura:{
        frame:"medic_aura",
    }
}

