import { ItemType, ObjectDefinitions, type ItemDefinition } from "../utils/objectDefinitions";

export interface AmmoDefinition extends ItemDefinition {
    readonly itemType: ItemType.Ammo
    readonly maxStackSize: number
    readonly dropAmmout:number
    readonly characteristicColor: {
        readonly hue: number
        readonly saturation: number
        readonly lightness: number
    }
    /**
     * Marking an ammo type as `ephemeral` does the following:
     * - All players start with it maxed out
     * - It cannot be depleted nor dropped
     * - It does not show up on the HUD
     * - It can always be picked up
     */
    readonly ephemeral: boolean
    readonly defaultCasingFrame: string
    readonly hideUnlessPresent: boolean
    readonly capacity:number
    readonly size:number
}

export const Ammos = ObjectDefinitions.withDefault<AmmoDefinition>()(
    "Ammos",
    {
        itemType: ItemType.Ammo,
        noDrop: false,
        ephemeral: false,
        defaultCasingFrame: "",
        hideUnlessPresent: false,
        size:0.1
    },
    () => [
        {
            idString: "12g",
            name: "12 gauge",
            maxStackSize: 20,
            dropAmmout:10,
            characteristicColor: {
                hue: 0,
                saturation: 100,
                lightness: 89
            },
            defaultCasingFrame: "casing_12ga_275in",
            size:0.15
        },
        {
            idString: "556mm",
            name: "5.56mm",
            maxStackSize: 60,
            dropAmmout:47,
            characteristicColor: {
                hue: 120,
                saturation: 100,
                lightness: 75
            },
            defaultCasingFrame: "casing_556x45mm",
            size:0.03
        },
        {
            idString: "762mm",
            name: "7.62mm",
            maxStackSize: 60,
            dropAmmout:47,
            characteristicColor: {
                hue: 210,
                saturation: 100,
                lightness: 65
            },
            defaultCasingFrame: "casing_762x51mm",
            size:0.03
        },
        {
            idString: "9mm",
            name: "9mm",
            maxStackSize: 90,
            dropAmmout:47,
            characteristicColor: {
                hue: 48,
                saturation: 100,
                lightness: 75
            },
            defaultCasingFrame: "casing_9x19mm",
            size:0.0125
        },
        {
            idString: "22lr",
            name: ".22 LR",
            maxStackSize: 90,
            dropAmmout:47,
            characteristicColor: {
                hue: 229,
                saturation: 10,
                lightness: 59
            },
            defaultCasingFrame: "casing_22lr",
            size:0.008
        },
        {
            idString: "50cal",
            name: ".50 Cal",
            maxStackSize: 39,
            dropAmmout:5,
            characteristicColor: {
                hue: 0,
                saturation: 0,
                lightness: 0
            },
            defaultCasingFrame: "casing_50bmg",
            hideUnlessPresent: true,
            size:0.06
        },
        {
            idString: "338lap",
            name: ".338 Lapua Magnum",
            maxStackSize: 9,
            dropAmmout:6,
            characteristicColor: {
                hue: 75,
                saturation: 100,
                lightness: 75
            },
            defaultCasingFrame: "casing_338lap",
            hideUnlessPresent: true,
            size:0.27
        },
        {
            idString: "45acp",
            name: "45 ACP",
            characteristicColor: {
                hue: 282,
                saturation: 94,
                lightness: 21
            },
            defaultCasingFrame: "casing_45acp",
            hideUnlessPresent: true,
            maxStackSize: 60,
            dropAmmout:47,
            size:0.035
        },
        {
            idString: "medic_charge",
            name: "Medic Charge",
            maxStackSize: 40,
            dropAmmout:30,
            hideUnlessPresent:true,
            characteristicColor: {
                hue: 120,
                saturation: 87,
                lightness: 50
            },
            defaultCasingFrame: "casing_556x45mm",
            size:0.025
        },
        {
            idString: "curadell",
            name: "Curadell",
            maxStackSize: 10,
            dropAmmout:2,
            characteristicColor: {
                hue: 26,
                saturation: 100,
                lightness: 75
            },
            defaultCasingFrame: "casing_curadell",
            hideUnlessPresent: true,
            size:0.6
        },
        {
            idString: "firework_rocket",
            name: "Firework Rocket",
            maxStackSize: 5,
            dropAmmout:3,
            characteristicColor: {
                hue: 0,
                saturation: 55,
                lightness: 85
            },
            defaultCasingFrame: "casing_firework_rocket",
            hideUnlessPresent: true,
            size:.7
        },

        // Ephemeral ammo types below

        {
            idString: "power_cell",
            name: "P.O.W.E.R. cell",
            maxStackSize: 10,
            dropAmmout:6,
            characteristicColor: {
                hue: 190,
                saturation: 100,
                lightness: 85
            },
            defaultCasingFrame: "casing_power_cell",
            ephemeral: true,
        },
        {
            idString: "bb",
            name: "6mm BB",
            maxStackSize: 240,
            dropAmmout:5,
            characteristicColor: {
                hue: 0,
                saturation: 0,
                lightness: 75
            },
            ephemeral: true
        }
    ]
);
