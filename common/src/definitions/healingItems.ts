import { ItemType, ObjectDefinitions, type ItemDefinition } from "../utils/objectDefinitions";

export interface HealingItemDefinition extends ItemDefinition {
    readonly itemType: ItemType.Healing
    readonly healType: HealType
    readonly restoreAmount: number
    readonly useTime: number
    readonly size:number
}

export enum HealType {
    Health,
    Adrenaline
}

export const HealingItems = ObjectDefinitions.withDefault<HealingItemDefinition>()(
    "HealingItems",
    {
        itemType: ItemType.Healing,
        noDrop: false
    },
    ([derive, , createTemplate]) => {
        const consumable = derive((name: string) => ({
            idString: name.toLowerCase().replace(/ /g, "_"),
            name
        }));

        const healing = createTemplate(consumable, {
            healType: HealType.Health
        });

        const adren = createTemplate(consumable, {
            healType: HealType.Adrenaline
        });

        return [
            healing(
                ["Gauze"],
                {
                    restoreAmount: 15,
                    useTime: 3,
                    size:0.15
                }
            ),
            healing(
                ["Medikit"],
                {
                    restoreAmount: 100,
                    useTime: 6,
                    size:.8
                }
            ),
            adren(
                ["Cola"],
                {
                    restoreAmount: 25,
                    useTime: 3,
                    size:.5
                }
            ),
            adren(
                ["Tablets"],
                {
                    restoreAmount: 50,
                    useTime: 5,
                    size:.1
                }
            )
        ];
    }
);
