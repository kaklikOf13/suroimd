import { Armors } from "@common/definitions/armors";
import { GamePlugin } from "../pluginManager";
import { Backpacks } from "@common/definitions/backpacks";
import { type Player } from "../objects/player";
import { pickRandomInArray } from "@common/utils/random";
import { PerkIds, Perks } from "@common/definitions/perks";
import { Guns } from "@common/definitions/guns";
import { GunItem } from "../inventory/gunItem";
import { Skins } from "@common/definitions/skins";
import { MapPing, MapPings } from "@common/definitions/mapPings";
import { type Game } from "../game";
import { Melees } from "@common/definitions/melees";

export const startsWithD={
    equipments:{
        "vest":"tactical_vest",
        "helmet":"tactical_helmet",
        "backpack":"tactical_pack",
        "infinityAmmo":true,
        
        "gun1":"" as (string|string[]),
        "gun2":"" as (string|string[]),
        "melee":"" as (string|string[]),

        "canDrop":true,
        "skin":"",
        "metalicBody":false,

        "perks":[] as (PerkIds|PerkIds[])[],

        "ping":"",
        "repeatPing":0
    },
    group:-1,
    needGroup:false,
    giveTo:0,
    adrenaline:100,
    maxHealth:-1,
    size:-1,
    startAfter:-1,
    dropAll:false,
    nameColor:undefined as (undefined|number),
    lockEnd:false,
    dropable:{} as Partial<Player["dropable"]>,
    items:{
        "gauze":15,
        "medikit":4,
        "cola":8,
        "tablets":4,
        "frag_grenade":6,
        "mirv_grenade":2,
        "smoke_grenade":13,

        "2x_scope":1,
        "4x_scope":1
    }
}

/**
 * Plugin to toggle the player speed when sending an emote
 */
