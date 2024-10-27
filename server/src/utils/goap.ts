import { Player } from "../objects";
import { GunItem } from "../inventory/gunItem";
import { PlayerInputData } from "@common/packets";
import { Vec } from "@common/utils/vector";
import { randomVector } from "@common/utils/random";
import { GoapTeam } from "../team";
import { Numeric } from "@common/utils/math";
import { InputActions } from "@common/constants";

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
    goalScore: (goal: GOAPGoal, agent: GoapAgent) => number;
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
        subgoal:(agent)=>{
            return (agent.player.inventory.activeWeapon instanceof GunItem &&
            agent.player.inventory.activeWeapon.ammo === 0)?goapGoals.reloadAll:undefined
        },
        name: "shot on player",
        priority: 10,
    },
    {
        preconditions: (agent) => {
            return (
                agent.player.inventory.activeWeapon instanceof GunItem &&
                agent.player.inventory.activeWeapon.ammo < agent.player.inventory.activeWeapon.definition.capacity
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
        name: "reload part",
        priority: 1,
    },
];

export const goapGoals: Record<string,GOAPGoal> = {
    "disappearWithAlert":{
        priority: 10,
        id: "disappearWithAlert",
        score: (input, agent) => {
            let score = 0;
            if (input.attacking) {
                if (agent.player.inventory.activeWeapon instanceof GunItem) {
                    score += (agent.player.inventory.activeWeapon.ammo * agent.player.inventory.activeWeapon.definition.ballistics.damage) / 2;
                }
            }
            return score;
        },
        goalScore: (goal, agent) => {
            switch (goal.id) {
                case "reloadAll":
                    return agent.player.inventory.activeWeapon instanceof GunItem ? (agent.player.inventory.activeWeapon.definition.capacity - agent.player.inventory.activeWeapon.ammo) : 0;
            }
            return 0;
        },
    },
    "reloadAll":{
        priority: 5,
        id: "reloadPart",
        score: (input, agent) => {
            return input.actions.some(action => action.type === InputActions.Reload) ? Infinity : 0;
        },
        goalScore: (goal, agent) => {
            return agent.player.inventory.activeWeapon instanceof GunItem ? (agent.player.inventory.activeWeapon.definition.capacity - agent.player.inventory.activeWeapon.ammo) : 0;
        },
    },
    // Add more goals as needed
};

export class GoapAgent {
    player: Player;
    target: Player | undefined;
    aimAccurrence: number = 5;
    alert: number = 0; // Enemy knows there is a player in place
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

        if (this.target && this.currentGoals) {
            let bestAction: GOAPAction | null = null;
            let bestScore = -Infinity;
            let exec: PlayerInputData | null = null;

            for (const action of goapActions) {
                if (action.preconditions(this)) {
                    const exe = action.execute(this);
                    const score = action.priority * (this.currentGoal.score(exe, this));

                    if (score > bestScore) {
                        bestScore = score;
                        bestAction = action;
                        exec = exe;
                        
                    }

                    // Check for subgoals
                    if (action.subgoal) {
                        const subgoal = action.subgoal(this);
                        if(!subgoal){
                            continue
                        }
                        const subgoalScore = subgoal.goalScore(subgoal, this);
                        if (subgoalScore > bestScore) {
                            bestScore = subgoalScore;
                            bestAction = action;
                            exec = exe; // Re-use execution from the main action
                        }
                    }
                }
            }

            if (exec) {
                this.player.processInputs(exec);
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
