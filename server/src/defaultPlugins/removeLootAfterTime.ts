import { GamePlugin } from "../pluginManager";

/**
 * Plugin to toggle the player speed when sending an emote
 */
export class RemoveLootAfterTimePlugin extends GamePlugin {
    protected override initListeners(params:{delay:number}): void {
        const removeTime=(params?params.delay:19)*1000
        this.on("loot_did_generate", ({ loot }) => {
            loot.game.addTimeout(loot.game.removeLoot.bind(loot.game,loot),removeTime)
        });
    }
}
