import { GunDefinition, Guns } from "@common/definitions/guns";
import { MeleeDefinition, Melees } from "@common/definitions/melees";
import { ThrowableDefinition, Throwables } from "@common/definitions/throwables";
import { ItemType } from "@common/utils/objectDefinitions";
import { pickRandomInArray } from "@common/utils/random";

import { GunItem } from "../inventory/gunItem";
import { Player } from "../objects/player";
import { GamePlugin } from "../pluginManager";
import { Numeric } from "../../../common/src/utils/math";


export const weaponSwapArgsD={
    obstacles:[] as string[],
    selectableGuns: Guns.definitions.filter(g => !g.killstreak && !g.wearerAttributes) as (string|GunDefinition)[],
    selectableMelees: Melees.definitions.filter(g => !g.killstreak && !g.wearerAttributes) as (string|MeleeDefinition)[],
    selectableThrowables: Throwables.definitions.filter(g => !g.killstreak && !g.wearerAttributes) as (string|ThrowableDefinition)[],
    blackList:[] as string[]
}

/**
 * Plugin that swaps the player weapon when the player gets a kill
 */
export class WeaponSwapPlugin extends GamePlugin {
    protected override initListeners(params:typeof weaponSwapArgsD): void {
        const args=params??weaponSwapArgsD
        this.on("obstacle_did_destroy",({source,obstacle})=>{
            if(!args.obstacles.includes(obstacle.definition.idString))return;
            if (!(source instanceof Player)) return;
            this.switchWeapon(source,args)
        })
        this.on("player_will_die", ({ source }) => {
            if (!(source instanceof Player)) return;
            this.switchWeapon(source,args)
        });
    }
    switchWeapon(source:Player,args:typeof weaponSwapArgsD){
        const inventory = source.inventory;
        const index = source.activeItemIndex;

        let item: GunDefinition | MeleeDefinition | ThrowableDefinition;
        const itemType = source.activeItemDefinition.itemType;
        if(args.blackList.includes(source.activeItemDefinition.idString)){
            return
        }
        switch (itemType) {
            case ItemType.Gun: {
                const r=pickRandomInArray(args.selectableGuns)
                const gun = typeof r==="string"?Guns.fromString(r):r;
                item = gun;
                const { ammoType } = gun;
                if (gun.ammoSpawnAmount) {
                    inventory.giveItem(ammoType,gun.ammoSpawnAmount)
                }
                source.sendEmote(gun)
                break;
            }
            case ItemType.Melee: {
                const r=pickRandomInArray(args.selectableMelees)
                item = typeof r==="string"?Melees.fromString(r):r;
                source.sendEmote(item)
                break;
            }
            case ItemType.Throwable: {
                return
            }
        }

        inventory.replaceWeapon(index, item);

        if (source.activeItem instanceof GunItem) {
            source.activeItem.ammo = source.activeItem.definition.capacity;
        }

        source.dirtyUI()
        source.setDirty()
    }
}
