import { GameConstants } from "@common/constants";
import { Obstacles } from "@common/definitions/obstacles";
import { PerkData, PerkIds, type PerkDefinition } from "@common/definitions/perks";
import { Skins } from "@common/definitions/loadout/skins";
import { PerkManager } from "@common/utils/perkManager";
import { weightedRandom } from "@common/utils/random";
import { type Player } from "../objects/player";
import { GunItem } from "./gunItem";

export type UpdatablePerkDefinition = PerkDefinition & { readonly updateInterval: number };

export class ServerPerkManager extends PerkManager {
    private readonly _selfData: Record<string, unknown> = {};

    readonly fromRoles:PerkIds[]=[]
    constructor(
        readonly owner: Player,
        perks?: number | readonly PerkDefinition[]
    ) {
        super(perks);
    }

    /**
     * Adds a perk to this manager
     * @param perk The perk to add
     * @returns Whether the perk was already present (and thus nothing has changed)
     */
    override addPerk(perk: PerkDefinition,fromRole=false): boolean {
        const idString = perk.idString;
        const owner = this.owner;
        const absent = super.addPerk(perk);
        if(fromRole)this.fromRoles.push(perk.idString)

        if ("updateInterval" in perk) {
            (owner.perkUpdateMap ??= new Map<UpdatablePerkDefinition, number>())
                .set(perk as UpdatablePerkDefinition, owner.game.now);
        }

        if (absent) {
            // ! evil starts here
            // some perks need to perform setup when added
            switch (idString) {
                case PerkIds.ExtendedMags: {
                    const weapons = owner.inventory.weapons;
                    const maxWeapons = GameConstants.player.maxWeapons;
                    for (let i = 0; i < maxWeapons; i++) {
                        const weapon = weapons[i];

                        if (!(weapon instanceof GunItem)) continue;

                        const def = weapon.definition;

                        if (def.extendedCapacity === undefined) continue;

                        const extra = weapon.ammo - def.extendedCapacity;
                        if (extra > 0) {
                            // firepower is anti-boosting this weapon, we need to shave the extra rounds off
                            weapon.ammo = def.extendedCapacity;
                            owner.inventory.giveItem(def.ammoType, extra);
                        }
                    }
                    break;
                }
            }
            // ! evil ends here
        }

        owner.dirty.perks = true;
        return absent;
    }

    /**
     * Removes a perk from this manager
     * @param perk The perk to remove
     * @returns Whether the perk was present (and therefore removed, as opposed
     * to not being removed due to not being present to begin with)
     */
    override removePerk(perk: PerkDefinition): boolean {
        const idString = perk.idString;
        const owner = this.owner;

        if ("updateInterval" in perk) {
            owner.perkUpdateMap?.delete(perk as UpdatablePerkDefinition);
        }

        const has = super.removePerk(perk);

        if (has) {
            const i=this.fromRoles.indexOf(idString)
            if(i!=-1){
                this.fromRoles.splice(i,1)
            }
            // ! evil starts here
            // some perks need to perform cleanup on removal
            switch (idString) {
                case PerkIds.ExtendedMags: {
                    const weapons = owner.inventory.weapons;
                    const maxWeapons = GameConstants.player.maxWeapons;
                    for (let i = 0; i < maxWeapons; i++) {
                        const weapon = weapons[i];

                        if (!(weapon instanceof GunItem)) continue;

                        const def = weapon.definition;
                        const extra = weapon.ammo - def.capacity;
                        if (extra > 0) {
                            // firepower boosted this weapon, we need to shave the extra rounds off
                            weapon.ammo = def.capacity;
                            owner.inventory.giveItem(def.ammoType, extra);
                        }
                    }
                    break;
                }
            }
            // ! evil ends here
        }

        owner.dirty.perks ||= has;
        return has;
    }
}
