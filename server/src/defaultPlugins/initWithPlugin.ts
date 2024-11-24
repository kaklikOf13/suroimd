import { Armors } from "@common/definitions/armors";
import { GamePlugin } from "../pluginManager";
import { Backpacks } from "@common/definitions/backpacks";

const startsWithD={
    equipaments:{
        "vest":"tactical_vest",
        "helmet":"tactical_helmet",
        "backpack":"tactical_pack",
        "infinityAmmo":true
    },
    adrenaline:100,
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
        this.on("player_did_join", ({ player }) => {
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
            }
            if(startsWith.adrenaline>0){
                player.adrenaline=startsWith.adrenaline
            }
            if(startsWith.items){
                for(const i of Object.keys(startsWith.items)){
                    player.inventory.items.setItem(i,(startsWith.items as Record<string,number>)[i])
                }
            }
        });
    }
}
