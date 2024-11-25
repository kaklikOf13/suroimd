import { Armors } from "@common/definitions/armors";
import { GamePlugin } from "../pluginManager";
import { Backpacks } from "@common/definitions/backpacks";
import { type Player } from "../objects/player";
import { pickRandomInArray } from "@common/utils/random";
import { PerkIds, Perks } from "@common/definitions/perks";
import { Guns } from "@common/definitions/guns";
import { GunItem } from "../inventory/gunItem";
import { Skins } from "@common/definitions/skins";

export const startsWithD={
    equipaments:{
        "vest":"tactical_vest",
        "helmet":"tactical_helmet",
        "backpack":"tactical_pack",
        "infinityAmmo":true,
        
        "gun1":"",
        "gun2":"",
        "melee":"",

        "canDrop":true,
        "skin":"",
        "metalicBody":false,

        "perks":[] as PerkIds[],
    },
    group:-1,
    monster:0,
    adrenaline:100,
    maxHealth:-1,
    size:-1,
    dropAll:false,
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
        if(startsWith.monster<=0){
            this.on("player_did_join", ({ player }) => {
                this.giveTo(player,startsWith)
            });
        }else{
            this.on("game_started",(g)=>{
                for(let i=0;i<startsWith.monster;i++){
                    const p=pickRandomInArray(Array.from(g.livingPlayers.values()))
                    this.giveTo(p,startsWith)
                }
            })
        }
    }
    protected giveTo(player:Player,startsWith:typeof startsWithD){
        if(startsWith.dropAll){
            player.dropAll()
        }

        if(startsWith.equipaments){
            if(startsWith.equipaments.vest){
                player.inventory.vest=Armors.fromStringSafe(startsWith.equipaments.vest)
            }
            if(startsWith.equipaments.helmet){
                player.inventory.helmet=Armors.fromStringSafe(startsWith.equipaments.helmet)
            }
            if(startsWith.equipaments.backpack&&Backpacks.fromStringSafe(startsWith.equipaments.backpack)){
                player.inventory.backpack=Backpacks.fromString(startsWith.equipaments.backpack)
            }
            if(startsWith.equipaments.infinityAmmo){
                player.infinityAmmo=true
            }
            if(startsWith.equipaments.metalicBody){
                player.metalicBody=true
            }
            player.canDrop=startsWith.equipaments.canDrop===undefined?true:startsWith.equipaments.canDrop
            if(startsWith.equipaments.gun1&&Guns.fromStringSafe(startsWith.equipaments.gun1)){
                player.inventory.replaceWeapon(0,startsWith.equipaments.gun1);
                (player.inventory.weapons[0] as GunItem).ammo=(player.inventory.weapons[0] as GunItem).definition.capacity
            }
            if(startsWith.equipaments.gun2&&Guns.fromStringSafe(startsWith.equipaments.gun2)){
                player.inventory.replaceWeapon(1,startsWith.equipaments.gun2);
                (player.inventory.weapons[1] as GunItem).ammo=(player.inventory.weapons[1] as GunItem).definition.capacity
            }
            if(startsWith.equipaments.melee&&Guns.fromStringSafe(startsWith.equipaments.melee)){
                player.inventory.replaceWeapon(2,startsWith.equipaments.melee)
            }

            if(startsWith.equipaments.perks){
                for(const v of startsWith.equipaments.perks){
                    player.perks.addPerk(Perks.fromString(v))
                }
            }

            if(Skins.hasString(startsWith.equipaments.skin)){
                player.loadout.skin=Skins.fromString(startsWith.equipaments.skin)
            }
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
        player.canDespawn=false
        player.invulnerable=false
        //Dirty
        player.setDirty()
        for(const k of Object.keys(player.dirty)){
            player.dirty[k as keyof typeof player.dirty]=true
        }
    }
}
