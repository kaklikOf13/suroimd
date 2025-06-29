import { defaultBulletTemplate, FireMode } from "../constants";
import { mergeDeep, type DeepPartial } from "../utils/misc";
import { inheritFrom, ItemRarity, ItemType, ObjectDefinitions, type BaseBulletDefinition, type InventoryItemDefinition, type RawDefinition, type ReferenceTo } from "../utils/objectDefinitions";
import { Vec, type Vector } from "../utils/vector";
import { type AmmoDefinition } from "./ammos";
export type Airstrike={
    readonly bomb:string
    readonly ping?:string
    readonly planesCount:number
    readonly bombsCount:number
    readonly radius:number
}
export const Airstrikes:Record<string,Airstrike>={
    tactical_nuke:{
        bomb:"tactical_nuke",
        planesCount:1,
        bombsCount:1,
        radius:1,
        ping:"nuke_ping"
    },
    bombs:{
        bomb:"airstrike_bomb",
        bombsCount:7,
        ping:"airstrike_ping",
        planesCount:10,
        radius:35
    }
}
type BaseGunDefinition = InventoryItemDefinition & {
    readonly itemType: ItemType.Gun

    readonly ammoType: ReferenceTo<AmmoDefinition>
    readonly ammoSpawnAmount: number
    readonly capacity: number
    readonly extendedCapacity?: number
    readonly reloadTime: number
    readonly shotsPerReload?: number
    readonly infiniteAmmo: boolean

    readonly fireDelay: number
    readonly switchDelay: number

    readonly recoilMultiplier: number
    readonly recoilDuration: number
    readonly shotSpread: number
    readonly moveSpread: number
    readonly bulletOffset?: number
    readonly fsaReset?: number // first-shot-accuracy reset (ms)
    readonly jitterRadius: number // Jitters the bullet position, mainly for shotguns
    readonly consistentPatterning: boolean

    readonly noQuickswitch: boolean
    readonly bulletCount: number
    readonly length: number
    readonly shootOnRelease: boolean
    readonly summonAirdrop: boolean

    readonly airstrike?:Airstrike
    readonly no_infinity_ammo:boolean

    readonly fists: {
        // no relation to the ZIndexes enum
        readonly leftZIndex: number
        // no relation to the ZIndexes enum
        readonly rightZIndex: number
        readonly animationDuration: number
    }

    readonly casingParticles: Array<{
        readonly frame?: string
        readonly count?: number
        readonly ejectionDelay?: number
        readonly velocity?: {
            readonly x?: {
                readonly min: number
                readonly max: number
                readonly randomSign?: boolean
            }
            readonly y?: {
                readonly min: number
                readonly max: number
                readonly randomSign?: boolean
            }
        }

        readonly on?: "fire" | "reload"
    }>

    readonly gasParticles?: {
        readonly amount: number
        readonly minSize: number
        readonly maxSize: number
        readonly minLife: number
        readonly maxLife: number
        readonly spread: number
        readonly minSpeed: number
        readonly maxSpeed: number
    }

    readonly image: {
        readonly angle: number
        readonly center?:Vector
        // no relation to the ZIndexes enum
        readonly zIndex: number
    }

    readonly noMuzzleFlash: boolean
    readonly ballistics: BaseBulletDefinition
} & ReloadOnEmptyMixin & BurstFireMixin & DualDefMixin;

type BurstFireMixin = ({
    readonly fireMode: FireMode.Auto | FireMode.Single
} | {
    readonly fireMode: FireMode.Burst
    readonly burstProperties: {
        readonly shotsPerBurst: number
        readonly burstCooldown: number
    }
});

type ReloadOnEmptyMixin = ({
    readonly reloadFullOnEmpty?: false
} | {
    readonly reloadFullOnEmpty: true
    readonly fullReloadTime: number
});

type DualDefMixin = ({
    readonly isDual?: false
    readonly fists?: InventoryItemDefinition["fists"]
    readonly image: {
        readonly position: Vector
    }

    readonly casingParticles: Array<{ readonly position: Vector }>
} | {
    readonly isDual: true
    readonly singleVariant: ReferenceTo<GunDefinition>
    /**
     * This offset is used for pretty much everything that's unique to dual weapons: it's an offset for projectile
     * spawns, casing spawns and world images
     */
    readonly leftRightOffset: number
});

export type GunDefinition = BaseGunDefinition & {
    readonly dualVariant?: ReferenceTo<GunDefinition>
};

export type SingleGunNarrowing = GunDefinition & { readonly isDual: false };
export type DualGunNarrowing = GunDefinition & { readonly isDual: true };

const gasParticlePresets: Record<"automatic" | "shotgun" | "pistol" | "rifle", BaseGunDefinition["gasParticles"]> = {
    automatic: {
        amount: 2,
        spread: 30,
        minSize: 0.2,
        maxSize: 0.3,
        minLife: 1000,
        maxLife: 2000,
        minSpeed: 5,
        maxSpeed: 15
    },
    shotgun: {
        amount: 12,
        spread: 60,
        minSize: 0.3,
        maxSize: 0.5,
        minLife: 2000,
        maxLife: 5000,
        minSpeed: 5,
        maxSpeed: 10
    },
    pistol: {
        amount: 2,
        spread: 60,
        minSize: 0.2,
        maxSize: 0.3,
        minLife: 1000,
        maxLife: 2000,
        minSpeed: 5,
        maxSpeed: 15
    },
    rifle: {
        amount: 3,
        spread: 30,
        minSize: 0.3,
        maxSize: 0.5,
        minLife: 1000,
        maxLife: 3000,
        minSpeed: 7,
        maxSpeed: 14
    }
};

type RawGunDefinition = BaseGunDefinition & {
    readonly isDual?: never
    readonly dual?: {
        readonly leftRightOffset: number
    } & {
        [
        K in Extract<
            keyof DualGunNarrowing,
            "wearerAttributes" |
            "ammoSpawnAmount" |
            "capacity" |
            "extendedCapacity" |
            "reloadTime" |
            "fireDelay" |
            "switchDelay" |
            "speedMultiplier" |
            "recoilMultiplier" |
            "recoilDuration" |
            "shotSpread" |
            "moveSpread" |
            "fsaReset" |
            "burstProperties" |
            "leftRightOffset"
        >
        ]?: DualGunNarrowing[K]
    }
};

const defaultGun = {
    itemType: ItemType.Gun,
    noDrop: false,
    ammoSpawnAmount: 0,
    speedMultiplier: 0.92,
    infiniteAmmo: false,
    jitterRadius: 0,
    consistentPatterning: false,
    noQuickswitch: false,
    bulletCount: 1,
    killstreak: false,
    shootOnRelease: false,
    summonAirdrop: false,
    fists: {
        leftZIndex: 1,
        rightZIndex: 1
    },
    casingParticles: [] as RawGunDefinition["casingParticles"],
    image: {
        angle: 0,
        zIndex: 2
    },
    isDual: false,
    noMuzzleFlash: false,
    ballistics: defaultBulletTemplate
} satisfies DeepPartial<GunDefinition> as DeepPartial<GunDefinition>;

