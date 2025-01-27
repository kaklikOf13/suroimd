import { FireMode } from "../constants";
import { EaseFunctions, EasingFunction } from "../utils/math";
import { inheritFrom, ItemType, ObjectDefinitions, type InventoryItemDefinition } from "../utils/objectDefinitions";
import { Vec, type Vector } from "../utils/vector";
export type MeleeDefinition = InventoryItemDefinition & {
    readonly itemType: ItemType.Melee

    readonly damage: number
    readonly obstacleMultiplier: number
    readonly piercingMultiplier?: number // If it does less dmg vs pierceable objects than it would vs a normal one
    readonly stonePiercing?: boolean
    readonly iceMultiplier?: number
    readonly swingSound: string
    readonly stopSound?: string
    readonly radius: number
    readonly offset: Vector
    readonly cooldown: number
    readonly maxTargets: number
    readonly reskins?: string[]
    readonly fists?: InventoryItemDefinition["fists"] & {
        readonly animationDuration: number
        readonly randomFist?: boolean
        readonly noLeftFistMovement?: boolean
    }
    readonly image?: {
        readonly position: Vector
        readonly usePosition: Vector
        readonly center?:Vector
        // no relation to the ZIndexes enum
        readonly zIndex: number
        readonly angle?: number
        readonly useAngle?: number
        readonly xConstant?: number
        readonly lootScale?: number
        readonly separateWorldImage?: boolean
        readonly animated?: boolean
    }
    readonly justVisual:boolean
    readonly damageDelay:number|number[]
    readonly keyframesSpeed:number
    readonly keyframes?: {
        readonly animationDuration: number
        readonly fist:InventoryItemDefinition["fists"]
        readonly ease?:EasingFunction
        readonly image?:{
            readonly position: Vector
            readonly zIndex?: number
            readonly angle?: number
            readonly scale?: number
        }
    }[]
    readonly fireMode: FireMode
} & ({
    readonly rotationalAnimation: true
} | {
    readonly rotationalAnimation?: false
    readonly fists: {
        readonly useLeft: Vector
        readonly useRight: Vector
    }
});
const MeleeDefaultAnims:Record<string,MeleeDefinition["keyframes"]>={
    swing:[
        {
            animationDuration: 140,
            fist:{
                left: Vec.create(40, -25),
                right: Vec.create(40, 15)
            },
            image: {
                position: Vec.create(40, 0),
                angle: 90,
            },
        },
        {
            animationDuration: 100,
            fist:{
                left: Vec.create(50, 15),
                right: Vec.create(20, 45)
            },
            image:{
                position: Vec.create(20, 45),
                angle: 150
            },
            ease:EaseFunctions.quadraticInOut
        },
        {
            animationDuration: 95,
            fist:{
                left: Vec.create(10, -60),
                right: Vec.create(50, -35)
            },
            image:{
                position: Vec.create(50, -35),
                angle: 30
            },
            ease:EaseFunctions.sineIn
        },
    ],
    bat:[
        {
            animationDuration: 100,
            fist:{
                left: Vec.create(10, -45),
                right: Vec.create(20, -40)
            },
            image:{
                position: Vec.create(20, -40),
                angle: -140,
            },
        },
        {
            animationDuration: 100,
            fist:{
                left: Vec.create(-10, -50),
                right: Vec.create(10, -45)
            },
            image:{
                position: Vec.create(10, -45),
                angle: -180,
            },
        },
        {
            animationDuration: 100,
            fist:{
                left: Vec.create(55, 5),
                right: Vec.create(75, 0)
            },
            image:{
                position: Vec.create(55, 5),
                angle: 30,
            },
        },
    ]
}

export const DEFAULT_HAND_RIGGING = Object.freeze({
    left: Vec.create(38, -35),
    right: Vec.create(38, 35)
}) as InventoryItemDefinition["fists"] & object;

