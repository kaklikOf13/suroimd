import { Perks, type PerkDefinition, type PerkNames } from "../definitions/perks";
import { type PerkCollection } from "../packets/updatePacket";

export class PerkManager implements PerkCollection {
    // this is a bitfield
    // change to bigint once perk count exceeds 30
    protected _perks = 0;

    has_infinitys:Record<string,boolean>={}

    constructor(
        perks?: number | readonly PerkDefinition[]
    ) {
        // @ts-expect-error we write terse code and stay winning
        if (typeof (this._perks = (perks ?? 0)) === "object") {
            this._perks = (perks as readonly PerkDefinition[])
                .map(({ idString }) => 1 << Perks.idStringToNumber[idString])
                .reduce((acc, cur) => acc + cur, 0);
        }
    }

    
    update_has_infinity():void{
        this.has_infinitys={}
        for(const p of this.asListExtended()){
            if(p.to_infinity){
                for(const kk of Object.keys(p.to_infinity)){
                    this.has_infinitys[kk]=p.to_infinity[kk]
                }
            }
        }
    }

    /**
     * Adds a perk to this manager
     * @param perk The perk to add
     * @returns Whether the perk was already present (and thus nothing has changed)
     */
    addPerk(perk: PerkDefinition | PerkNames): boolean {
        const idString = typeof perk === "object"
            ? perk.idString
            : perk;

        const n = 1 << Perks.idStringToNumber[idString];
        const absent = (this._perks & n) === 0;
        this._perks |= n;

        this.update_has_infinity()

        return absent;
    }

    hasPerk(perk: PerkDefinition | PerkNames): boolean {
        const idString = typeof perk === "object" ? perk.idString : perk;
        const ok=((this._perks & (1 << Perks.idStringToNumber[idString])) !== 0)
        if(!ok){
            for(const p of this.asList()){
                if(p.extends&&p.extends.includes(idString))return true
            }
        }
        return ok;
    }
    hasPerk2(perk: PerkDefinition | PerkNames): boolean {
        const idString = typeof perk === "object" ? perk.idString : perk;
        return ((this._perks & (1 << Perks.idStringToNumber[idString])) !== 0);
    }

    /**
     * Removes a perk from this manager
     * @param perk The perk to remove
     * @returns Whether the perk was present (and therefore removed, as opposed
     * to not being removed due to not being present to begin with)
     */
    removePerk(perk: PerkDefinition | PerkNames): boolean {
        const idString = typeof perk === "object" ? perk.idString : perk;
        const n = 1 << Perks.idStringToNumber[idString];
        const has = (this._perks & n) !== 0;
        this._perks &= ~n;

        return has;
    }

    ifPresent<Name extends PerkNames>(
        perk: Name | PerkDefinition & { readonly idString: Name },
        cb: (data: PerkDefinition & { readonly idString: Name }) => void
    ): void {
        if (this.hasPerk(perk)) {
            cb(Perks.reify(perk));
        }
    }

    map<Name extends PerkNames, U>(
        perk: Name | PerkDefinition & { readonly idString: Name },
        mapper: (data: PerkDefinition & { readonly idString: Name }) => U
    ): U | undefined {
        if (this.hasPerk(perk)) {
            return mapper(Perks.reify(perk));
        }
    }

    mapOrDefault<Name extends PerkNames, U>(
        perk: Name | PerkDefinition & { readonly idString: Name },
        mapper: (data: PerkDefinition & { readonly idString: Name }) => U,
        defaultValue: U
    ): U {
        if (this.hasPerk(perk)) {
            return mapper(Perks.reify(perk));
        }

        return defaultValue;
    }

    asBitfield(): number {
        return this._perks;
    }

    asList(): PerkDefinition[] {
        return Perks.definitions.filter((_, i) => (this._perks & (1 << i)) !== 0);
    }
    asListExtended(): PerkDefinition[] {
        const l1=Perks.definitions.filter((_, i) => (this._perks & (1 << i)) !== 0)
        const l2:PerkDefinition[]=[]
        for(const pp of l1){
            const adp=(def:PerkDefinition)=>{
                if(l2.includes(def))return
                if(def.extends){
                    for(const pp2 of def.extends){
                        adp(Perks.fromString(pp2))
                    }
                }
                l2.push(def)
            }
            adp(pp)
        }
        return [...l1,...l2]
    }

    [Symbol.iterator](): Iterator<PerkDefinition> {
        return this.asList()[Symbol.iterator]();
    }
}
