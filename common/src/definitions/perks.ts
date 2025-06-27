import { read } from "fs";
import { type DeepPartial } from "../utils/misc";
import { ItemType, ObjectDefinitions, type GetMissing, type ItemDefinition, type RawDefinition, type ReferenceTo } from "../utils/objectDefinitions";
import { BoostsType } from "./loadout/boosts";

export const enum PerkQualities {
    Positive = "positive",
    Neutral = "neutral",
    Negative = "negative"
}

export interface BasicPerk extends ItemDefinition {
    readonly itemType: ItemType.Perk
    readonly description: string
    readonly giveByDefault: boolean
    readonly category: PerkCategories
    readonly updateInterval?: number
    readonly type?: PerkQualities
    readonly noSwap?: boolean
    readonly alwaysAllowSwap?: boolean
    readonly plumpkinGambleIgnore?: boolean

    readonly boost_won?:{
        readonly type:BoostsType
        readonly time:number
    }

    readonly healing?:number

    readonly sizeMod?:number
    readonly adrenSet?:number
    readonly adrenDecay?:number

    readonly extends?:PerkIds[]

    readonly to_infinity?:Record<string,boolean>
}

const defaultTemplate = {
    itemType: ItemType.Perk as const,
    noDrop: false,
    giveByDefault: false
} satisfies DeepPartial<BasicPerk>;

/**
 * As the name implies, loosens numeric literal type to be `number`
 */
type LoosenNumerics<T> = T extends object
    ? {
        [K in keyof T]: LoosenNumerics<T[K]>
    }
    : (
        T extends number
            ? number extends T
                ? T
                : number
            : T
    );

export const enum PerkIds {
    //
    // Normal Perks
    //
    SecondWind = "second_wind",
    Flechettes = "flechettes",
    SabotRounds = "sabot_rounds",
    ExtendedMags = "extended_mags",
    DemoExpert = "demo_expert",
    AdvancedAthletics = "advanced_athletics",
    Toploaded = "toploaded",
    InfiniteAmmo = "infinite_ammo",
    FieldMedic = "field_medic",
    Berserker = "stark_melee_gauntlet",
    CloseQuartersCombat = "close_quarters_combat",
    LowProfile = "low_profile",

    Takedown = "takedown",    
    NatureBreath="nature_breath",

    Last_Knight = "last_knight",


    //Modes
    Captain="captain_perk",
    WarMedic="war_medic_perk",
    SelfRevive="self_revive",
    HealingAura="healing_aura",

    HealingCharges="healing_charges",

    GoldenApple="golden_apple"
}

export const enum PerkCategories {
    Normal,
}