export const Melees = ObjectDefinitions.withDefault<MeleeDefinition>()(
    "Melees",
    {
        itemType: ItemType.Melee,
        noDrop: false,
        killstreak: false,
        speedMultiplier: 1,
        swingSound: "swing",
        justVisual:false,
        iceMultiplier: 0.01,
        maxTargets: 1,
        damageDelay:50,
        image: {
            zIndex: 1
        },
        fireMode: FireMode.Single,
        keyframesSpeed:1,
        keyframes:[],
    },
    () => [
        {
            idString: "fists",
            name: "Fists",
            damage: 23,
            obstacleMultiplier: 1,
            iceMultiplier: 0.01,
            radius: 1.5,
            offset: Vec.create(2.5, 0),
            cooldown: 250,
            noDrop: true,
            fists: {
                animationDuration: 125,
                randomFist: true,
                ...DEFAULT_HAND_RIGGING,
                useLeft: Vec.create(75, -10),
                useRight: Vec.create(75, 10)
            },
            image: undefined
        },
        {
            idString: "baseball_bat",
            name: "Baseball Bat",
            swingSound: "heavy_swing",
            damage: 34,
            obstacleMultiplier: 1.5,
            radius: 5,
            offset: Vec.create(3, -2),
            cooldown: 400,
            damageDelay:250,
            fists: {
                animationDuration: 150,
                left: Vec.create(10, -45),
                right: Vec.create(20, -40),
                useLeft: Vec.create(28, -15),
                useRight: Vec.create(50, -15)
            },
            image: {
                usePosition: Vec.create(115, -14),
                position: Vec.create(20, -40),
                angle: -140,
                useAngle: 0,
                lootScale: 0.55,
                center:Vec.create(-65,0)
            },
            keyframes:MeleeDefaultAnims.bat,
            keyframesSpeed:1.2
        },
        {
            idString: "feral_claws",
            name: "Feral Claws",
            damage: 20,
            obstacleMultiplier: 1,
            radius: 1.75,
            offset: Vec.create(2.5, 0),
            cooldown: 150,
            // noDrop: true,
            fists: {
                animationDuration: 100,
                randomFist: true,
                left: Vec.create(38, -35),
                right: Vec.create(38, 35),
                useLeft: Vec.create(75, -10),
                useRight: Vec.create(75, 10)
            },
            image: {
                position: Vec.create(42, 20),
                usePosition: Vec.create(80, -25),
                angle: 0,
                useAngle: 10,
                lootScale: 0.6
            }
        },
        {
            idString: "hatchet",
            name: "Hatchet",
            damage: 45,
            rotationalAnimation: true,
            obstacleMultiplier: 2,
            piercingMultiplier: 1.5,
            radius: 2,
            swingSound: "heavy_swing",
            offset: Vec.create(5.4, -0.5),
            cooldown: 350,
            fists: {
                animationDuration: 100,
                left: Vec.create(40, -25),
                right: Vec.create(40, 15)
            },
            image: {
                position: Vec.create(40, 0),
                angle: 90,
                lootScale: 0.6
            },
            keyframes:MeleeDefaultAnims.swing,
            damageDelay: 220,
        },
        {
            [inheritFrom]:"hatchet",
            idString: "zombie_hatchet",
            name: "Zombie Hatchet",
        },
        {
            idString: "fire_hatchet",
            name: "Fire Hatchet",
            damage: 50,
            rotationalAnimation: true,
            obstacleMultiplier: 2,
            piercingMultiplier: 2,
            iceMultiplier: 5,
            radius: 2.05,
            swingSound: "heavy_swing",
            offset: Vec.create(5.4, -0.5),
            cooldown: 420,
            fists: {
                animationDuration: 150,
                left: Vec.create(40, -25),
                right: Vec.create(40, 15)
            },
            image: {
                position: Vec.create(40, 0),
                angle: 90,
                useAngle: 65,
                lootScale: 0.7
            },
            damageDelay: 250,
            keyframes:MeleeDefaultAnims.swing,
            keyframesSpeed:1.05,
        },
        {
            idString: "halberd",
            name: "Halberd",
            damage: 70,
            rotationalAnimation: true,
            obstacleMultiplier: 2,
            piercingMultiplier: 2,
            iceMultiplier: 5,
            radius: 2.05,
            swingSound: "heavy_swing",
            offset: Vec.create(5.4, -0.5),
            cooldown: 500,
            fists: {
                animationDuration: 150,
                left: Vec.create(40, -25),
                right: Vec.create(40, 15)
            },
            image: {
                position: Vec.create(40, 0),
                angle: 90,
                useAngle: 65,
                lootScale: 0.7
            },
            damageDelay: 250,
            keyframes:MeleeDefaultAnims.swing,
            keyframesSpeed:1.15,
        },
        {
            idString: "crowbar",
            name: "Crowbar",
            swingSound: "heavy_swing",
            damage: 40,
            obstacleMultiplier: 2.2,
            piercingMultiplier: 2,
            radius: 2.58,
            offset: Vec.create(5.9, 1.7),
            cooldown: 560,
            fists: {
                animationDuration: 200,
                left: Vec.create(38, -35),
                right: Vec.create(38, 35),
                useLeft: Vec.create(38, -35),
                useRight: Vec.create(100, 35)
            },
            image: {
                position: Vec.create(31, 41),
                usePosition: Vec.create(110, 33),
                angle: 135,
                useAngle: -5,
                lootScale: 0.65
            },
            reskins: ["winter"]
        },
        {
            idString: "sickle",
            name: "Sickle",
            damage: 33,
            swingSound: "soft_swing",
            obstacleMultiplier: 1.3,
            radius: 2.7,
            offset: Vec.create(4, 0),
            cooldown: 400,
            rotationalAnimation: true,
            //  fireMode: FireMode.Auto, - todo
            fists: {
                animationDuration: 150,
                left: Vec.create(29, -39),
                right: Vec.create(44, 35),
                noLeftFistMovement: true
            },
            image: {
                position: Vec.create(62, 64),
                angle: 62,
                useAngle: 0,
                lootScale: 0.85,
                xConstant: 85
            },
            reskins: ["winter"]
        },
        {
            idString: "maul",
            name: "Maul",
            damage: 60,
            iceMultiplier: 5,
            rotationalAnimation: true,
            swingSound: "heavy_swing",
            obstacleMultiplier: 2,
            stonePiercing: true,
            piercingMultiplier: 1,
            radius: 2.7,
            offset: Vec.create(5.4, -0.5),
            cooldown: 500,
            fists: {
                animationDuration: 150,
                left: Vec.create(40, -25),
                right: Vec.create(40, 15)
            },
            image: {
                position: Vec.create(40, 0),
                angle: 90,
                useAngle: 65,
                lootScale: 0.6
            },
            damageDelay: 260,
            keyframes:MeleeDefaultAnims.swing,
            keyframesSpeed:1.25,
        },
        {
            idString: "steelfang",
            name: "Steelfang",
            devItem: true,
            damage: 40,
            noDrop: true,
            stonePiercing: true,
            obstacleMultiplier: 1,
            piercingMultiplier: 1,
            radius: 2.7,
            offset: Vec.create(3.1, 0.9),
            cooldown: 200,
            fists: {
                animationDuration: 150,
                left: Vec.create(38, -35),
                right: Vec.create(30, 40),
                useLeft: Vec.create(35, -40),
                useRight: Vec.create(75, -20)
            },
            image: {
                position: Vec.create(55, 55),
                usePosition: Vec.create(80, -25),
                angle: -120,
                useAngle: -800,
                lootScale: 0.9
            },
            wearerAttributes: {
                passive: {
                    speedBoost: 1.1
                }
            }
        },
        {
            idString: "gas_can",
            name: "Gas Can",
            damage: 26,
            obstacleMultiplier: 1,
            radius: 1.75,
            offset: Vec.create(3.1, 0.5),
            cooldown: 250,
            image: {
                position: Vec.create(54, 35),
                usePosition: Vec.create(91, 10),
                useAngle: 0,
                lootScale: 0.8,
                separateWorldImage: true
            },
            fists: {
                animationDuration: 125,
                left: Vec.create(38, -35),
                right: Vec.create(38, 35),
                useLeft: Vec.create(38, -35),
                useRight: Vec.create(75, 10)
            }
        },
        {
            idString: "heap_sword",
            name: "HE-AP sword",
            devItem: true,
            damage: 75,
            obstacleMultiplier: 2.5,
            piercingMultiplier: 1,
            killstreak: true,
            stonePiercing: true,
            radius: 4,
            offset: Vec.create(5, 0),
            cooldown: 300,
            maxTargets: Infinity,
            fists: {
                animationDuration: 150,
                left: Vec.create(38, -35),
                right: Vec.create(38, 35),
                useLeft: Vec.create(38, -35),
                useRight: Vec.create(120, 20)
            },
            image: {
                position: Vec.create(102, 35),
                usePosition: Vec.create(140, -30),
                angle: 5,
                useAngle: -20,
                lootScale: 0.6
            }
        },
        {
            idString: "ice_pick",
            name: "Ice Pick",
            swingSound: "heavy_swing",
            damage: 35,
            obstacleMultiplier: 1.9,
            piercingMultiplier: 1,
            iceMultiplier: 5,
            radius: 2.8,
            offset: Vec.create(5.4, -0.5),
            cooldown: 420,
            rotationalAnimation: true,
            fists: {
                animationDuration: 150,
                left: Vec.create(40, -30),
                right: Vec.create(40, 10)
            },
            image: {
                position: Vec.create(47, 25),
                angle: 90,
                useAngle: 65,
                lootScale: 0.6
            },
            damageDelay: 250,
            keyframes:MeleeDefaultAnims.swing,
            keyframesSpeed:1.05,
        },
        {
            idString: "seax",
            name: "Seax",
            damage: 45,
            swingSound: "heavy_swing",
            obstacleMultiplier: 1.5,
            radius: 2.7,
            offset: Vec.create(5.4, -0.5),
            cooldown: 410,
            fists: {
                animationDuration: 150,
                left: Vec.create(38, -35),
                right: Vec.create(38, 35),
                useLeft: Vec.create(38, -35),
                useRight: Vec.create(95, 20)
            },
            image: {
                position: Vec.create(80, 25),
                usePosition: Vec.create(123, -13),
                angle: -15,
                useAngle: 0,
                lootScale: 0.7
            },
        },
        {
            idString: "falchion",
            name: "Falchion",
            damage: 41,
            swingSound: "soft_swing",
            obstacleMultiplier: 1.1,
            radius: 5.5,
            // maxTargets: Infinity, - TODO: It must hit multiple targets at once, however enabling this causes melee through wall bug to appear
            offset: Vec.create(4, 0),
            rotationalAnimation: true,
            piercingMultiplier: 0.95,
            cooldown: 650,
            fists: {
                left: Vec.create(-10, -50),
                right: Vec.create(10, -45)
            },
            image: {
                position: Vec.create(10, -45),
                lootScale: 0.6,
                angle: -180,
                zIndex:3,
                center:Vec.create(-55,-10)
            },
            damageDelay: 350,
            keyframes:[
                {
                    animationDuration: 50, //50
                    fist:{
                        left: Vec.create(-10, -50),
                        right: Vec.create(10, -45)
                    },
                    image:{
                        position: Vec.create(-30, -30),
                        angle: -150
                    }
                },
                {
                    animationDuration: 100, //50
                    fist:{
                        left: Vec.create(50, 5),
                        right: Vec.create(40, 20)
                    },
                    image:{
                        position: Vec.create(20, -15),
                        angle: -55
                    }
                },
                {
                    animationDuration: 100, //50
                    fist:{
                        left: Vec.create(30, 40),
                        right: Vec.create(5, 50)
                    },
                    image:{
                        position: Vec.create(30, 0),
                        angle: 10
                    }
                },
                {
                    animationDuration: 150, //50
                    fist:{
                        left: Vec.create(-10, -50),
                        right: Vec.create(10, -45)
                    },
                    image:{
                        position: Vec.create(-30, -30),
                        angle: -150
                    }
                }
            ],
            keyframesSpeed:1,
        },
        {
            idString: "chainsaw",
            name: "Chain Saw",
            devItem: true,
            damage: 25,
            fireMode: FireMode.Auto,
            obstacleMultiplier: 2,
            piercingMultiplier: 2,
            radius: 2.7,
            swingSound: "chainsaw",
            stopSound: "chainsaw_stop",
            offset: Vec.create(6.8, 0.5),
            cooldown: 0,
            fists: {
                animationDuration: 0,
                left: Vec.create(61, 10),
                right: Vec.create(35, 70),
                useLeft: Vec.create(57, 10),
                useRight: Vec.create(31, 70)
            },
            image: {
                position: Vec.create(106, 27),
                usePosition: Vec.create(106, 27),
                angle: 10,
                useAngle: 10,
                lootScale: 0.5,
                animated: true
            }
        },
        //Originals
        {
            idString: "battlesaw",
            name: "Battlesaw",
            damage: 45,
            stonePiercing: true,
            obstacleMultiplier: 1,
            piercingMultiplier: 1,
            radius: 3,
            offset: Vec.create(3.1, 0.9),
            cooldown: 765,
            fists: {
                animationDuration: 150,
                left: Vec.create(38, -35),
                right: Vec.create(7,45),
            },
            image: {
                position: Vec.create(7,45),
                usePosition: Vec.create(50,50),
                angle: 30,
                center:Vec.create(-30,4),
                useAngle: 80,
                zIndex:3,
                lootScale: 0.9
            },
            damageDelay:[
                170,
                370
            ],
            keyframes:[
                //Rest
                {
                    animationDuration:300,
                    fist:{
                        left:DEFAULT_HAND_RIGGING.left,
                        right:Vec.create(7,45)
                    },
                    image:{
                        angle:30,
                        zIndex:3,
                        scale:1.4,
                        position:Vec.create(7,45)
                    }
                },
                //Preparing
                {
                    animationDuration:90,
                    fist:{
                        left:DEFAULT_HAND_RIGGING.left,
                        right:Vec.create(7,50)
                    },
                    image:{
                        angle:110,
                        position:Vec.create(7,45)
                    }
                },
                {
                    animationDuration:50,
                    fist:{
                        left:DEFAULT_HAND_RIGGING.left,
                        right:Vec.create(7,50)
                    },
                    image:{
                        angle:100,
                        position:Vec.create(7,50)
                    }
                },
                //Attacking
                {
                    animationDuration:130,
                    fist:{
                        left:DEFAULT_HAND_RIGGING.left,
                        right:Vec.create(80,-30)
                    },
                    image:{
                        angle:-40,
                        position:Vec.create(80,-30)
                    }
                },
                {
                    animationDuration:160,
                    fist:{
                        left:DEFAULT_HAND_RIGGING.left,
                        right:Vec.create(90,-20)
                    },
                    image:{
                        angle:-40,
                        position:Vec.create(90,-20)
                    }
                },
                //Returning
                {
                    animationDuration:50,
                    fist:{
                        left:DEFAULT_HAND_RIGGING.left,
                        right:Vec.create(-20,45)
                    },
                    image:{
                        angle:20,
                        zIndex:3,
                        position:Vec.create(-20,45)
                    }
                },
            ],
            keyframesSpeed:1,
        },
        //Visuals
        {
            [inheritFrom]:"fists",
            idString: "m9_bayonet",
            name: "M9 Bayonet",
            justVisual:true,
            noDrop:false,
            damage:30,
            cooldown:200,
            fists: {
                animationDuration: 90,
                left: DEFAULT_HAND_RIGGING.left,
                right: DEFAULT_HAND_RIGGING.right,
                randomFist:false,
                useLeft: DEFAULT_HAND_RIGGING.left,
                useRight: Vec.create(75, 10)
            },
            image: {
                position: DEFAULT_HAND_RIGGING.right,
                usePosition: Vec.create(75, 10),
                center:Vec.create(-23,0),
                angle: -20,
                useAngle: -80,
                lootScale: 0.9
            },
        },
        {
            idString: "kbar",
            name: "K-bar",
            swingSound: "soft_swing",
            damage: 25,
            obstacleMultiplier: 1.25,
            radius: 2.7,
            iceMultiplier: 0.1,
            offset: Vec.create(3.1, 0.9),
            cooldown: 225,
            fists: {
                animationDuration: 100,
                left: DEFAULT_HAND_RIGGING.left,
                right: DEFAULT_HAND_RIGGING.right,
                useLeft: DEFAULT_HAND_RIGGING.left,
                useRight: Vec.create(75, 10)
            },
            image: {
                position: DEFAULT_HAND_RIGGING.right,
                usePosition: Vec.create(75, 10),
                center:Vec.create(-23,0),
                angle: 15,
                useAngle: -70,
                lootScale: 0.8
            }
        },
    ]
);
