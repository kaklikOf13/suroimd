import { ItemRarity, ItemType, ObjectDefinitions, type ItemDefinition } from "../utils/objectDefinitions";
import { BoostsType } from "./loadout/boosts";
import { PerkIds } from "./perks";

export type ArmorDefinition = ItemDefinition & {
    readonly itemType: ItemType.Armor
    readonly armorType: ArmorType
    readonly level: number
    readonly givePerks:PerkIds[]
    readonly damageReduction: number
    readonly giveBoost?:{boost_type:BoostsType,time:number}
} & ({
    readonly armorType: ArmorType.Vest
    readonly color: number
} | {
    readonly armorType: ArmorType.Helmet
    readonly color?: undefined
});

export enum ArmorType {
    Helmet,
    Vest
}

export const Armors = ObjectDefinitions.withDefault<ArmorDefinition>()(
    "Armors",
    {
        itemType: ItemType.Armor,
        noDrop: false,
        givePerks:[],
    },
    ([derive]) => {
        const vest = derive((name: string) => ({
            idString: `${name.toLowerCase()}_vest`,
            name: `${name} Vest`,
            armorType: ArmorType.Vest,
            color: 0x000000
        }));

        const helmet = derive((name: string) => ({
            idString: `${name.toLowerCase()}_helmet`.replaceAll(" ","_"),
            name: `${name} Helmet`,
            armorType: ArmorType.Helmet
        }));

        return [
            //
            // Helmets
            //
            helmet(
                ["Basic"],
                {
                    level: 1,
                    damageReduction: 0.1,
                    rarity:ItemRarity.Common
                }
            ),
            helmet(
                ["Regular"],
                {
                    level: 2,
                    damageReduction: 0.15,
                    rarity:ItemRarity.Uncommon
                }
            ),
            helmet(
                ["Tactical"],
                {
                    level: 3,
                    damageReduction: 0.2,
                    rarity:ItemRarity.Rare
                }
            ),
            //Special
            helmet(
                ["Apple"],
                {
                    level: 3,
                    givePerks:[PerkIds.GoldenApple],
                    damageReduction: 0.2,
                    rarity:ItemRarity.Epic
                }
            ),
            helmet(
                ["Pigmin"],
                {
                    level: 3,
                    givePerks:[PerkIds.LowProfile],
                    damageReduction: 0.2,
                    rarity:ItemRarity.Legendary
                }
            ),
            helmet(
                ["Sniper"],
                {
                    level: 3,
                    givePerks:[PerkIds.Takedown,PerkIds.Toploaded],
                    damageReduction: 0.2,
                    rarity:ItemRarity.Legendary
                }
            ),
            helmet(
                ["Captain"],
                {
                    level: 4,
                    givePerks:[PerkIds.Captain],
                    damageReduction: 0.25,
                    rarity:ItemRarity.Legendary
                }
            ),
            helmet(
                ["Medic"],
                {
                    level: 4,
                    givePerks:[PerkIds.WarMedic],
                    damageReduction: 0.25,
                    rarity:ItemRarity.Legendary,
                    giveBoost:{
                        boost_type:BoostsType.Nature,
                        time:15*1000,
                    }
                }
            ),
            helmet(
                ["Last Man"],
                {
                    level: 5,
                    damageReduction: 0.30,
                    rarity:ItemRarity.Legendary,
                    givePerks:[PerkIds.Last_Knight],
                    giveBoost:{
                        boost_type:BoostsType.Takedown,
                        time:15*1000,
                    }
                }
            ),
            helmet(
                ["Sergeant"],
                {
                    level: 3,
                    givePerks:[PerkIds.ExtendedMags],
                    damageReduction: 0.2,
                    rarity:ItemRarity.Epic
                }
            ),
            //Special
            helmet(
                ["Apple Master"],
                {
                    level: 3,
                    givePerks:[PerkIds.AppleArt,PerkIds.GoldenApple],
                    damageReduction: 0.2,
                    rarity:ItemRarity.Epic
                }
            ),
            //Special
            helmet(
                ["Demo Man"],
                {
                    level: 3,
                    givePerks:[PerkIds.DemoExpert],
                    damageReduction: 0.2,
                    rarity:ItemRarity.Epic
                }
            ),

            //
            // Vests
            //
            vest(
                ["Basic"],
                {
                    level: 1,
                    damageReduction: 0.1,
                    color: 0xc8c8c6,
                    rarity:ItemRarity.Common
                }
            ),
            vest(
                ["Regular"],
                {
                    level: 2,
                    damageReduction: 0.15,
                    color: 0x404d2e,
                    rarity:ItemRarity.Uncommon
                }
            ),
            vest(
                ["Tactical"],
                {
                    level: 3,
                    damageReduction: 0.2,
                    color: 0x0d0d0d,
                    rarity:ItemRarity.Rare
                }
            ),
            vest(
                ["Ultra"],
                {
                    level: 4,
                    damageReduction: 0.25,
                    color: 0x2f0000,
                    rarity:ItemRarity.Epic
                }
            ),
            vest(
                ["Developr"],
                {
                    level: 99,
                    devItem: true,
                    damageReduction: 0.72,
                    color: 0x2f0000,
                    noDrop: true,
                    rarity:ItemRarity.Legendary
                }
            )
        ];
    }
);
