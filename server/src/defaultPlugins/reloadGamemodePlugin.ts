import { Config } from "../config";
import { GamePlugin } from "../pluginManager";

/**
 * Plugin to toggle the player speed when sending an emote
 */
export class ReloadGamemodePlugin extends GamePlugin {
    protected override initListeners(params:{delay:number}): void {
        const removeTime=(params?params.delay/2:40)*1000
        const maxRD=(params?params.delay:120)*1000
        let rd=maxRD
        this.on("loot_did_generate", ({ loot }) => {
            if(loot.game._started){
                loot.game.addTimeout(loot.game.removeLoot.bind(loot.game,loot),removeTime)
            }
        });
        this.on("game_tick",(g)=>{
            if(g._started){
                if(rd>0){
                    rd-=Config.tps
                }else{
                    rd=maxRD
                    this.game.gas.addAirdrop()
                    for(const o of g.map.deadObstacles){
                        if(o.fromMapgen){
                            o.revive()
                        }else{
                            g.map.deleteObstacle(o)
                        }
                    }
                }
            }
        })
    }
}
