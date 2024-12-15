import { ItemType, ObjectDefinitions, type ItemDefinition } from "../utils/objectDefinitions";

export type ArmorDefinition = ItemDefinition & {
    readonly itemType: ItemType.Armor
    readonly armorType: ArmorType
    readonly level: number
    readonly damageReduction: number
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
        noDrop: false
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
                    damageReduction: 0.1
                }
            ),
            helmet(
                ["Regular"],
                {
                    level: 2,
                    damageReduction: 0.15
                }
            ),
            helmet(
                ["Tactical"],
                {
                    level: 3,
                    damageReduction: 0.2
                }
            ),
            //Special
            helmet(
                ["Apple"],
                {
                    level: 4,
                    damageReduction: 0.25
                }
            ),
            helmet(
                ["Captain"],
                {
                    level: 4,
                    damageReduction: 0.25
                }
            ),
            helmet(
                ["Medic"],
                {
                    level: 4,
                    damageReduction: 0.25
                }
            ),
            helmet(
                ["Last Man"],
                {
                    level: 5,
                    damageReduction: 0.30
                }
            ),
            helmet(
                ["Sergeant"],
                {
                    level: 3,
                    damageReduction: 0.2
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
                    color: 0xc8c8c6
                }
            ),
            vest(
                ["Regular"],
                {
                    level: 2,
                    damageReduction: 0.15,
                    color: 0x404d2e
                }
            ),
            vest(
                ["Tactical"],
                {
                    level: 3,
                    damageReduction: 0.2,
                    color: 0x0d0d0d
                }
            ),
            vest(
                ["Ultra"],
                {
                    level: 4,
                    damageReduction: 0.25,
                    color: 0x2f0000
                }
            ),
            vest(
                ["Developr"],
                {
                    level: 99,
                    devItem: true,
                    damageReduction: 0.72,
                    color: 0x2f0000,
                    noDrop: true
                }
            )
        ];
    }
);
