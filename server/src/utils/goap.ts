import { Player } from "../objects";
import { GunItem } from "../inventory/gunItem";
import { PlayerInputData } from "@common/packets";
import { Vec } from "@common/utils/vector";
import { randomVector } from "@common/utils/random";
import { GoapTeam } from "../team";
import { Numeric } from "@common/utils/math";
import { InputActions } from "@common/constants";
import { MeleeItem } from "../inventory/meleeItem";

export interface GOAPAction {
    preconditions: (agent: GoapAgent) => boolean;
    execute: (agent: GoapAgent) => PlayerInputData;
    subgoal?: (agent: GoapAgent) => GOAPGoal | undefined;
    priority: number;
    name: string;
}

export interface GOAPGoal {
    priority: number;
    id: string;
    score: (input: PlayerInputData, agent: GoapAgent) => number;
    completed:(agent:GoapAgent)=>boolean;
}

export const goapActions: GOAPAction[] = [
    {
        preconditions: (agent) => {
            return (
                agent.player.inventory.activeWeapon instanceof GunItem &&
                agent.player.inventory.activeWeapon.ammo > 0
            );
        },
        execute: (agent) => {
            const tp = Vec.add(agent.target!.position, randomVector(-agent.aimAccurrence, -agent.aimAccurrence, agent.aimAccurrence, agent.aimAccurrence));
            const dtp = Vec.sub(tp, agent.player.position);
            return {
                attacking:!agent.player.attacking,
                distanceToMouse: 1,
                rotation: Numeric.clamp(Numeric.lerp(agent.player.rotation, Math.atan2(dtp.y, dtp.x), agent.aimSpeed * (Math.random()+.5)), -Math.PI, Math.PI),
                actions: [],
                isMobile: false,
                movement: {
                    down: false,
                    left: false,
                    right: false,
                    up: false
                },
                turning: true,
            } satisfies PlayerInputData;
        },
        name: "shot on player",
        priority: 10,
    },
    {
        preconditions: (agent) => {
            return (
                agent.player.inventory.activeWeapon instanceof GunItem &&
                agent.player.inventory.activeWeapon.ammo<agent.player.inventory.activeWeapon.definition.capacity
            );
        },
        execute: (agent) => {
            return {
                attacking: false,
                distanceToMouse: 1,
                rotation: agent.player.rotation,
                actions: [{
                    type: InputActions.Reload
                }],
                isMobile: false,
                movement: {
                    down: false,
                    left: false,
                    right: false,
                    up: false
                },
                turning: false,
            } satisfies PlayerInputData;
        },
        subgoal:(agent)=>{
            return agent.player.inventory.activeWeapon instanceof GunItem &&
            agent.player.inventory.activeWeapon.ammo===0?goapGoals["reloadAll"]:undefined
        },
        name: "reload",
        priority: 5,
    },
];

export const goapGoals: Record<string,GOAPGoal> = {
    "disappearWithAlert":{
        priority: 10,
        id: "disappearWithAlert",
        score: (input, agent) => {
            return input.attacking?10:5
        },
        completed:(agent)=>{
            return agent.alert==0
        }
    },
    "reloadAll":{
        priority: 5,
        id: "reloadAll",
        score: (input, agent) => {
            return input.actions.find((v,_i,_o)=>{
                return v.type===InputActions.Reload?v:undefined
            }) ? Infinity : 0;
        },
        completed:(agent)=>{
            return (agent.player.inventory.activeWeapon instanceof GunItem&&agent.player.inventory.activeWeapon.ammo===agent.player.inventory.activeWeapon.definition.capacity)||agent.player.inventory.activeWeapon instanceof MeleeItem
        }
    },
    // Add more goals as needed
};

export class GoapAgent {
    player: Player;
    target: Player | undefined;
    aimAccurrence: number = 5;
    alert: number = 1; // Enemy knows there is a player in place
    goals: GOAPGoal[]=[]; // Use an array to hold multiple goals
    viewDistance: number = 100;
    aimSpeed: number = 0.05;

    constructor(player: Player) {
        this.player = player;
        this.goals.push(goapGoals["disappearWithAlert"])
    }

    update() {
        if (this.player.team) {
            this.alert = (this.player.team as GoapTeam).alert; // Get Team Alert
        }

        if (this.target && this.target.dead) {
            this.target = undefined;
        }

        if (this.target && this.goals.length>0) {
            const goal=this.goals[this.goals.length-1]
            if(goal.completed(this)){
                this.goals.pop()
                return
            }
            let bestAction: GOAPAction | null = null;
            let bestScore = -Infinity;
            let exec: PlayerInputData | null = null;

            for (const action of goapActions) {
                if (action.preconditions(this)) {
                    const exe = action.execute(this);
                    const score = action.priority * (goal.score(exe, this));

                    if (score > bestScore) {
                        bestScore = score;
                        bestAction = action;
                        exec = exe;
                    }
                }
            }

            if (exec) {
                let sb=true
                // Check for subgoals
                if (bestAction!.subgoal) {
                    const subgoal = bestAction!.subgoal(this);
                    if(subgoal&&goal.id!==subgoal.id){
                        this.goals.push(subgoal)
                        sb=false
                    }
                }
                if(sb){
                    this.player.processInputs(exec);
                }
            }
        } else {
            this.player.processInputs({
                attacking: false,
                actions: [],
                distanceToMouse: 1,
                isMobile: false,
                movement: {
                    left: false,
                    down: false,
                    right: false,
                    up: false
                },
                rotation: this.player.rotation,
                turning: false
            });
        }
    }
}