export const Guns = ObjectDefinitions.withDefault<GunDefinition>()(
    "Guns",
    defaultGun,
    () => {
        return ([
            {
                idString: "g19",
                name: "G19",
                ammoType: "9mm",
                ammoSpawnAmount: 60,
                fireDelay: 110,
                switchDelay: 250,
                recoilMultiplier: 0.8,
                recoilDuration: 90,
                fireMode: FireMode.Single,
                shotSpread: 3,
                moveSpread: 5,
                length: 4.7,
                fists: {
                    left: Vec.create(40, 0),
                    right: Vec.create(40, 0),
                    leftZIndex: 4,
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(65, 0) },
                casingParticles: [{
                    position: Vec.create(3.5, 0.5),
                    velocity: {
                        y: {
                            min: 2,
                            max: 18
                        }
                    }
                }],
                gasParticles: gasParticlePresets.pistol,
                capacity: 15,
                extendedCapacity: 24,
                reloadTime: 1.5,
                ballistics: {
                    damage: 14,
                    obstacleMultiplier: 1,
                    speed: 0.16,
                    range: 120,
                    headshot:{
                        chance:0.15,
                        modify:1.4,
                    }
                },
                dual: {
                    leftRightOffset: 1.3,
                    fireDelay: 75,
                    shotSpread: 5,
                    moveSpread: 8,
                    capacity: 30,
                    extendedCapacity: 48,
                    reloadTime: 2.9
                },
                rarity:ItemRarity.Common
            },
            {
                idString: "cz75a",
                name: "CZ-75A",
                ammoType: "9mm",
                ammoSpawnAmount: 64,
                fireDelay: 60,
                switchDelay: 250,
                recoilMultiplier: 0.8,
                recoilDuration: 90,
                fireMode: FireMode.Auto,
                shotSpread: 8,
                moveSpread: 13,
                length: 5.12,
                fists: {
                    left: Vec.create(40, 0),
                    right: Vec.create(40, 0),
                    leftZIndex: 4,
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(70, -1) },
                casingParticles: [{
                    position: Vec.create(3.5, 0.45),
                    velocity: {
                        y: {
                            min: 2,
                            max: 18
                        }
                    }
                }],
                gasParticles: gasParticlePresets.pistol,
                capacity: 16,
                extendedCapacity: 26,
                reloadTime: 1.9,
                ballistics: {
                    damage: 9,
                    obstacleMultiplier: 1,
                    speed: 0.16,
                    range: 70,
                    headshot:{
                        chance:0.1,
                        modify:1.35,
                    }
                },
                dual: {
                    leftRightOffset: 1.3,
                    fireDelay: 30,
                    shotSpread: 14,
                    moveSpread: 25,
                    capacity: 32,
                    extendedCapacity: 52,
                    reloadTime: 3.7
                },
                rarity:ItemRarity.Common
            },
            {
                idString: "m1895",
                name: "M1895",
                ammoType: "762mm",
                ammoSpawnAmount: 28,
                fireDelay: 375,
                switchDelay: 250,
                recoilMultiplier: 0.75,
                recoilDuration: 135,
                fireMode: FireMode.Single,
                shotSpread: 2,
                moveSpread: 4,
                length: 5.1,
                fists: {
                    left: Vec.create(40, 0),
                    right: Vec.create(40, 0),
                    leftZIndex: 4,
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(70, 0) },
                casingParticles: [{
                    frame: "casing_762x38mmR",
                    position: Vec.create(3.5, 0.5),
                    count: 7,
                    velocity: {
                        x: {
                            min: -8,
                            max: -2
                        },
                        y: {
                            min: 2,
                            max: 9,
                            randomSign: true
                        }
                    },
                    on: "reload"
                }],
                gasParticles: gasParticlePresets.pistol,
                capacity: 7,
                reloadTime: 2.1,
                ballistics: {
                    damage: 25,
                    obstacleMultiplier: 1.5,
                    speed: 0.26,
                    range: 160,
                },
                dual: {
                    leftRightOffset: 1.3,
                    fireDelay: 187.5,
                    shotSpread: 3,
                    moveSpread: 5,
                    capacity: 14,
                    reloadTime: 4
                },
                rarity:ItemRarity.Common
            },
            {
                idString: "deagle",
                name: "DEagle",
                ammoType: "50cal",
                ammoSpawnAmount: 42,
                fireDelay: 200,
                switchDelay: 250,
                recoilMultiplier: 0.65,
                recoilDuration: 150,
                fireMode: FireMode.Single,
                shotSpread: 3,
                moveSpread: 6,
                length: 4.9,
                fists: {
                    left: Vec.create(40, 0),
                    right: Vec.create(40, 0),
                    leftZIndex: 4,
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(65, 0) },
                casingParticles: [{
                    frame: "casing_50ae",
                    position: Vec.create(3.5, 0.3),
                    velocity: {
                        y: {
                            min: 2,
                            max: 18
                        }
                    }
                }],
                gasParticles: gasParticlePresets.pistol,
                capacity: 7,
                extendedCapacity: 9,
                reloadTime: 2.3,
                ballistics: {
                    damage: 37,
                    obstacleMultiplier: 1.25,
                    speed: 0.22,
                    range: 130,
                    tracer: {
                        color: 0xE2C910,
                        saturatedColor: 0xFFBF00
                    },
                    headshot:{
                        chance:0.09,
                    }
                },
                dual: {
                    ammoSpawnAmount: 84,
                    leftRightOffset: 1.4,
                    fireDelay: 115,
                    shotSpread: 5,
                    moveSpread: 8.5,
                    capacity: 14,
                    extendedCapacity: 18,
                    reloadTime: 3.8
                },
                rarity:ItemRarity.Epic
            },
            {
                idString: "rsh12",
                name: "RSh-12",
                ammoType: "50cal",
                ammoSpawnAmount: 30,
                fireDelay: 400,
                switchDelay: 250,
                recoilMultiplier: 0.8,
                recoilDuration: 600,
                fsaReset: 600,
                fireMode: FireMode.Single,
                shotSpread: 4,
                moveSpread: 7,
                length: 6.2,
                noMuzzleFlash: true,
                fists: {
                    left: Vec.create(40, 0),
                    right: Vec.create(40, 0),
                    leftZIndex: 4,
                    rightZIndex: 4,
                    animationDuration: 100
                },
                casingParticles: [{
                    position: Vec.create(3.5, 0.3),
                    frame: "casing_127x55mm",
                    on: "reload",
                    count: 5,
                    velocity: {
                        x: {
                            min: -8,
                            max: -2
                        },
                        y: {
                            min: 2,
                            max: 9,
                            randomSign: true
                        }
                    }
                }],
                image: { position: Vec.create(80, 0) },
                gasParticles: gasParticlePresets.pistol,
                capacity: 5,
                reloadTime: 2.4,
                ballistics: {
                    damage: 60,
                    obstacleMultiplier: 1,
                    speed: 0.3,
                    range: 120,
                    tracer: {
                        opacity: 0.8,
                        width: 1.1
                    },
                },
                dual: {
                    leftRightOffset: 1.3,
                    ammoSpawnAmount: 60,
                    fireDelay: 200,
                    shotSpread: 7,
                    moveSpread: 10,
                    capacity: 10,
                    reloadTime: 4.2
                },
                rarity:ItemRarity.Epic
            },
            // sub-machine guns
            {
                idString: "saf200",
                name: "SAF-200",
                ammoType: "9mm",
                ammoSpawnAmount: 90,
                capacity: 30,
                extendedCapacity: 42,
                reloadTime: 1.8,
                fireDelay: 75,
                burstProperties: {
                    shotsPerBurst: 3,
                    burstCooldown: 325
                },
                switchDelay: 300,
                recoilMultiplier: 0.75,
                recoilDuration: 300,
                fireMode: FireMode.Burst,
                shotSpread: 3,
                moveSpread: 3,
                length: 5.95,
                fists: {
                    left: Vec.create(95, -3),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(71, 0) },
                casingParticles: [{
                    position: Vec.create(4, 0.35)
                }],
                gasParticles: gasParticlePresets.automatic,
                ballistics: {
                    damage: 15.5,
                    obstacleMultiplier: 1,
                    speed: 0.25,
                    range: 130,
                },
                rarity:ItemRarity.Uncommon
            },
            {
                idString: "micro_uzi",
                name: "Micro Uzi",
                ammoType: "9mm",
                ammoSpawnAmount: 96,
                capacity: 32,
                extendedCapacity: 50,
                reloadTime: 1.75,
                fireDelay: 40,
                switchDelay: 300,
                recoilMultiplier: 0.75,
                recoilDuration: 60,
                fireMode: FireMode.Auto,
                shotSpread: 15,
                moveSpread: 16,
                length: 5.8,
                fists: {
                    left: Vec.create(85, -6),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                casingParticles: [{
                    position: Vec.create(3.5, 0.4)
                }],
                gasParticles: gasParticlePresets.automatic,
                image: { position: Vec.create(80, 0) },
                ballistics: {
                    damage: 7.75,
                    obstacleMultiplier: 1,
                    speed: 0.16,
                    range: 85,
                    headshot:{
                        chance:0.2
                    }
                },
                rarity:ItemRarity.Uncommon
            },
            {
                idString: "mp40",
                name: "MP40",
                ammoType: "9mm",
                ammoSpawnAmount: 96,
                capacity: 32,
                extendedCapacity: 40,
                reloadTime: 2.1,
                fireDelay: 90,
                switchDelay: 300,
                recoilMultiplier: 0.75,
                recoilDuration: 150,
                fireMode: FireMode.Auto,
                shotSpread: 2,
                moveSpread: 3,
                length: 6.6,
                fists: {
                    left: Vec.create(103, -2),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(76, -3) },
                casingParticles: [{
                    position: Vec.create(4, 0.4)
                }],
                gasParticles: gasParticlePresets.automatic,
                ballistics: {
                    damage: 11,
                    obstacleMultiplier: 1,
                    speed: 0.25,
                    range: 130
                },
                rarity:ItemRarity.Uncommon
            },
            {
                idString: "vector",
                name: "Vector",
                ammoType: "9mm",
                ammoSpawnAmount: 99,
                capacity: 33,
                extendedCapacity: 50,
                reloadTime: 1.7,
                fireDelay: 40,
                switchDelay: 300,
                recoilMultiplier: 0.75,
                recoilDuration: 60,
                fireMode: FireMode.Auto,
                shotSpread: 2,
                moveSpread: 6,
                length: 7.2,
                fists: {
                    left: Vec.create(85, -6),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                casingParticles: [{
                    position: Vec.create(4.7, 0.3)
                }],
                gasParticles: gasParticlePresets.automatic,
                image: { position: Vec.create(80, 0) },
                ballistics: {
                    damage: 9,
                    obstacleMultiplier: 1,
                    speed: 0.185,
                    range: 80
                },
                rarity:ItemRarity.Epic
            },
            {
                idString: "pp19",
                name: "PP-19 Vityaz",
                ammoType: "9mm",
                ammoSpawnAmount: 90,
                capacity: 30,
                extendedCapacity: 45,
                reloadTime: 2.3,
                fireDelay: 50,
                switchDelay: 300,
                recoilMultiplier: 0.75,
                recoilDuration: 150,
                fireMode: FireMode.Auto,
                shotSpread: 3,
                moveSpread: 5.75,
                length: 7,
                noMuzzleFlash: true,
                fists: {
                    left: Vec.create(88, -5),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                casingParticles: [{
                    position: Vec.create(3.5, 0.35)
                }],
                image: { position: Vec.create(80, 0) },
                ballistics: {
                    damage: 10.5,
                    obstacleMultiplier: 1,
                    speed: 0.25,
                    range: 120,
                    tracer: {
                        opacity: 0.5
                    }
                },
                rarity:ItemRarity.Legendary
            },
            // assult rifles
            {
                idString: "ak47",
                name: "AK-47",
                ammoType: "762mm",
                ammoSpawnAmount: 90,
                capacity: 30,
                extendedCapacity: 40,
                reloadTime: 2.5,
                fireDelay: 100,
                switchDelay: 400,
                recoilMultiplier: 0.75,
                recoilDuration: 150,
                fireMode: FireMode.Auto,
                shotSpread: 2,
                moveSpread: 5,
                length: 7.55,
                fists: {
                    left: Vec.create(120, -2),
                    right: Vec.create(45, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(90, 2) },
                casingParticles: [{
                    frame: "casing_762x39mm",
                    position: Vec.create(4, 0.4)
                }],
                gasParticles: gasParticlePresets.automatic,
                ballistics: {
                    damage: 14,
                    obstacleMultiplier: 1.5,
                    speed: 0.26,
                    range: 160,
                },
                rarity:ItemRarity.Uncommon
            },
            {
                idString: "mcx_spear",
                name: "MCX Spear",
                ammoType: "762mm",
                ammoSpawnAmount: 80,
                capacity: 20,
                extendedCapacity: 30,
                reloadTime: 2.75,
                fireDelay: 87.5,
                switchDelay: 400,
                recoilMultiplier: 0.75,
                recoilDuration: 130,
                fireMode: FireMode.Auto,
                shotSpread: 2,
                moveSpread: 3,
                length: 7.7,
                fists: {
                    left: Vec.create(105, -6),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(80, 0) },
                casingParticles: [{
                    position: Vec.create(5, 0.4)
                }],
                gasParticles: gasParticlePresets.automatic,
                ballistics: {
                    damage: 16,
                    obstacleMultiplier: 1.5,
                    speed: 0.3,
                    range: 180,
                    tracer: {
                        length: 1.6
                    },
                },
                rarity:ItemRarity.Epic
            },
            {
                idString: "m16a4",
                name: "M16A4",
                ammoType: "556mm",
                ammoSpawnAmount: 80,
                capacity: 20,
                extendedCapacity: 30,
                reloadTime: 2.2,
                fireDelay: 75,
                burstProperties: {
                    shotsPerBurst: 3,
                    burstCooldown: 325
                },
                switchDelay: 400,
                recoilMultiplier: 0.75,
                recoilDuration: 350,
                fireMode: FireMode.Burst,
                shotSpread: 2,
                moveSpread: 3,
                length: 8.68,
                fists: {
                    left: Vec.create(120, -3),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(100, 0) },
                casingParticles: [{
                    position: Vec.create(4, 0.4)
                }],
                gasParticles: gasParticlePresets.automatic,
                ballistics: {
                    damage: 19,
                    obstacleMultiplier: 1.5,
                    speed: 0.3,
                    range: 180
                },
                rarity:ItemRarity.Rare
            },
            {
                idString: "aug",
                name: "AUG",
                ammoType: "556mm",
                ammoSpawnAmount: 90,
                fireDelay: 70,
                switchDelay: 400,
                recoilMultiplier: 0.75,
                recoilDuration: 120,
                fireMode: FireMode.Auto,
                shotSpread: 4,
                moveSpread: 10,
                length: 6.73,
                fists: {
                    left: Vec.create(105, -2),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(75, -4) },
                casingParticles: [{
                    position: Vec.create(2.5, 0.4)
                }],
                gasParticles: gasParticlePresets.automatic,
                capacity: 30,
                extendedCapacity: 42,
                reloadTime: 2.25,
                ballistics: {
                    damage: 10.5,
                    obstacleMultiplier: 1.5,
                    speed: 0.28,
                    range: 160
                },
                rarity:ItemRarity.Uncommon
            },
            {
                idString: "arx160",
                name: "ARX-160",
                ammoType: "762mm",
                ammoSpawnAmount: 90,
                capacity: 30,
                extendedCapacity: 40,
                reloadTime: 2.75,
                fireDelay: 75,
                switchDelay: 400,
                recoilMultiplier: 0.75,
                recoilDuration: 145,
                fireMode: FireMode.Auto,
                shotSpread: 5,
                moveSpread: 9,
                length: 6.6,
                fists: {
                    left: Vec.create(98, -2),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(70, 0) },
                casingParticles: [{
                    frame: "casing_762x39mm",
                    position: Vec.create(4, 0.4)
                }],
                gasParticles: gasParticlePresets.automatic,
                ballistics: {
                    damage: 12.25,
                    obstacleMultiplier: 1.5,
                    speed: 0.26,
                    range: 160
                },
                rarity:ItemRarity.Uncommon
            },
            {
                idString: "acr",
                name: "ACR",
                ammoType: "556mm",
                ammoSpawnAmount: 90,
                fireDelay: 43,
                switchDelay: 400,
                recoilMultiplier: 0.68,
                recoilDuration: 130,
                fireMode: FireMode.Auto,
                shotSpread: 9,
                moveSpread: 12,
                noMuzzleFlash: true,
                length: 6.45,
                fists: {
                    left: Vec.create(95, -2),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(75, -1) },
                casingParticles: [{
                    position: Vec.create(4, 0.4)
                }],
                gasParticles: gasParticlePresets.automatic,
                capacity: 28,
                extendedCapacity: 45,
                reloadTime: 3,
                ballistics: {
                    damage: 9,
                    obstacleMultiplier: 1,
                    speed: 0.15,
                    range: 110,
                    tracer: {
                        opacity: 0.5
                    },
                    headshot:{
                        chance:0.2
                    }
                },
                rarity:ItemRarity.Uncommon
            },
            // light machine guns
            {
                idString: "lewis_gun",
                name: "Lewis Gun",
                ammoType: "762mm",
                ammoSpawnAmount: 94,
                capacity: 47,
                extendedCapacity: 97,
                reloadTime: 3.4,
                fireDelay: 115,
                switchDelay: 400,
                speedMultiplier: 0.825,
                recoilMultiplier: 0.7, // also test out 6.75
                recoilDuration: 200,
                fireMode: FireMode.Auto,
                shotSpread: 3.5,
                moveSpread: 6.5, // also test out 6.5, 7, 8
                length: 9.47,
                fists: {
                    left: Vec.create(120, -8),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(100, 0) },
                casingParticles: [{
                    frame: "casing_30-06",
                    position: Vec.create(3.3, 0.6)
                }],
                gasParticles: gasParticlePresets.automatic,
                ballistics: {
                    damage: 16.5,
                    obstacleMultiplier: 2,
                    speed: 0.3,
                    range: 180,
                    tracer: {
                        width: 1.1,
                        length: 1.6
                    }
                },
                rarity:ItemRarity.Rare
            },
            {
                idString: "stoner_63",
                name: "Stoner 63",
                ammoType: "556mm",
                ammoSpawnAmount: 150,
                capacity: 75,
                extendedCapacity: 125,
                reloadTime: 3.8,
                fireDelay: 90,
                switchDelay: 400,
                speedMultiplier: 0.9,
                recoilMultiplier: 0.7,
                recoilDuration: 175,
                fireMode: FireMode.Auto,
                shotSpread: 3,
                moveSpread: 3.5,
                length: 7.7,
                fists: {
                    left: Vec.create(105, -3),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(90, 0) },
                casingParticles: [
                    {
                        position: Vec.create(4, -0.6),
                        velocity: {
                            y: {
                                min: -15,
                                max: -10
                            }
                        }
                    },
                    {
                        position: Vec.create(4.2, -0.6),
                        frame: "m13_link",
                        velocity: {
                            x: {
                                min: -6,
                                max: 8
                            },
                            y: {
                                min: -25,
                                max: -10
                            }
                        }
                    }
                ] as NonNullable<SingleGunNarrowing["casingParticles"]>,
                gasParticles: gasParticlePresets.automatic,
                ballistics: {
                    damage: 14.25,
                    obstacleMultiplier: 2,
                    speed: 0.28,
                    range: 180,
                    tracer: {
                        width: 1.1,
                        length: 1.6
                    }
                },
                rarity:ItemRarity.Epic
            },
            {
                idString: "mg5",
                name: "MG5",
                ammoType: "762mm",
                ammoSpawnAmount: 240,
                capacity: 120,
                extendedCapacity: 160,
                reloadTime: 5.2,
                fireDelay: 95,
                switchDelay: 400,
                speedMultiplier: 0.8,
                recoilMultiplier: 0.65,
                recoilDuration: 200,
                fireMode: FireMode.Auto,
                shotSpread: 2,
                moveSpread: 3.5,
                length: 8.45,
                fists: {
                    left: Vec.create(105, -3),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(90, 0) },
                casingParticles: [
                    {
                        position: Vec.create(4, 0.6)
                    },
                    {
                        position: Vec.create(4.2, 0.6),
                        frame: "m13_link",
                        velocity: {
                            x: {
                                min: -6,
                                max: 8
                            },
                            y: {
                                min: 10,
                                max: 25
                            }
                        }
                    }
                ] as NonNullable<SingleGunNarrowing["casingParticles"]>,
                gasParticles: gasParticlePresets.automatic,
                ballistics: {
                    damage: 16.5,
                    obstacleMultiplier: 1.5,
                    speed: 0.26,
                    range: 180,
                    tracer: {
                        width: 1.1,
                        length: 1.6
                    }
                },
                rarity:ItemRarity.Legendary
            },
            {
                idString: "negev",
                name: "Negev",
                ammoType: "556mm",
                ammoSpawnAmount: 200,
                capacity: 200,
                extendedCapacity: 250,
                reloadTime: 5.8,
                fireDelay: 70,
                switchDelay: 400,
                speedMultiplier: 0.8,
                recoilMultiplier: 0.65,
                recoilDuration: 200,
                fireMode: FireMode.Auto,
                shotSpread: 3,
                moveSpread: 7,
                length: 8.1,
                fists: {
                    left: Vec.create(121, -18),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(90, -2) },
                casingParticles: [
                    {
                        position: Vec.create(4.2, 0.6)
                    },
                    {
                        position: Vec.create(4.4, 0.6),
                        frame: "m13_link",
                        velocity: {
                            x: {
                                min: -6,
                                max: 8
                            },
                            y: {
                                min: 10,
                                max: 25
                            }
                        }
                    }
                ] as NonNullable<SingleGunNarrowing["casingParticles"]>,
                gasParticles: gasParticlePresets.automatic,
                ballistics: {
                    damage: 12.5,
                    obstacleMultiplier: 1.5,
                    speed: 0.28,
                    range: 180,
                    tracer: {
                        width: 1.1,
                        length: 1.6
                    }
                },
                rarity:ItemRarity.Legendary
            },
            {
                idString: "mg36",
                name: "MG36",
                ammoType: "556mm",
                ammoSpawnAmount: 100,
                capacity: 50,
                extendedCapacity: 100,
                reloadTime: 2.75,
                fireDelay: 75,
                switchDelay: 400,
                recoilMultiplier: 0.75,
                recoilDuration: 140,
                fireMode: FireMode.Auto,
                shotSpread: 3.5,
                moveSpread: 7,
                length: 7.53,
                fists: {
                    left: Vec.create(95, -4),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(67, 0) },
                casingParticles: [
                    {
                        position: Vec.create(4, 0.45)
                    }
                ],
                gasParticles: gasParticlePresets.automatic,
                ballistics: {
                    damage: 11,
                    obstacleMultiplier: 2,
                    speed: 0.28,
                    range: 160
                },
                rarity:ItemRarity.Rare
            },
            // shotguns
            {
                idString: "m3k",
                name: "M3K",
                ammoType: "12g",
                ammoSpawnAmount: 18,
                capacity: 9,
                extendedCapacity: 12,
                reloadTime: 0.55,
                fireDelay: 750,
                switchDelay: 400,
                recoilMultiplier: 0.5,
                recoilDuration: 500,
                fireMode: FireMode.Single,
                shotSpread: 5,
                moveSpread: 5.5,
                jitterRadius: 1.4,
                bulletCount: 9,
                length: 7.75,
                fists: {
                    left: Vec.create(105, -3),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(90, 5) },
                casingParticles: [{
                    position: Vec.create(4, 0.6)
                }],
                gasParticles: gasParticlePresets.shotgun,
                shotsPerReload: 1,
                ballistics: {
                    damage: 8.4,
                    obstacleMultiplier: 1,
                    speed: 0.22,
                    range: 130
                },
                rarity:ItemRarity.Rare
            },
            {
                idString: "model_37",
                name: "Model 37",
                ammoType: "12g",
                ammoSpawnAmount: 15,
                capacity: 5,
                extendedCapacity: 8,
                reloadTime: 0.75,
                fireDelay: 900,
                switchDelay: 500,
                recoilMultiplier: 0.5,
                recoilDuration: 550,
                fireMode: FireMode.Single,
                shotSpread: 10,
                moveSpread: 13,
                jitterRadius: 3.4,
                bulletCount: 12,
                length: 7.85,
                fists: {
                    left: Vec.create(122, -3),
                    right: Vec.create(45, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(95, 0) },
                casingParticles: [{
                    position: Vec.create(4.5, 0.6),
                    ejectionDelay: 450,
                    velocity: {
                        y: {
                            min: 2,
                            max: 5,
                            randomSign: true
                        }
                    }
                }],
                gasParticles: gasParticlePresets.shotgun,
                shotsPerReload: 1,
                ballistics: {
                    damage: 10,
                    obstacleMultiplier: 1,
                    speed: 0.17,
                    range: 60,
                    tracer: {
                        length: 0.7
                    },
                    headshot:{
                        chance:0.2
                    }
                },
                rarity:ItemRarity.Uncommon
            },
            {
                idString: "hp18",
                name: "HP-18",
                ammoType: "12g",
                ammoSpawnAmount: 15,
                capacity: 7,
                extendedCapacity: 12,
                reloadTime: 0.725,
                shotsPerReload: 1,
                fireDelay: 450,
                switchDelay: 200,
                recoilMultiplier: 0.6,
                recoilDuration: 600,
                fireMode: FireMode.Auto,
                bulletCount: 18,
                shotSpread: 17,
                moveSpread: 20,
                jitterRadius: 2.8,
                length: 8,
                fists: {
                    left: Vec.create(120, -1),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(100, 0) },
                casingParticles: [{
                    position: Vec.create(4, 0.6)
                }],
                gasParticles: gasParticlePresets.shotgun,
                ballistics: {
                    damage: 4.4,
                    obstacleMultiplier: 1,
                    speed: 0.2,
                    range: 65,
                    tracer: {
                        length: 0.3
                    }
                },
                rarity:ItemRarity.Uncommon
            },
            {
                [inheritFrom]: "model_37",
                idString: "flues",
                name: "Flues",
                ammoSpawnAmount: 10,
                capacity: 2,
                reloadTime: 2.6,
                fireDelay: 250,
                switchDelay: 250,
                recoilMultiplier: 0.6,
                recoilDuration: 550,
                fireMode: FireMode.Single,
                length: 6,
                shotsPerReload:2,
                fists: {
                    left: Vec.create(95, -2),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(75, 0) },
                casingParticles: [{
                    position: Vec.create(4, 0.6),
                    count: 2,
                    velocity: {
                        y: {
                            min: 8,
                            max: 15,
                            randomSign: true
                        }
                    },
                    on: "reload"
                }],
                ballistics:{
                    damage:11,
                },
                rarity:ItemRarity.Uncommon
            },
            {
                idString: "usas12",
                name: "USAS-12",
                ammoType: "12g",
                ammoSpawnAmount: 30,
                capacity: 10,
                extendedCapacity: 20,
                reloadTime: 3,
                fireDelay: 525,
                switchDelay: 400,
                recoilMultiplier: 0.6,
                recoilDuration: 525,
                fireMode: FireMode.Auto,
                shotSpread: 2,
                moveSpread: 4,
                length: 7.7,
                fists: {
                    left: Vec.create(115, -1),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(90, -3.5) },
                casingParticles: [{
                    frame: "casing_12ga_he",
                    position: Vec.create(4.5, 0.6)
                }],
                ballistics: {
                    damage: 10,
                    obstacleMultiplier: 1,
                    speed: 0.22,
                    range: 60,
                    onHitExplosion: "usas_explosion",
                    explodeOnImpact: true,
                    allowRangeOverride: true,
                    tracer: {
                        length: 0.5,
                        color: 0xFF0000,
                        saturatedColor: 0xF55C3D
                    }
                },
                rarity:ItemRarity.Legendary
            },
            {
                [inheritFrom]: "model_37",
                idString: "vepr12",
                name: "Vepr-12",
                ammoSpawnAmount: 20,
                reloadTime: 2.4,
                shotsPerReload: 5,
                recoilDuration:600,
                recoilMultiplier:.7,
                fireMode:FireMode.Auto,
                fireDelay:450,
                fists: {
                    left: Vec.create(98, -2),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(81, 2) },
                casingParticles: [{
                    position: Vec.create(4.3, 0.6)
                }],
                rarity:ItemRarity.Epic
            },
            {
                idString: "dt11",
                name: "DT-11",
                ammoType: "12g",
                ammoSpawnAmount: 10,
                capacity: 2,
                reloadTime: 2.3,
                fireDelay: 300,
                switchDelay: 500,
                recoilMultiplier: 0.6,
                recoilDuration: 400,
                fireMode: FireMode.Single,
                shotSpread: 5,
                moveSpread: 6,
                length: 7.45,
                jitterRadius: 0.5,
                bulletCount: 9,
                fists: {
                    left: Vec.create(87, -3),
                    right: Vec.create(45, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(85, 0) },
                casingParticles: [{
                    position: Vec.create(4.5, 0.6),
                    count: 2,
                    velocity: {
                        y: {
                            min: 8,
                            max: 12,
                            randomSign: true
                        }
                    },
                    on: "reload"
                }],
                gasParticles: gasParticlePresets.shotgun,
                ballistics: {
                    damage: 9,
                    obstacleMultiplier: 1,
                    speed: 0.2,
                    range: 80
                },
                rarity:ItemRarity.Rare
            },
            {
                idString: "m590m",
                name: "M590M",
                ammoType: "12g",
                ammoSpawnAmount: 15,
                capacity: 5,
                extendedCapacity: 10,
                reloadTime: 2.8,
                fireDelay: 900,
                switchDelay: 900,
                recoilMultiplier: 0.5,
                recoilDuration: 500,
                fireMode: FireMode.Single,
                shotSpread: 2,
                moveSpread: 4,
                length: 7.85,
                fists: {
                    left: Vec.create(114, -3),
                    right: Vec.create(45, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(90, 0) },
                casingParticles: [{
                    position: Vec.create(4.5, 0.6),
                    ejectionDelay: 400,
                    frame: "casing_12ga_he"
                }],
                gasParticles: gasParticlePresets.shotgun,
                ballistics: {
                    damage: 10,
                    obstacleMultiplier: 1,
                    speed: 0.22,
                    range: 60,
                    onHitExplosion: "m590m_explosion",
                    explodeOnImpact: true,
                    allowRangeOverride: true,
                    tracer: {
                        length: 0.5,
                        color: 0xFF0000,
                        saturatedColor: 0xF55C3D
                    }
                },
                rarity:ItemRarity.Legendary
            },
            // sniper rifles
            {
                idString: "mosin_nagant",
                name: "Mosin-Nagant",
                ammoType: "762mm",
                ammoSpawnAmount: 20,
                capacity: 5,
                extendedCapacity:7,
                reloadTime: 0.85,
                shotsPerReload: 1,
                reloadFullOnEmpty: true,
                fullReloadTime: 2.9,
                fireDelay: 1210,
                switchDelay: 500,
                recoilMultiplier: 0.35,
                recoilDuration: 1200,
                fireMode: FireMode.Single,
                shotSpread: 1,
                moveSpread: 1,
                length: 8.65,
                shootOnRelease: true,
                fists: {
                    left: Vec.create(115, -4),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(90, 6.5) },
                casingParticles: [{
                    frame: "casing_762x54mmR",
                    position: Vec.create(4, 0.6),
                    ejectionDelay: 700
                }],
                gasParticles: gasParticlePresets.rifle,
                ballistics: {
                    damage: 71,
                    obstacleMultiplier: 1,
                    speed: 0.33,
                    range: 250,
                    tracer: {
                        width: 1.4,
                        length: 2.7
                    },
                    headshot:{
                        chance:0.02,
                        modify:1.05,
                    }
                },
                rarity:ItemRarity.Epic
            },
            {
                idString: "tango_51",
                name: "Tango 51",
                ammoType: "762mm",
                ammoSpawnAmount: 20,
                capacity: 5,
                extendedCapacity: 7,
                reloadTime: 2.6,
                fireDelay: 1200,
                switchDelay: 600,
                recoilMultiplier: 0.45,
                recoilDuration: 1200,
                fireMode: FireMode.Single,
                shotSpread: 0.3,
                moveSpread: 0.6,
                length: 8.93,
                shootOnRelease: true,
                fists: {
                    left: Vec.create(106, -1),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(90, 5) },
                casingParticles: [{
                    position: Vec.create(4, 0.6),
                    ejectionDelay: 450
                }],
                gasParticles: gasParticlePresets.rifle,
                ballistics: {
                    damage: 75,
                    obstacleMultiplier: 1,
                    speed: 0.4,
                    range: 280,
                    tracer: {
                        width: 1.6,
                        length: 3.7
                    },
                    headshot:{
                        chance:0.02,
                        modify:1.05,
                    }
                },
                rarity:ItemRarity.Epic
            },
            {
                idString: "cz600",
                name: "CZ-600",
                ammoType: "556mm",
                ammoSpawnAmount: 20,
                capacity: 5,
                extendedCapacity: 7,
                reloadTime: 2.2,
                fireDelay: 1000,
                switchDelay: 400,
                recoilMultiplier: 0.6,
                recoilDuration: 750,
                fireMode: FireMode.Single,
                shotSpread: 0.75,
                moveSpread: 1.25,
                length: 8.33,
                shootOnRelease: true,
                fists: {
                    left: Vec.create(115, -4),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(95, 3.5) },
                casingParticles: [{
                    position: Vec.create(5, 0.4),
                    ejectionDelay: 250
                }],
                gasParticles: gasParticlePresets.rifle,
                ballistics: {
                    damage: 55,
                    obstacleMultiplier: 1,
                    speed: 0.3,
                    range: 250,
                    tracer: {
                        width: 1.3,
                        length: 2.6
                    },
                    headshot:{
                        chance:0.02,
                        modify:1.05,
                    }
                },
                rarity:ItemRarity.Epic
            },
            {
                idString: "l115a1",
                name: "L115A1",
                ammoType: "338lap",
                ammoSpawnAmount: 12,
                fireDelay: 1800,
                switchDelay: 900,
                recoilMultiplier: 0.4,
                recoilDuration: 1600,
                fireMode: FireMode.Single,
                shotSpread: 0.2,
                moveSpread: 0.4,
                shootOnRelease: true,
                length: 10.8,
                casingParticles: [{
                    position: Vec.create(5, 0.2),
                    ejectionDelay: 500
                }],
                fists: {
                    left: Vec.create(120, 0),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(120, 4) },
                gasParticles: gasParticlePresets.rifle,
                capacity: 5,
                extendedCapacity: 7,
                reloadTime: 3.8,
                ballistics: {
                    damage: 120,
                    obstacleMultiplier: 1,
                    speed: 0.4,
                    tracer: {
                        width: 2.5,
                        length: 4.2
                    },
                    range: 300,
                    headshot:{
                        chance:0.02,
                        modify:1.05,
                    }
                },
                rarity:ItemRarity.Legendary
            },
            {
                idString: "rgs",
                name: "RGS",
                ammoType: "556mm",
                ammoSpawnAmount: 30,
                capacity: 10,
                reloadTime: 2.6,
                fireDelay: 600,
                switchDelay: 600,
                recoilMultiplier: 0.6,
                recoilDuration: 600,
                fireMode: FireMode.Single,
                shotSpread: 0.5,
                moveSpread: 1,
                length: 8.35,
                shootOnRelease: true,
                fists: {
                    left: Vec.create(115, -4),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(90, 3.5) },
                casingParticles: [{
                    position: Vec.create(5, 0.4),
                    ejectionDelay: 250
                }],
                gasParticles: gasParticlePresets.rifle,
                ballistics: {
                    damage: 65,
                    obstacleMultiplier: 1,
                    speed: 0.33,
                    range: 270,
                    tracer: {
                        width: 1.1,
                        length: 1.7
                    },
                    lastShotFX: true,
                    headshot:{
                        chance:0.02,
                        modify:1.05,
                    }
                },
                rarity:ItemRarity.Legendary
            },
            {
                idString: "vks",
                name: "VKS Vykhlop",
                ammoType: "50cal",
                ammoSpawnAmount: 25,
                fireDelay: 1100,
                switchDelay: 900,
                recoilMultiplier: 0.55,
                recoilDuration: 1000,
                fireMode: FireMode.Single,
                shotSpread: 1,
                moveSpread: 2,
                length: 8.7,
                fists: {
                    left: Vec.create(90, 3),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(90, 2) },
                casingParticles: [{
                    position: Vec.create(3.5, 0.3),
                    ejectionDelay: 400
                }],
                gasParticles: gasParticlePresets.rifle,
                noMuzzleFlash: true,
                capacity: 5,
                extendedCapacity: 10,
                reloadTime: 3.2,
                ballistics: {
                    damage: 95,
                    obstacleMultiplier: 1,
                    speed: 0.27,
                    range: 180,
                    tracer: {
                        width: 1.2
                    },
                    headshot:{
                        chance:0.02,
                        modify:1.05,
                    }
                },
                rarity:ItemRarity.Epic
            },
            // designated marksman rifles
            {
                idString: "vss",
                name: "VSS Vintorez",
                ammoType: "9mm",
                ammoSpawnAmount: 60,
                capacity: 20,
                extendedCapacity: 30,
                reloadTime: 2.15,
                fireDelay: 140,
                switchDelay: 400,
                recoilMultiplier: 0.7,
                recoilDuration: 140,
                fireMode: FireMode.Single,
                shotSpread: 2,
                moveSpread: 2.5,
                length: 6.9,
                fists: {
                    left: Vec.create(110, -2),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(80, 0) },
                casingParticles: [{
                    frame: "casing_9x39mm",
                    position: Vec.create(4, 0.5)
                }],
                noMuzzleFlash: true,
                ballistics: {
                    damage: 22,
                    obstacleMultiplier: 1.5,
                    speed: 0.22,
                    range: 160,
                    tracer: {
                        opacity: 0.5,
                        length: 1.7
                    }
                },
                rarity:ItemRarity.Epic
            },
            {
                idString: "sr25",
                name: "SR-25",
                ammoType: "762mm",
                ammoSpawnAmount: 80,
                capacity: 20,
                extendedCapacity: 30,
                reloadTime: 2.5,
                fireDelay: 190,
                switchDelay: 400,
                recoilMultiplier: 0.7,
                recoilDuration: 190,
                fireMode: FireMode.Single,
                shotSpread: 1,
                moveSpread: 2.5,
                length: 7.2,
                fists: {
                    left: Vec.create(110, 0),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(80, 0) },
                casingParticles: [{
                    position: Vec.create(4.2, 0.4)
                }],
                gasParticles: gasParticlePresets.rifle,
                ballistics: {
                    damage: 33,
                    obstacleMultiplier: 1.5,
                    speed: 0.3,
                    range: 230,
                    tracer: {
                        length: 1.7
                    }
                },
                rarity:ItemRarity.Epic
            },
            {
                idString: "mini14",
                name: "Mini-14",
                ammoType: "556mm",
                ammoSpawnAmount: 80,
                capacity: 20,
                extendedCapacity: 30,
                reloadTime: 2.4,
                fireDelay: 155,
                switchDelay: 400,
                recoilMultiplier: 0.8,
                recoilDuration: 155,
                fireMode: FireMode.Single,
                shotSpread: 2,
                moveSpread: 4,
                length: 7.4,
                fists: {
                    left: Vec.create(96, -2),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(85, 0) },
                casingParticles: [{
                    position: Vec.create(5, 0.5),
                    velocity: {
                        y: {
                            min: 4,
                            max: 15
                        }
                    }
                }],
                gasParticles: gasParticlePresets.rifle,
                ballistics: {
                    damage: 25.5,
                    obstacleMultiplier: 1.5,
                    speed: 0.3,
                    range: 230,
                    tracer: {
                        length: 1.7
                    }
                },
                rarity:ItemRarity.Epic
            },
            {
                idString: "m1_garand",
                name: "M1 Garand",
                ammoType: "762mm",
                ammoSpawnAmount: 40,
                capacity: 8,
                reloadTime: 2.1,
                fireDelay: 220,
                switchDelay: 400,
                recoilMultiplier: 0.75,
                recoilDuration: 200,
                fireMode: FireMode.Single,
                shotSpread: 1,
                moveSpread: 2.5,
                length: 8.2,
                fists: {
                    left: Vec.create(110, -3),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(87, 1) },
                casingParticles: [
                    {
                        frame: "casing_30-06",
                        position: Vec.create(4, 0.5),
                        velocity: {
                            y: {
                                min: 4,
                                max: 15
                            }
                        }
                    },
                    {
                        frame: "enbloc",
                        position: Vec.create(4, 0.5),
                        velocity: {
                            x: {
                                min: 1,
                                max: 3,
                                randomSign: true
                            },
                            y: {
                                min: 2,
                                max: 5,
                                randomSign: true
                            }
                        },
                        on: "reload"
                    }
                ] as NonNullable<SingleGunNarrowing["casingParticles"]>,
                gasParticles: gasParticlePresets.rifle,
                ballistics: {
                    damage: 48,
                    obstacleMultiplier: 1,
                    speed: 0.35,
                    range: 230,
                    tracer: {
                        length: 2,
                        width: 1.5
                    },
                    lastShotFX: true
                },
                rarity:ItemRarity.Legendary
            },
            {
                idString: "model_89",
                name: "Model 89",
                ammoType: "50cal",
                ammoSpawnAmount: 28,
                capacity: 7,
                extendedCapacity: 10,
                reloadTime: 0.4,
                shotsPerReload: 1,
                fireDelay: 350,
                switchDelay: 400,
                recoilMultiplier: 0.7,
                recoilDuration: 300,
                fireMode: FireMode.Single,
                shotSpread: 1,
                moveSpread: 3,
                length: 7.6,
                fists: {
                    left: Vec.create(106, -2),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(90, 0) },
                casingParticles: [{
                    frame: "casing_500sw",
                    position: Vec.create(5, 0.5),
                    ejectionDelay: 175
                }],
                gasParticles: gasParticlePresets.rifle,
                ballistics: {
                    damage: 55,
                    obstacleMultiplier: 1.5,
                    speed: 0.31,
                    range: 250,
                    tracer: {
                        width: 1.8,
                        length: 1.7
                    }
                },
                rarity:ItemRarity.Epic
            },
            {
                idString: "sks",
                name: "SKS",
                ammoType: "762mm",
                ammoSpawnAmount: 30,
                capacity: 10,
                extendedCapacity: 20,
                reloadTime: 0.4,
                shotsPerReload: 2,
                reloadFullOnEmpty: true,
                fullReloadTime: 2.4,
                fireDelay: 180,
                switchDelay: 400,
                recoilMultiplier: 0.8,
                recoilDuration: 150,
                fireMode: FireMode.Single,
                shotSpread: 3,
                moveSpread: 4,
                length: 7.9,
                fists: {
                    left: Vec.create(105, 3),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(85, 2) },
                casingParticles: [{
                    position: Vec.create(4.2, 0.4),
                    frame: "casing_762x39mm"
                }],
                gasParticles: gasParticlePresets.rifle,
                ballistics: {
                    damage: 23,
                    obstacleMultiplier: 1.5,
                    speed: 0.27,
                    range: 180,
                    tracer: {
                        length: 1.2
                    }
                },
                rarity:ItemRarity.Rare
            },
            {
                idString: "blr",
                name: "BLR",
                ammoType: "556mm",
                ammoSpawnAmount: 20,
                capacity: 3,
                reloadTime: 2.6,
                fireDelay: 1100,
                switchDelay: 400,
                recoilMultiplier: 0.8,
                recoilDuration: 300,
                fireMode: FireMode.Single,
                shotSpread: 2,
                moveSpread: 4,
                length: 7.7,
                fists: {
                    left: Vec.create(105, 3),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(85, 0) },
                casingParticles: [{
                    position: Vec.create(4.2, 0.4)
                }],
                gasParticles: gasParticlePresets.rifle,
                ballistics: {
                    damage: 61,
                    obstacleMultiplier: 1,
                    speed: 0.29,
                    range: 190,
                    tracer: {
                        length: 1.3
                    },
                    lastShotFX: true
                },
                rarity:ItemRarity.Epic
            },
            {
                idString: "mk18",
                name: "Mk-18 Mjölnir",
                ammoType: "338lap",
                ammoSpawnAmount: 20,
                fireDelay: 450,
                switchDelay: 700,
                recoilMultiplier: 0.65,
                recoilDuration: 500,
                fsaReset: 700,
                fireMode: FireMode.Single,
                shotSpread: 1,
                moveSpread: 3,
                length: 9.07,
                casingParticles: [{
                    position: Vec.create(4.5, 0.3)
                }],
                fists: {
                    left: Vec.create(120, 0),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(100, 2) },
                gasParticles: gasParticlePresets.rifle,
                capacity: 5,
                extendedCapacity: 10,
                reloadTime: 3.8,
                ballistics: {
                    damage: 90,
                    obstacleMultiplier: 1.5,
                    speed: 0.4,
                    tracer: {
                        width: 1.8,
                        length: 3
                    },
                    range: 250
                },
                rarity:ItemRarity.Legendary
            },
            // radio
            {
                idString: "radio",
                name: "Radio",
                summonAirdrop: true,
                no_infinity_ammo:true,
                ammoType: "curadell",
                ammoSpawnAmount: 1,
                fireDelay: 500,
                switchDelay: 250,
                recoilMultiplier: 1,
                recoilDuration: 0,
                fireMode: FireMode.Single,
                shotSpread: 7,
                moveSpread: 13,
                bulletOffset: 1.5,
                length: 4.7,
                fists: {
                    left: Vec.create(38, -35),
                    right: Vec.create(38, 35),
                    leftZIndex: 4,
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(65, 35) },
                casingParticles: [{
                    position: Vec.create(3.5, 1),
                    ejectionDelay: 500
                }],
                noMuzzleFlash: true,
                capacity: 1,
                reloadTime: 1.4,
                ballistics: {
                    tracer: {
                        image: "radio_wave",
                        opacity: 0.8,
                        particle: true,
                        zIndex: Number.MAX_SAFE_INTEGER - 2
                    },
                    damage: 0,
                    obstacleMultiplier: 1,
                    speed: 0.01,
                    range: 50,
                    noCollision: true
                },
                rarity:ItemRarity.Legendary
            },
            //nuke radio
            {
                idString: "nuke_radio",
                name: "Nuke Radio",
                ammoType: "curadell",
                ammoSpawnAmount: 3,
                fireDelay: 500,
                switchDelay: 250,
                recoilMultiplier: 1,
                recoilDuration: 0,
                fireMode: FireMode.Single,
                shotSpread: 7,
                moveSpread: 13,
                bulletOffset: 1.5,
                length: 4.7,
                airstrike:Airstrikes.tactical_nuke,
                fists: {
                    left: Vec.create(38, -35),
                    right: Vec.create(38, 35),
                    leftZIndex: 4,
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(65, 35) },
                casingParticles: [{
                    position: Vec.create(3.5, 1),
                    ejectionDelay: 500
                }],
                noMuzzleFlash: true,
                capacity: 1,
                reloadTime: 1.4,
                ballistics: {
                    tracer: {
                        image: "radio_wave",
                        opacity: 0.8,
                        particle: true,
                        zIndex: Number.MAX_SAFE_INTEGER - 2
                    },
                    damage: 0,
                    obstacleMultiplier: 1,
                    speed: 0.01,
                    range: 50,
                    noCollision: true
                },
                rarity:ItemRarity.Legendary
            },
            // only event exclusive weapons below this point
            {
                idString: "firework_launcher",
                name: "Firework Launcher",
                ammoType: "firework_rocket",
                ammoSpawnAmount: 9,
                capacity: 3,
                extendedCapacity: 5,
                reloadTime: 1.25,
                shotsPerReload: 1,
                shootOnRelease: true,
                fireDelay: 1250,
                switchDelay: 900,
                noMuzzleFlash: true,
                speedMultiplier: 0.65,
                recoilMultiplier: 0.5,
                recoilDuration: 925,
                fireMode: FireMode.Single,
                bulletOffset: 2.7,
                shotSpread: 5,
                moveSpread: 13,
                length: 5.5,
                devItem:true,
                fists: {
                    left: Vec.create(60, 40),
                    right: Vec.create(20, 55),
                    animationDuration: 100
                },
                image: {
                    position: Vec.create(30, 50.5),
                    zIndex: 4
                },
                casingParticles: [{
                    position: Vec.create(0.5, 3),
                    ejectionDelay: 800
                }],
                gasParticles: {
                    spread: 360,
                    amount: 50,
                    minLife: 5000,
                    maxLife: 10000,
                    minSpeed: 2,
                    maxSpeed: 5,
                    minSize: 0.3,
                    maxSize: 0.5
                },
                ballistics: {
                    damage: 20,
                    obstacleMultiplier: 1,
                    speed: 0.15,
                    range: 120,
                    onHitExplosion: "firework_launcher_explosion",
                    explodeOnImpact: true,
                    tracer: {
                        image: "firework_rocket_trail",
                        length: 1
                    },
                    trail: {
                        frame: "small_gas",
                        interval: 17,
                        amount: 5,
                        tint: -1,
                        alpha: { min: 0.4, max: 0.8 },
                        scale: { min: 0.1, max: 0.2 },
                        spreadSpeed: { min: 1, max: 3 },
                        lifetime: { min: 2500, max: 5000 }
                    }
                },
                rarity:ItemRarity.Legendary
            },
            {
                idString: "g17_scoped",
                name: "Water Gun",
                ammoType: "bb",
                fireDelay: 45,
                switchDelay: 250,
                speedMultiplier: 1.15,
                recoilMultiplier: 0.97,
                recoilDuration: 150,
                fireMode: FireMode.Auto,
                shotSpread: 1.5,
                moveSpread: 4,
                length: 6.2,
                fists: {
                    left: Vec.create(40, 0),
                    right: Vec.create(40, 0),
                    leftZIndex: 4,
                    rightZIndex: 4,
                    animationDuration: 80
                },
                noMuzzleFlash: true,
                image: { position: Vec.create(65, 0) },
                capacity: 65,
                extendedCapacity: 100,
                reloadTime: 1.5,
                ballistics: {
                    damage: 2.8,
                    obstacleMultiplier: 0.9,
                    speed: 0.15,
                    range: 75,
                    tracer: {
                        width: 0.7,
                        opacity: 0.85,
                        color: 0x0080aa,
                        saturatedColor: 0x0380ff
                    }
                },
                dual: {
                    leftRightOffset: 1.3,
                    capacity: 130,
                    extendedCapacity: 200,
                    speedMultiplier: 1.3,
                    fireDelay: 30,
                    shotSpread: 2.3,
                    moveSpread: 6,
                    reloadTime: 2.8
                }
            },
            // only dev weapons below this point
            {
                idString: "death_ray",
                name: "Death Ray",
                ammoType: "power_cell",
                devItem: true,
                capacity: 1,
                reloadTime: 1.4,
                fireDelay: 40,
                switchDelay: 500,
                recoilMultiplier: 0.8,
                recoilDuration: 100,
                fireMode: FireMode.Auto,
                shotSpread: 0.15,
                moveSpread: 0.1,
                killstreak: true,
                length: 8.7,
                fists: {
                    left: Vec.create(135, -6),
                    right: Vec.create(75, 0),
                    animationDuration: 100
                },
                image: { position: Vec.create(90, 0) },
                noMuzzleFlash: true,
                casingParticles: [{
                    position: Vec.create(4.5, 0.6),
                    on: "reload"
                }],
                ballistics: {
                    damage: 800,
                    obstacleMultiplier: 2,
                    speed: 4,
                    range: 800,
                    tracer: {
                        image: "power_cell_trail",
                        length: 10
                    }
                }
            },
            {
                idString: "destroyer_of_worlds",
                name: "Destroyer Of Worlds",
                ammoType: "50cal",
                devItem: true,
                ammoSpawnAmount: 255,
                capacity: 255,
                extendedCapacity: 1, // womp womp
                reloadTime: 0.4,
                fireDelay: 150,
                switchDelay: 250,
                speedMultiplier: 1,
                recoilMultiplier: 0.95,
                recoilDuration: 100,
                fireMode: FireMode.Auto,
                shotSpread: 0.1,
                moveSpread: 3,
                length: 14,
                noMuzzleFlash: true,
                fists: {
                    left: Vec.create(145, -4),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(150, 0) },
                casingParticles: [
                    {
                        position: Vec.create(5, 0.6),
                        velocity: {
                            y: {
                                min: 15,
                                max: 25
                            }
                        }
                    },
                    {
                        position: Vec.create(5.2, 0.6),
                        frame: "50_link",
                        velocity: {
                            x: {
                                min: -6,
                                max: 8
                            },
                            y: {
                                min: 10,
                                max: 25
                            }
                        }
                    }
                ] as NonNullable<SingleGunNarrowing["casingParticles"]>,
                ballistics: {
                    damage: 300,
                    obstacleMultiplier: 1,
                    speed: 0.45,
                    range: 500,
                    onHitExplosion:"mirv_grenade_explosion",
                    explodeOnImpact: true,
                    allowRangeOverride: true,
                    tracer: {
                        width: 2.5,
                        length: 4
                    }
                }
            },
            {
                [inheritFrom]: "model_37",
                idString: "revitalizer",
                name: "Revitalizer",
                // devItem: true,
                killstreak: true,
                consistentPatterning: true,
                jitterRadius: 0,
                image: { position: Vec.create(75, 0) },
                fists: {
                    left: Vec.create(112, -3)
                },
                length: 7.28,
                summonAirdrop:true,
                fireDelay:0,
                capacity:1000,
                shotsPerReload:1000,
                fireMode:FireMode.Auto,
                wearerAttributes: {
                    passive: {
                        maxHealth: 0.51,
                        maxAdrenaline: 0.8
                    },
                    on: {
                        kill: [
                            {
                                limit: 5,
                                maxHealth: 1.488,
                                maxAdrenaline: 1.201,
                                minAdrenaline: 20,
                                speedBoost: 1.02
                            },
                            {
                                healthRestored: 230,
                                adrenalineRestored: 30
                            }
                        ],
                        damageDealt: [
                            {
                                healthRestored: 2,
                                adrenalineRestored: 1.5
                            }
                        ]
                    }
                }
            },

            //SUROIMODES
            {
                idString: "model_94",
                name: "Model 94",
                itemType: ItemType.Gun,
                ammoType: "45acp",
                ammoSpawnAmount: 64,
                capacity: 8,
                extendedCapacity:13,
                reloadTime: 0.5,
                shotsPerReload:1,
                fireDelay: 900,
                switchDelay: 900,
                speedMultiplier: 0.9,
                recoilMultiplier: 0.45,
                recoilDuration: 750,
                fireMode: FireMode.Single,
                shotSpread: 0.5,
                moveSpread: 1,
                length: 9,
                fists: {
                    left: Vec.create(105, -1),
                    right: Vec.create(40, 0),
                    animationDuration: 100,
                    rightZIndex: 4,
                },
                image: { position: Vec.create(105, 4) },
                gasParticles: gasParticlePresets.rifle,
                casingParticles: [
                    {
                        position: Vec.create(4, 0.6),
                    }
                ] as NonNullable<SingleGunNarrowing["casingParticles"]>,
                ballistics: {
                    damage: 51,
                    obstacleMultiplier: 1,
                    speed: 0.33,
                    range: 250,
                    tracer:{
                        width:1.4,
                        length:2.5
                    }
                },
                rarity:ItemRarity.Uncommon
            },
            {
                idString: "peacemaker",
                name: "Peacemaker",
                itemType: ItemType.Gun,
                ammoType: "45acp",
                ammoSpawnAmount: 64,
                fireDelay: 150,
                switchDelay: 250,
                speedMultiplier: 0.92,
                recoilMultiplier: 0.8,
                recoilDuration: 90,
                fireMode: FireMode.Auto,
                shotSpread: 12,
                moveSpread: 13,
                length: 4.7,
                fists: {
                    left: Vec.create(40, 0),
                    right: Vec.create(40, 0),
                    leftZIndex: 4,
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(65, 0) },
                gasParticles: gasParticlePresets.pistol,
                casingParticles: [
                    {
                        position: Vec.create(3.5, 0.5),
                        count: 6,
                        velocity: {
                            x: {
                                min: -8,
                                max: -2
                            },
                            y: {
                                min: 2,
                                max: 9,
                                randomSign: true
                            }
                        },
                        on: "reload"
                    }
                ] as NonNullable<SingleGunNarrowing["casingParticles"]>,
                capacity: 6,
                extendedCapacity:9,
                reloadTime: 3,
                ballistics: {
                    damage: 29,
                    obstacleMultiplier: 1,
                    speed: 0.22,
                    range: 108
                },
                dual:{
                    leftRightOffset: 1.3,
                    fireDelay: 150,
                    capacity: 12,
                    extendedCapacity: 18,
                    reloadTime: 5.5
                },
                rarity:ItemRarity.Common
            },
            {
                idString: "svd",
                name: "SVD",
                itemType: ItemType.Gun,
                ammoType: "762mm",
                ammoSpawnAmount: 30,
                capacity: 10,
                extendedCapacity:15,
                reloadTime: 2.5,
                fireDelay: 200,
                switchDelay: 900,
                speedMultiplier: 0.9,
                recoilMultiplier: 0.7,
                recoilDuration: 140,
                fireMode: FireMode.Single,
                shotSpread: 1.3,
                moveSpread: 1.5,
                length: 9.5,
                fists: {
                    right: Vec.create(40, 0),
                    left: Vec.create(110, 2),
                    animationDuration: 100,
                    rightZIndex: 4,
                },
                image: { position: Vec.create(105, 4) },
                gasParticles: gasParticlePresets.rifle,
                casingParticles: [
                    {
                        position: Vec.create(4, 0.6),
                    }
                ] as NonNullable<SingleGunNarrowing["casingParticles"]>,
                ballistics: {
                    damage: 41,
                    obstacleMultiplier: 1,
                    speed: 0.30,
                    range: 250,
                    tracer:{
                        width:1,
                        length:2.7
                    }
                },
                rarity:ItemRarity.Legendary
            },
            {
                idString: "l86a2",
                name: "L86A2",
                itemType: ItemType.Gun,
                ammoType: "556mm",
                ammoSpawnAmount: 90,
                capacity: 30,
                extendedCapacity:40,
                reloadTime: 3,
                fireDelay: 110,
                switchDelay: 400,
                speedMultiplier: 0.92,
                recoilMultiplier: 0.8,
                recoilDuration: 130,
                fireMode: FireMode.Single,
                shotSpread: 1,
                moveSpread: 1.5,
                length: 10,
                fists: {
                    right: Vec.create(40, 0),
                    left: Vec.create(100, -2),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(120, 0) },
                casingParticles: [
                    {
                        position: Vec.create(5, 0.5),
                    }
                ] as NonNullable<SingleGunNarrowing["casingParticles"]>,
                ballistics: {
                    damage: 27,
                    obstacleMultiplier: 0.70,
                    speed: 0.27,
                    range: 230
                },
                rarity:ItemRarity.Legendary
            },
            {
                idString: "an94",
                name: "AN-94",
                itemType: ItemType.Gun,
                ammoType: "762mm",
                ammoSpawnAmount: 90,
                capacity: 45,
                extendedCapacity:60,
                reloadTime: 2.35,
                fireDelay: 25,
                switchDelay: 750,
                speedMultiplier: 1,
                recoilMultiplier: 0.5,
                recoilDuration: 300,
                fireMode: FireMode.Burst,
                burstProperties: {
                    shotsPerBurst: 2,
                    burstCooldown: 240
                },
                shotSpread: 1.5,
                moveSpread: 4.5,
                length: 7.5,
                fists: {
                    left: Vec.create(120, -2),
                    right: Vec.create(45, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(90, 2) },
                gasParticles:gasParticlePresets.automatic,
                casingParticles: [{
                    position: Vec.create(4, 0.6)
                }],
                ballistics: {
                    damage: 19,
                    obstacleMultiplier: 1,
                    speed: 0.2475,
                    range: 300
                },
                rarity:ItemRarity.Legendary
            },
            {
                idString: "fort_17",
                name: "Fort-17",
                itemType: ItemType.Gun,
                ammoType: "45acp",
                ammoSpawnAmount: 48,
                capacity: 10,
                extendedCapacity:13,
                reloadTime: 1.4,
                switchDelay: 250,
                fireDelay: 140,
                ballistics: {
                    damage: 22,
                    obstacleMultiplier: 1,
                    range: 180,
                    speed: 0.23
                },
                fireMode: FireMode.Single,
                fists: {
                    left: Vec.create(40, 0),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    leftZIndex: 4,
                    animationDuration: 250
                },
                image: {
                    position: Vec.create(65, 0)
                },
                gasParticles:gasParticlePresets.pistol,
                shotSpread: 2,
                moveSpread: 5.5,
                length: 5.2,
                speedMultiplier: 0.92,
                recoilMultiplier: 0.8,
                recoilDuration: 90,
                dual: {
                    leftRightOffset: 1.3,
                    fireDelay: 120,
                    shotSpread: 8,
                    moveSpread: 11,
                    capacity: 20,
                    extendedCapacity:26,
                    reloadTime: 3
                },
                rarity:ItemRarity.Common
            },
            {
                idString: "p90",
                name: "P90",
                itemType: ItemType.Gun,
                ammoType: "45acp",
                ammoSpawnAmount: 200,
                capacity: 100,
                extendedCapacity:130,
                reloadTime: 2.9,
                fireDelay: 40,
                switchDelay: 100,
                speedMultiplier: 1,
                recoilMultiplier: 0.6,
                recoilDuration: 100,
                fireMode: FireMode.Auto,
                shotSpread: 4,
                moveSpread: 9,
                length: 7.1,
                fists: {
                    left: Vec.create(40, 0),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    leftZIndex: 4,
                    animationDuration: 100
                },
                casingParticles: [{
                    position: Vec.create(4.5, 0.6),
                    ejectionDelay:35,
                }],
                gasParticles:gasParticlePresets.pistol,
                image: { position: Vec.create(80, 0) },
                ballistics: {
                    damage: 7,
                    obstacleMultiplier: 1,
                    speed: 0.20,
                    range: 80
                },
                rarity:ItemRarity.Epic
            },
            {
                idString: "m134",
                name: "M134 Minigun",
                itemType: ItemType.Gun,
                ammoType: "762mm",
                ammoSpawnAmount: 200,
                capacity: 200,
                extendedCapacity:230,
                reloadTime: 8,
                switchDelay: 900,
                fireDelay: 55,
                ballistics: {
                    damage: 10.8,
                    obstacleMultiplier: 5,
                    range: 200,
                    speed: 0.2925
                },
                fireMode: FireMode.Auto,
                fists: {
                    left: Vec.create(105, 0),
                    right: Vec.create(40, 3),
                    rightZIndex: 4,
                    leftZIndex: 4,
                    animationDuration: 120
                },
                image: {
                    position: Vec.create(120, 0)
                },
                shotSpread: 1,
                moveSpread: 1.2,
                length: 11,
                recoilDuration: 175,
                recoilMultiplier: 0.25,
                speedMultiplier: 0.75,
                casingParticles: [{
                    position: Vec.create(5, 0.6),
                    velocity: {
                        y: {
                            min: 4,
                            max: 15
                        }
                    }
                }],
                gasParticles:gasParticlePresets.automatic,
                rarity:ItemRarity.Legendary
            },
            {
                idString: "sv98",
                name: "SV-98",
                itemType: ItemType.Gun,
                ammoType: "762mm",
                ammoSpawnAmount: 30,
                capacity: 10,
                extendedCapacity: 13,
                reloadTime: 2.7,
                fireDelay: 1500,
                switchDelay: 500,
                speedMultiplier: 0.92,
                recoilMultiplier: 0.4,
                recoilDuration: 1000,
                fireMode: FireMode.Single,
                shotSpread: 1,
                moveSpread: 2.5,
                length: 8.9,
                shootOnRelease: true,
                fists: {
                    left: Vec.create(106, -1),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(90, 5) },
                casingParticles: [{
                    position: Vec.create(4, 0.6),
                    ejectionDelay: 450
                }],
                gasParticles:gasParticlePresets.rifle,
                ballistics: {
                    damage: 88,
                    obstacleMultiplier: 1.5,
                    speed: 0.4,
                    range: 360,
                    tracer: {
                        width: 2.3,
                        length: 2.45
                    }
                },
                rarity:ItemRarity.Epic
            },
            {
                idString: "awms",
                name: "AWM-S",
                itemType: ItemType.Gun,
                ammoType: "338lap",
                ammoSpawnAmount: 20,
                capacity: 5,
                extendedCapacity:7,
                reloadTime: 3.5,
                fireDelay: 1500,
                switchDelay: 1000,
                speedMultiplier: 0.92,
                recoilMultiplier: 0.3,
                recoilDuration: 1500,
                fireMode: FireMode.Auto,
                shotSpread: 0.5,
                moveSpread: 3.5,
                length: 8.9,
                shootOnRelease: true,
                fists: {
                    left: Vec.create(115, -4),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(90, 5) },
                casingParticles: [{
                    position: Vec.create(4, 0.6),
                    ejectionDelay: 700
                }],
                gasParticles:gasParticlePresets.rifle,
                ballistics: {
                    damage: 180,
                    obstacleMultiplier: 1.5,
                    speed: 0.25,
                    range: 675,
                    tracer: {
                        width: 2.3,
                        opacity:0.4,
                        length: 1.3
                    },
                    headshot:{
                        chance:0.02,
                        modify:1.05,
                    }
                },
                rarity:ItemRarity.Legendary
            },
            {
                idString: "super90",
                name: "Super 90",
                itemType: ItemType.Gun,
                ammoType: "12g",
                ammoSpawnAmount: 16,
                capacity: 8,
                extendedCapacity:11,
                reloadTime: 0.52,
                shotsPerReload: 1,
                fireDelay: 430,
                switchDelay: 750,
                speedMultiplier: 1,
                recoilMultiplier: 0.5,
                recoilDuration: 500,
                fireMode: FireMode.Single,
                shotSpread: 4,
                moveSpread: 7,
                length: 8.3,
                fists: {
                    left: Vec.create(106, 0),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(90, 5) },
                casingParticles: [{
                    position: Vec.create(4, 0.6)
                }],
                gasParticles:gasParticlePresets.shotgun,
                ballistics: {
                    damage: 78,
                    obstacleMultiplier: 1,
                    speed: 0.26,
                    range: 140,
                    tracer: {
                        width: 2.3,
                        length: 0.7,
                    },
                    headshot:{
                        chance:0.1,
                        modify:1.09,
                    }
                },
                rarity:ItemRarity.Legendary
            },
            {
                idString: "pkp",
                name: "PKP Pecheneg",
                itemType: ItemType.Gun,
                ammoType: "762mm",
                ammoSpawnAmount: 200,
                capacity: 200,
                extendedCapacity:250,
                reloadTime: 5,
                switchDelay: 750,
                fireDelay: 100,
                ballistics: {
                    damage: 19,
                    obstacleMultiplier: 2,
                    range: 200,
                    speed: 0.27
                },
                fireMode: FireMode.Auto,
                fists: {
                    left: Vec.create(130, -3),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: {
                    position: Vec.create(110, 0)
                },
                gasParticles:gasParticlePresets.automatic,
                casingParticles: [{
                    position: Vec.create(4.5, 0.6),
                    ejectionDelay: 90
                }],
                shotSpread: 2.5,
                moveSpread: 9,
                length: 9.5,
                recoilDuration: 175,
                recoilMultiplier: 0.7,
                speedMultiplier: 0.9,
                rarity:ItemRarity.Legendary
            },
            {
                idString: "bar",
                name: "BAR M1918",
                itemType: ItemType.Gun,
                ammoType: "762mm",
                ammoSpawnAmount: 80,
                capacity: 20,
                extendedCapacity:30,
                reloadTime: 2.7,
                switchDelay: 750,
                fireDelay: 120,
                ballistics: {
                    damage: 18,
                    obstacleMultiplier: 2,
                    range: 275,
                    speed: 0.2565,
                    headshot:{
                        chance:0.02,
                        modify:1.05,
                    }
                },
                fireMode: FireMode.Auto,
                gasParticles:gasParticlePresets.automatic,
                casingParticles: [{
                    position: Vec.create(4, 0.6),
                    ejectionDelay: 110
                }],
                fists: {
                    left: Vec.create(105, -3),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: {
                    position: Vec.create(100, 0)
                },
                shotSpread: 2,
                moveSpread: 9,
                length: 8,
                recoilDuration: 175,
                recoilMultiplier: 0.7,
                speedMultiplier: 0.9,
                rarity:ItemRarity.Epic
            },
            {
                idString: "m249",
                name: "M249",
                itemType: ItemType.Gun,
                ammoType: "556mm",
                ammoSpawnAmount: 200,
                capacity: 100,
                extendedCapacity:200,
                reloadTime: 6.7,
                switchDelay: 750,
                fireDelay: 80,
                ballistics: {
                    damage: 15,
                    obstacleMultiplier: 2,
                    range: 220,
                    speed: 0.28125
                },
                gasParticles:gasParticlePresets.automatic,
                casingParticles: [{
                    position: Vec.create(4.5, 0.6),
                    ejectionDelay: 70
                }],
                fireMode: FireMode.Auto,
                fists: {
                    left: Vec.create(105, -3),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: {
                    position: Vec.create(100, 0)
                },
                shotSpread: 1.5,
                moveSpread: 6.5,
                length: 9,
                recoilDuration: 175,
                recoilMultiplier: 0.7,
                speedMultiplier: 0.9,
                rarity:ItemRarity.Legendary
            },
            {
                idString: "vickers",
                name: "Vickers No.2 Mk.1",
                itemType: ItemType.Gun,
                ammoType: "762mm",
                ammoSpawnAmount: 200,
                capacity: 100,
                extendedCapacity:120,
                reloadTime: 4.2,
                fireDelay: 80,
                switchDelay: 400,
                speedMultiplier: 0.9,
                recoilMultiplier: 0.65,
                recoilDuration: 175,
                fireMode: FireMode.Auto,
                shotSpread: 3,
                moveSpread: 4,
                length: 7.3,
                fists: {
                    left: Vec.create(105, -3),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(80, 0) },
                casingParticles: [{
                    position: Vec.create(4, 0.6)
                }],
                gasParticles:gasParticlePresets.automatic,
                ballistics: {
                    damage: 14,
                    obstacleMultiplier: 2,
                    speed: 0.3,
                    range: 180,
                    tracer: {
                        width: 1.1,
                        length: 1.6
                    }
                },
                rarity:ItemRarity.Epic
            },
            {
                idString: "tommy",
                name: "Tommy Gun",
                itemType: ItemType.Gun,
                ammoType: "45acp",
                ammoSpawnAmount: 100,
                capacity: 30,
                extendedCapacity:50,
                reloadTime: 3,
                fireDelay: 75,
                switchDelay: 350,
                speedMultiplier: 0.92,
                recoilMultiplier: 0.7,
                recoilDuration: 170,
                fireMode: FireMode.Auto,
                shotSpread: 6,
                moveSpread: 9,
                length: 6.55,
                fists: {
                    left: Vec.create(103, -2),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(76, -3) },
                casingParticles: [{
                    position: Vec.create(4, 0.6),
                }],
                gasParticles:gasParticlePresets.automatic,
                ballistics: {
                    damage: 12.9,
                    obstacleMultiplier: 1,
                    speed: 0.25,
                    range: 120
                },
                rarity:ItemRarity.Uncommon
            },
            {
                idString: "delisle",
                name: "De Lisle",
                itemType: ItemType.Gun,
                ammoType: "45acp",
                ammoSpawnAmount: 44,
                capacity: 5,
                extendedCapacity:6,
                reloadTime: 2.3,
                fireDelay: 950,
                switchDelay: 950,
                speedMultiplier: 0.92,
                recoilMultiplier: 0.6,
                recoilDuration: 300,
                fireMode: FireMode.Single,
                shotSpread: 1.5,
                moveSpread: 1.5,
                length: 7.5,
                shootOnRelease: true,
                fists: {
                    left: Vec.create(113, 0),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(85, 0) },
                casingParticles: [{
                    position: Vec.create(4, 0.6),
                    ejectionDelay: 300,
                }],
                gasParticles:gasParticlePresets.automatic,
                ballistics: {
                    damage: 70,
                    obstacleMultiplier: 1,
                    speed: 0.21,
                    range: 150,
                    tracer: {
                        opacity: 0.15,
                        length: 2
                    },
                    headshot:{
                        chance:0.02,
                        modify:1.05,
                    }
                },
                noMuzzleFlash: true,
                rarity:ItemRarity.Legendary
            },
            //Originals
            {
                idString: "vector_acp",
                name: "Vector ACP",
                ammoType: "45acp",
                ammoSpawnAmount: 87,
                capacity: 29,
                extendedCapacity: 39,
                reloadTime: 1.7,
                fireDelay: 38,
                switchDelay: 300,
                recoilMultiplier: 0.75,
                recoilDuration: 60,
                fireMode: FireMode.Auto,
                shotSpread: 2,
                moveSpread: 6,
                length: 7.2,
                fists: {
                    left: Vec.create(85, -6),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                casingParticles: [{
                    position: Vec.create(4.7, 0.3)
                }],
                gasParticles: gasParticlePresets.automatic,
                image: { position: Vec.create(80, 0) },
                ballistics: {
                    damage: 11,
                    obstacleMultiplier: 1,
                    speed: 0.19,
                    range: 80
                },
                rarity:ItemRarity.Epic
            },
            {
                idString: "mp5",
                name: "MP5",
                ammoType: "22lr",
                ammoSpawnAmount: 120,
                capacity: 30,
                extendedCapacity: 50,
                reloadTime: 2,
                fireDelay: 80,
                switchDelay: 300,
                recoilMultiplier: 0.75,
                recoilDuration: 60,
                fireMode: FireMode.Auto,
                shotSpread: 4,
                moveSpread: 5,
                length: 6.1,
                fists: {
                    left: Vec.create(85, -6),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                casingParticles: [{
                    position: Vec.create(4, 0.3)
                }],
                gasParticles: gasParticlePresets.automatic,
                image: { position: Vec.create(80, 0) },
                ballistics: {
                    damage: 10,
                    obstacleMultiplier: 1,
                    speed: 0.27,
                    range: 160,
                },
                rarity:ItemRarity.Uncommon
            },
            {
                idString: "mp5e",
                name: "MP5-Extended",
                ammoType: "22lr",
                ammoSpawnAmount: 140,
                capacity: 35,
                extendedCapacity: 55,
                reloadTime: 2.1,
                fireDelay: 80,
                switchDelay: 300,
                recoilMultiplier: 0.68,
                recoilDuration: 60,
                fireMode: FireMode.Auto,
                shotSpread: 4,
                moveSpread: 5,
                length: 6.1,
                fists: {
                    left: Vec.create(85, -6),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                casingParticles: [{
                    position: Vec.create(4, 0.3)
                }],
                gasParticles: gasParticlePresets.automatic,
                image: { position: Vec.create(70, 0) },
                ballistics: {
                    damage: 11,
                    obstacleMultiplier: 1,
                    speed: 0.27,
                    range: 160,
                },
                rarity:ItemRarity.Uncommon
            },
            {
                idString: "pfeifer_zeliska",
                name: "Pfeifer Zeliska",
                ammoType: "338lap",
                ammoSpawnAmount: 30,
                fireDelay: 1200,
                switchDelay: 1000,
                speedMultiplier: 0.85,
                recoilMultiplier: 0.2,
                recoilDuration: 1200,
                fireMode: FireMode.Single,
                shotSpread: 0.5,
                moveSpread: 1,
                length: 5.9,
                fists: {
                    left: Vec.create(40, 0),
                    right: Vec.create(40, 0),
                    leftZIndex: 4,
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(70, 0) },
                casingParticles: [{
                    position: Vec.create(3.5, 0.5),
                    count: 5,
                    velocity: {
                        x: {
                            min: -8,
                            max: -2
                        },
                        y: {
                            min: 2,
                            max: 9,
                            randomSign: true
                        }
                    },
                    on: "reload"
                }],
                gasParticles: gasParticlePresets.rifle,
                capacity: 5,
                extendedCapacity:7,
                reloadTime: 3,
                ballistics: {
                    damage: 100,
                    obstacleMultiplier: 1.6,
                    speed: 0.26,
                    range: 1000,
                    headshot:{
                        chance:0.02,
                        modify:1.05,
                    }
                },
                dual: {
                    ammoSpawnAmount:65,
                    leftRightOffset: 1.3,
                    fireDelay: 850,
                    shotSpread: 1,
                    moveSpread: 1,
                    capacity: 10,
                    extendedCapacity:14,
                    reloadTime: 6
                },
                rarity:ItemRarity.Legendary
            },
            {
                idString: "apple_launcher",
                name: "apple Launcher",
                ammoType: "firework_rocket",
                infiniteAmmo:true,
                capacity: 3,
                extendedCapacity: 5,
                reloadTime: 1.25,
                shotsPerReload: 1,
                shootOnRelease: true,
                fireDelay: 1250,
                switchDelay: 900,
                noMuzzleFlash: true,
                speedMultiplier: 0.65,
                recoilMultiplier: 0.5,
                recoilDuration: 925,
                fireMode: FireMode.Single,
                bulletOffset: 2.7,
                shotSpread: 2,
                moveSpread: 4,
                length: 5.5,
                fists: {
                    left: Vec.create(60, 40),
                    right: Vec.create(20, 55),
                    animationDuration: 100
                },
                image: {
                    position: Vec.create(30, 50.5),
                    zIndex: 4
                },
                casingParticles: [{
                    position: Vec.create(0.5, 3),
                    ejectionDelay: 800
                }],
                gasParticles: {
                    spread: 360,
                    amount: 50,
                    minLife: 5000,
                    maxLife: 10000,
                    minSpeed: 2,
                    maxSpeed: 5,
                    minSize: 0.3,
                    maxSize: 0.5
                },
                ballistics: {
                    damage: 30,
                    obstacleMultiplier: 1,
                    speed: 0.15,
                    range: 120,
                    onHitExplosion: "apple_launcher_explosion",
                    explodeOnImpact: true,
                    tracer: {
                        image: "apple_trail",
                        length: 1,
                        width: 1,
                    },
                    headshot:{
                        chance:0.02,
                        modify:1.05,
                    }
                },
                rarity:ItemRarity.Epic
            },
            {
                idString: "ppsh41",
                name: "PPSH-41",
                ammoType: "762mm",
                ammoSpawnAmount: 100,
                fireDelay: 43,
                switchDelay: 400,
                recoilMultiplier: 0.68,
                recoilDuration: 130,
                fireMode: FireMode.Auto,
                shotSpread: 20,
                moveSpread: 22,
                jitterRadius:2,
                noMuzzleFlash: true,
                length: 6.45,
                fists: {
                    left: Vec.create(95, -2),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(75, -1) },
                casingParticles: [{
                    position: Vec.create(4, 0.4)
                }],
                gasParticles: gasParticlePresets.automatic,
                capacity: 100,
                extendedCapacity: 150,
                reloadTime: 4.3,
                ballistics: {
                    damage: 10.5,
                    obstacleMultiplier: 1,
                    speed: 0.13,
                    range: 70,
                    tracer: {
                        opacity: 0.5
                    },
                    headshot:{
                        chance:0.2
                    }
                },
                rarity:ItemRarity.Rare
            },
            {
                idString: "taurus_tx22",
                name: "Taurus TX22",
                ammoType: "22lr",
                ammoSpawnAmount: 90,
                fireDelay: 50,
                switchDelay: 250,
                recoilMultiplier: 0.7,
                recoilDuration: 300,
                fireMode: FireMode.Burst,
                burstProperties:{
                    shotsPerBurst:5,
                    burstCooldown: 325
                },
                shotSpread: 2,
                moveSpread: 3,
                length: 4.7,
                fists: {
                    left: Vec.create(40, 0),
                    right: Vec.create(40, 0),
                    leftZIndex: 4,
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(65, 0) },
                casingParticles: [{
                    position: Vec.create(3.5, 0.5),
                    velocity: {
                        y: {
                            min: 2,
                            max: 18
                        }
                    }
                }],
                gasParticles: gasParticlePresets.pistol,
                capacity: 30,
                extendedCapacity: 40,
                reloadTime: 2,
                ballistics: {
                    damage: 9.5,
                    obstacleMultiplier: 1,
                    speed: 0.24,
                    range: 140,
                    tracer:{
                        length:2.5,
                    }
                },
                dual: {
                    leftRightOffset: 1.3,
                    shotSpread: 3,
                    moveSpread: 4,
                    capacity: 60,
                    extendedCapacity: 80,
                    reloadTime: 3.1
                },
                rarity:ItemRarity.Common
            },
            {
                idString: "uzi_22lr",
                name: "Uzi .22LR",
                ammoType: "22lr",
                ammoSpawnAmount: 200,
                capacity: 100,
                extendedCapacity: 200,
                reloadTime: 1.9,
                fireDelay: 27,
                switchDelay: 300,
                recoilMultiplier: 0.75,
                recoilDuration: 60,
                fireMode: FireMode.Auto,
                shotSpread: 13,
                moveSpread: 23,
                length: 5.8,
                fists: {
                    left: Vec.create(85, -6),
                    right: Vec.create(40, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                casingParticles: [{
                    position: Vec.create(3.5, 0.4)
                }],
                gasParticles: gasParticlePresets.automatic,
                image: { position: Vec.create(80, 0) },
                ballistics: {
                    damage: 6,
                    obstacleMultiplier: 1,
                    speed: 0.156,
                    range: 70,
                },
                rarity:ItemRarity.Uncommon
            },
            {
                idString: "rifle_cbc",
                name: "RIFLE CBC",
                ammoType: "22lr",
                ammoSpawnAmount: 80,
                capacity: 12,
                extendedCapacity: 20,
                reloadTime: 0.5,
                shotsPerReload: 1,
                fireDelay: 370,
                switchDelay: 300,
                recoilMultiplier: 0.75,
                recoilDuration: 270,
                fireMode: FireMode.Single,
                shotSpread: 2,
                moveSpread: 4,
                length: 7.85,
                gasParticles:gasParticlePresets.rifle,
                fists: {
                    left: Vec.create(122, -3),
                    right: Vec.create(45, 0),
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(95, 0) },
                casingParticles: [{
                    position: Vec.create(4.5, 0.6),
                    ejectionDelay: 450,
                    velocity: {
                        y: {
                            min: 2,
                            max: 5,
                            randomSign: true
                        }
                    }
                }],
                ballistics: {
                    damage: 29.3,
                    obstacleMultiplier: 1.2,
                    speed: 0.37,
                    range: 190,
                    tracer:{
                        length:4,
                    }
                },
                rarity:ItemRarity.Uncommon
            },
            {
                idString: "m134_22lr",
                name: "M134 Minigun 22LR",
                itemType: ItemType.Gun,
                ammoType: "22lr",
                ammoSpawnAmount: 300,
                capacity: 300,
                extendedCapacity:400,
                reloadTime: 8,
                switchDelay: 900,
                fireDelay: 22,
                ballistics: {
                    damage: 6.6,
                    obstacleMultiplier: 1.5,
                    range: 180,
                    speed: 0.27,
                    tracer:{
                        length:4,
                        opacity:0.35
                    }
                },
                fireMode: FireMode.Auto,
                fists: {
                    left: Vec.create(105, 0),
                    right: Vec.create(40, 3),
                    rightZIndex: 4,
                    leftZIndex: 4,
                    animationDuration: 120
                },
                image: {
                    position: Vec.create(120, 0)
                },
                shotSpread: 9,
                moveSpread: 10,
                length: 11,
                recoilDuration: 175,
                recoilMultiplier: 0.6,
                speedMultiplier: 0.87,
                casingParticles: [{
                    position: Vec.create(5, 0.6),
                    velocity: {
                        y: {
                            min: 4,
                            max: 15
                        }
                    }
                }],
                gasParticles:gasParticlePresets.automatic,
                rarity:ItemRarity.Legendary
            },
            {
                idString: "medic_pistol",
                name: "Medic Pistol",
                ammoType: "medic_charge",
                ammoSpawnAmount: 120,
                fireDelay: 100,
                switchDelay: 250,
                recoilMultiplier: 0.7,
                recoilDuration: 300,
                fireMode: FireMode.Single,
                shotSpread: 1,
                moveSpread: 1,
                length: 4.7,
                fists: {
                    left: Vec.create(40, 0),
                    right: Vec.create(40, 0),
                    leftZIndex: 4,
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(65, 0) },
                casingParticles: [{
                    position: Vec.create(3.5, 0.5),
                    velocity: {
                        y: {
                            min: 2,
                            max: 18
                        }
                    }
                }],
                gasParticles: gasParticlePresets.pistol,
                capacity: 7,
                extendedCapacity: 10,
                reloadTime: 2.5,
                ballistics: {
                    damage: 4,
                    heal:true,
                    obstacleMultiplier: 1,
                    speed: 0.18,
                    range: 120,
                    tracer:{
                        length:2.5,
                        opacity:1,
                        color:0x11ee11
                    }
                },
                dual: {
                    leftRightOffset: 1.3,
                    capacity: 14,
                    extendedCapacity: 20,
                    reloadTime: 3.7
                },
                rarity:ItemRarity.Legendary
            },
            {
                idString: "px4",
                name: "PX4",
                ammoType: "556mm",
                ammoSpawnAmount: 28,
                fireDelay: 270, 
                switchDelay: 250,
                recoilMultiplier: 0.8,
                recoilDuration: 90,
                fireMode: FireMode.Single,
                shotSpread: 3,
                moveSpread: 4,
                length: 4.5,
                fists: {
                    left: Vec.create(40, 0),
                    right: Vec.create(40, 0),
                    leftZIndex: 4,
                    rightZIndex: 4,
                    animationDuration: 100
                },
                image: { position: Vec.create(55, 0) },
                casingParticles: [{
                    position: Vec.create(3.5, 0.5),
                    velocity: {
                        y: {
                            min: 2,
                            max: 18
                        }
                    }
                }],
                gasParticles: gasParticlePresets.pistol,
                capacity: 7,
                extendedCapacity: 10,
                reloadTime: 1.5,
                ballistics: {
                    damage: 25,
                    obstacleMultiplier: 1,
                    speed: 0.3,
                    range: 170,
                    tracer:{
                        width:1.5,
                    },
                    headshot:{
                        chance:0.15,
                        modify:1.4,
                    }
                },
                dual: {
                    leftRightOffset: 1.3,
                    fireDelay: 140,
                    shotSpread: 4,
                    moveSpread: 5,
                    capacity: 14,
                    extendedCapacity: 20,
                    reloadTime: 2.9
                },
                rarity:ItemRarity.Common
            },
            {
                [inheritFrom]:"px4",
                idString: "px4s",
                name: "PX4-S",
                length:8,
                ballistics: {
                    damage: 30,
                    tracer:{
                        opacity:0.5
                    }
                },
                image: { position: Vec.create(90, 0) },
                dual: {
                    leftRightOffset: 1.3,
                    fireDelay: 150,
                    shotSpread: 4,
                    moveSpread: 5,
                    capacity: 14,
                    extendedCapacity: 20,
                    reloadTime: 2.9
                },
                rarity:ItemRarity.Epic
            },
        ] satisfies ReadonlyArray<RawDefinition<RawGunDefinition>>).map(e => {
            if (e.dual === undefined) {
                return [e];
            }

            const dualDef = mergeDeep(
                {},
                e,
                e.dual,
                {
                    idString: `dual_${e.idString}`,
                    name: `Dual ${e.name}`,
                    isDual: true,
                    singleVariant: e.idString
                }
            ) as GunDefinition & { readonly dual?: object, readonly isDual: true };

            // @ts-expect-error init code
            delete dualDef.dual;
            // @ts-expect-error init code
            delete dualDef.fists;
            // @ts-expect-error init code
            delete dualDef.image;
            // @ts-expect-error init code
            delete dualDef.casingParticles;
            // @ts-expect-error init code
            delete e.dual;
            // @ts-expect-error init code
            e.dualVariant = dualDef.idString;

            return [e, dualDef];
        }).flat() as readonly GunDefinition[];
    }
);