const perks = [
    //
    // Normal Perks
    //
    {
        idString: PerkIds.SecondWind,
        name: "Second Wind",
        description: "Move faster below half health.",
        category: PerkCategories.Normal,

        cutoff: 0.5,
        speedMod: 1.4
    },
    {
        idString: PerkIds.Flechettes,
        name: "Fléchettes",
        description: "All bullets splinter into 3 weaker versions.",
        category: PerkCategories.Normal,

        split: 3,
        deviation: 0.8,
        damageMod: 0.75
    },
    {
        idString: PerkIds.SabotRounds,
        name: "Sabot Rounds",
        description: "Large increase to range, velocity, and accuracy, but at the cost of lower damage.",
        category: PerkCategories.Normal,

        rangeMod: 1.5,
        speedMod: 1.5,
        spreadMod: 0.6,
        damageMod: 0.9,
        tracerLengthMod: 1.2
    },
    {
        idString: PerkIds.ExtendedMags,
        name: "Extended Mags",
        description: "Most weapons have increased bullet capacity.",
        category: PerkCategories.Normal

        // define for each weapon individually
    },
    {
        idString: PerkIds.DemoExpert,
        name: "Demo Expert",
        description: "Grenades have a greater throwing range and visible detonation point.",
        category: PerkCategories.Normal,

        updateInterval: 10e3, // milliseconds
        rangeMod: 2,
        restoreAmount: 0.25 // times max capacity
    },
    {
        idString: PerkIds.AdvancedAthletics,
        name: "Advanced Athletics",
        description: "Move faster in water and smoke, walk through trees, and vault through windows.",
        category: PerkCategories.Normal,

        // all multiplicative
        waterSpeedMod: (1 / 0.7) * 1.3,
        smokeSpeedMod: 1.3
    },
    {
        idString: PerkIds.Toploaded,
        name: "Toploaded",
        description: "Do more damage with the 1/3 of your magazine.",
        category: PerkCategories.Normal,

        thresholds: [
            [0.1, 1.8],
            [0.333, 1.3],
        ] as ReadonlyArray<readonly [number, number]>
    },
    {
        idString: PerkIds.InfiniteAmmo,
        name: "Infinite Ammo",
        description: "All weapons have unlimited ammo. Electronic devices may break if overused.",
        category: PerkCategories.Normal,

        airdropCallerLimit: 3
    },
    {
        idString: PerkIds.FieldMedic,
        name: "Field Medic",
        description: "All consumable items can be used faster. Teammates can be revived more quickly.",
        category: PerkCategories.Normal,

        usageMod: 1.5 // divide
    },
    {
        idString: PerkIds.Berserker,
        name: "Berserker",
        description: "Melee weapons make you move faster when equipped, and deal more damage.",
        category: PerkCategories.Normal,

        speedMod: 1.2, // multiplicative
        damageMod: 1.2 // multiplicative
    },
    {
        idString: PerkIds.CloseQuartersCombat,
        name: "Close Quarters Combat",
        description: "Weapons do more damage and reload faster at close range.",
        category: PerkCategories.Normal,

        cutoff: 50,
        reloadMod: 1.3, // divide
        damageMod: 1.2 // multiplicative
    },
    {
        idString: PerkIds.LowProfile,
        name: "Low Profile",
        description: "Become smaller and take less damage from explosions.",
        category: PerkCategories.Normal,

        sizeMod: 0.8, // multiplicative
        explosionMod: 0.5 // multiplicative
    },
    {
        idString: PerkIds.Takedown,
        name: "Takedown",
        description: "Heal After You Kill",
        category: PerkCategories.Normal,
        type: PerkQualities.Positive,
        healing:25,
        boost_won:{
            type:BoostsType.Takedown,
            time:10000
        },
    },
    {
        idString: PerkIds.NatureBreath,
        name: "Nature Breath",
        description: "Add A Boost When You Got Hitted",
        category: PerkCategories.Normal,
        type: PerkQualities.Positive,
        boost_won:{
            time:3000,
            type:BoostsType.Nature
        }
    },
    {
        idString: PerkIds.Last_Knight,
        name: "Last Knight",
        description: "Fléchettes. Takedown. Infinity Ammo",
        category: PerkCategories.Normal,
        type: PerkQualities.Positive,
        extends:[PerkIds.Takedown,PerkIds.Flechettes,PerkIds.InfiniteAmmo],
        sizeMod:1.4
    },
    {
        idString: PerkIds.HealingCharges,
        name: "Healing Charges",
        description: "Infinity Medic Charges",
        category: PerkCategories.Normal,
        type: PerkQualities.Positive,
        to_infinity:{
            "medic_charge":true
        }
    },
    {
        idString: PerkIds.WarMedic,
        name: "War Medic",
        description: "Healing Aura. Self Revive. Nature Breath. Healing Charges",
        category: PerkCategories.Normal,
        type: PerkQualities.Positive,
        extends:[PerkIds.HealingAura,PerkIds.SelfRevive,PerkIds.NatureBreath,PerkIds.HealingCharges],
    },
    //Modes
    {
        idString: PerkIds.Captain,
        name: "Captain",
        description: "Permanent adrenaline. Biggest Size. Infinity Ammo",
        category: PerkCategories.Normal,
        type: PerkQualities.Positive,
        extends:[PerkIds.InfiniteAmmo],
        adrenSet: 1,
        adrenDecay: 0,
    },
    {
        idString: PerkIds.SelfRevive,
        name: "Self Revive",
        description: "Can revive self when knocked out.",
        category: PerkCategories.Normal,
        type: PerkQualities.Positive,
    },
    {
        idString: PerkIds.HealingAura,
        name: "Healing Aura",
        description: "Can Heal Allies While Your Heal.",
        category: PerkCategories.Normal,
        type: PerkQualities.Positive,

        radius:15.5,
    },
    {
        idString: PerkIds.GoldenApple,
        name: "Golden Apple",
        description: "Infinite Ammo. You Always Have Luck With Weapon Swap.",
        category: PerkCategories.Normal,
        type: PerkQualities.Positive,
        extends:[PerkIds.InfiniteAmmo]
    },
] as const satisfies ReadonlyArray<
    GetMissing<
        BasicPerk,
        typeof defaultTemplate
    > & Record<string, unknown>
>;

export type PerkDefinition = LoosenNumerics<(typeof perks)[number]> & BasicPerk;

export type PerkNames = ReferenceTo<PerkDefinition>;

class PerkDefinitions extends ObjectDefinitions<PerkDefinition> {
    readonly defaults: readonly PerkDefinition[];

    readonly idStringToNumber: Readonly<Record<PerkNames, number>>;

    constructor(definitions: ReadonlyArray<GetMissing<BasicPerk, typeof defaultTemplate>>) {
        super(
            "Perks",
            definitions as ReadonlyArray<RawDefinition<PerkDefinition>>,
            defaultTemplate as DeepPartial<PerkDefinition>
        );

        this.idStringToNumber = {} as Record<PerkNames, number>;
        for (let i = 0, defLength = this.definitions.length; i < defLength; i++) {
            const idString = this.definitions[i].idString;

            // @ts-expect-error init code
            this.idStringToNumber[idString] = i;
        }

        this.defaults = this.definitions.filter(({ giveByDefault }) => giveByDefault);
    }
};

export const Perks = new PerkDefinitions(perks);

export const PerkData = Object.freeze(
    perks.reduce(
        (acc, cur) => {
            // @ts-expect-error ts2590 gaming
            acc[cur.idString] = cur;
            return acc;
        },
        {} as {
            [K in PerkNames]: PerkDefinition & { readonly idString: K }
        }
    )
);