export class InitWithPlugin extends GamePlugin {
    protected override initListeners(params:typeof startsWithD): void {
        const startsWith=params??startsWithD
        if(startsWith.giveTo<=0){
            this.on("player_did_join", ({ player }) => {
                if(player.isNpc)return;
                this.giveTo(player,startsWith)
            });
        }else if(startsWith.startAfter>=0){
            this.on("game_started",(g)=>{
                if(startsWith.lockEnd){
                    this.game.canEnd=false
                }
                if(startsWith.startAfter>0){
                    g.addTimeout(()=>{
                        let attempts=0
                        for(let i=0;i<startsWith.giveTo;i++){
                            const ret=this.giveToRandom(g,startsWith)
                            if(!ret){
                                attempts++
                                if(attempts>10){
                                    break
                                }
                                i--;
                                continue
                            }
                            attempts=0
                        }
                        this.game.canEnd=true
                    },startsWith.startAfter*1000)
                }else{
                    let attempts=0
                    console.log(attempts)
                    for(let i=0;i<startsWith.giveTo;i++){
                        const ret=this.giveToRandom(g,startsWith)
                        if(!ret){
                            attempts++
                            if(attempts>10){
                                break
                            }
                            i--;
                            continue
                        }
                        attempts=0
                    }
                    this.game.canEnd=true
                }
            })
        }else{
            this.on("game_started",(g)=>{
                let attempts=0
                for(let i=0;i<startsWith.giveTo;i++){
                    const ret=this.giveToRandom(g,startsWith)
                    if(!ret){
                        attempts++
                        if(attempts>10){
                            break
                        }
                        i--;
                        continue
                    }
                    attempts=0
                }
            })
        }
    }
    protected giveToRandom(g:Game,startsWith:typeof startsWithD):boolean{
        const p:Player=pickRandomInArray(Array.from(g.livingPlayers.values()))
        if(p.isNpc||p.disconnected||!p.rolable||(startsWith.needGroup&&p.groupID!==startsWith.group)){
            return false;
        }
        this.giveTo(p,startsWith)
        return true
    }
    protected giveTo(player:Player,startsWith:typeof startsWithD){
        if(!player){
            return
        }
        player.rolable=false
        if(startsWith.dropAll){
            player.dropAll()
        }

        if(startsWith.equipments){
            if(startsWith.equipments.vest){
                player.inventory.vest=Armors.fromStringSafe(startsWith.equipments.vest)
            }
            if(startsWith.equipments.helmet){
                player.inventory.helmet=Armors.fromStringSafe(startsWith.equipments.helmet)
            }
            if(startsWith.equipments.backpack&&Backpacks.fromStringSafe(startsWith.equipments.backpack)){
                player.inventory.backpack=Backpacks.fromString(startsWith.equipments.backpack)
            }
            if(startsWith.equipments.infinityAmmo){
                player.infinityAmmo=true
            }
            if(startsWith.equipments.metalicBody){
                player.metalicBody=true
            }
            if(startsWith.equipments.ping){
                const pinng=()=>{
                    if(player.dead||player.game.stopped)return
                    this.game.mapPings.push({
                        definition:MapPings.fromString<MapPing>(startsWith.equipments.ping),
                        position:player.position
                    })
                    if(startsWith.equipments.repeatPing){
                        player.game.addTimeout(pinng,startsWith.equipments.repeatPing*1000)
                    }
                }
                pinng()
            }
            player.canDrop=startsWith.equipments.canDrop===undefined?true:startsWith.equipments.canDrop
            const gun1=Guns.fromStringSafe(Array.isArray(startsWith.equipments.gun1)?pickRandomInArray(startsWith.equipments.gun1):startsWith.equipments.gun1)
            if(gun1){
                player.inventory.replaceWeapon(0,gun1);
                (player.inventory.weapons[0] as GunItem).ammo=gun1.capacity
            }
            const gun2=Guns.fromStringSafe(Array.isArray(startsWith.equipments.gun2)?pickRandomInArray(startsWith.equipments.gun2):startsWith.equipments.gun2)
            if(gun2){
                player.inventory.replaceWeapon(1,gun2);
                (player.inventory.weapons[1] as GunItem).ammo=gun2.capacity
            }
            const melee=Melees.fromStringSafe(Array.isArray(startsWith.equipments.melee)?pickRandomInArray(startsWith.equipments.melee):startsWith.equipments.melee)
            if(melee){
                player.inventory.replaceWeapon(2,melee);
            }

            if(startsWith.equipments.perks){
                for(const v of startsWith.equipments.perks){
                    player.perks.addPerk(Perks.fromString(typeof v === "object" ? pickRandomInArray(v):v))
                }
            }

            if(Skins.hasString(startsWith.equipments.skin)){
                player.canChangeSkin=false
                player.loadout.skin=Skins.fromString(startsWith.equipments.skin)
            }
        }
        if(startsWith.nameColor!==undefined){
            //@ts-ignore
            player.nameColor=startsWith.nameColor
            //@ts-ignore
            player.hasColor=true
        }
        if(startsWith.adrenaline>0){
            player.adrenaline=startsWith.adrenaline
        }
        if(startsWith.items){
            for(const i of Object.keys(startsWith.items)){
                player.inventory.items.setItem(i,(startsWith.items as Record<string,number>)[i])
            }
        }
        if(startsWith.group>=0){
            player.game.addPlayerIntoGroup(player,startsWith.group)
        }
        if(startsWith.maxHealth>0){
            player.maxHealthChange=startsWith.maxHealth
            player.updateAndApplyModifiers()
            player.health=player.maxHealth
        }
        if(startsWith.size>0){
            player.sizeChange=startsWith.size
        }
        for(const k of Object.keys(startsWith.dropable)){
            //@ts-ignore
            player.dropable[k]=startsWith.dropable[k]
        }
        player.canDespawn=false
        player.invulnerable=false
        //Dirty
        player.fullDirty()
    }
}
