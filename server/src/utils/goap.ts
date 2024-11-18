import { GunItem } from "../inventory/gunItem";
import { Vec, Vector } from "@common/utils/vector";
import { randomVector } from "@common/utils/random";
import { GoapTeam } from "../team";
import { Geometry, Numeric } from "@common/utils/math";
import { InputActions } from "@common/constants";
import { MeleeItem } from "../inventory/meleeItem";
import { RectangleHitbox } from "@common/utils/hitbox";
import { PlayerInputData } from "@common/packets/inputPacket";
import { GameObject } from "../objects/gameObject";
import { Player } from "../objects/player";
import { Building } from "../objects/building";

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
            };
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
//A*

function smoothRotation(agent: GoapAgent, target: Vector): number {
    const angleToTarget = Math.atan2(target.y - agent.player.position.y, target.x - agent.player.position.x);
    return Numeric.clamp(Numeric.lerp(agent.player.rotation, angleToTarget, 0.1), -Math.PI, Math.PI);
}

function maintainDistance(agent: GoapAgent, target: Vector, minDistance: number): Vector {
    const distance = Geometry.distance(agent.player.position, target);
    if (distance < minDistance) {
        const retreatVector = Vec.sub(agent.player.position, target);
        return Vec.add(agent.player.position, Vec.scale(Vec.normalize(retreatVector), minDistance));
    }
    return target;
}

export class GoapAgent {
    player: Player;
    target: Player | undefined;
    aimAccurrence: number = 5;
    alert: number = 1; // Enemy knows there is a player in place
    goals: GOAPGoal[]=[]; // Use an array to hold multiple goals
    viewDistance: number = 70;
    aimSpeed: number = 0.05;

    proctedBuild?:Building

    path:Vector[]=[]
    pathA:number=0

    get gotoTarget():Vector|undefined{
        return this._gotoTarget
    }
    set gotoTarget(dest:Vector){
        if(this.proctedBuild){
            //calcAStar(dest,this)
            this._gotoTarget=dest
            this.pathA=0
        }
    }

    input?:PlayerInputData

    private _gotoTarget?:Vector

    constructor(player: Player,projectBuilding?:Building) {
        this.player = player;
        this.proctedBuild=projectBuilding
        this.goals.push(goapGoals["disappearWithAlert"])
    }

    targetCheck(){
        const min=Vec.add(Vec.create(-this.viewDistance,-this.viewDistance),this.player.position)
        const max=Vec.add(Vec.create(this.viewDistance,this.viewDistance),this.player.position)
        const objs=this.player.game.grid.intersectsHitbox(new RectangleHitbox(min,max),this.player.layer)
        if(this.target===undefined){
            for(const obj of objs){
                if(this.player===obj||this.player.layer!==obj.layer)continue
                if(obj instanceof Player&&!obj.isNpc&&Geometry.distance(obj.position,this.player.position)<this.viewDistance){
                    let inter=false
                    for(const obj2 of objs){
                        if(obj===obj2||this.player.layer!==obj2.layer)continue
                        if((obj2.isObstacle||obj2.isBuilding)&&obj2.collidable&&obj2.hitbox?.intersectsLine(this.player.position,obj.position)){
                            inter=true
                        }
                    }
                    if(inter){
                        continue
                    }
                    this.target=obj
                    break
                }
            }
        }else{
            if(this.target.layer!==this.player.layer){
                this.target=undefined
                return
            }
            for(const obj of objs){
                if(obj===this.target||this.player.layer!==obj.layer)continue
                if((obj.isObstacle||obj.isBuilding)&&obj.collidable&&(obj.isObstacle&&(obj.definition.allowFlyover>1||(obj.isDoor&&obj.door?.isOpen))||!obj.isObstacle)&&obj.hitbox?.intersectsLine(this.player.position,obj.position)){
                    this.gotoTarget=this.target.position
                    this.target=undefined
                    break
                }
            }
        }
    }

    update() {
        if (this.player.team) {
            this.alert = (this.player.team as GoapTeam).alert; // Get Team Alert
        }

        if (this.target && this.target.dead) {
            this.target = undefined;
        }

        if (this.target && this.goals.length > 0) {
            const goal = this.goals[this.goals.length - 1];
            if (goal.completed(this)) {
                this.goals.pop();
                return;
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
                let subGoalActive = true;
                if (bestAction!.subgoal) {
                    const subgoal = bestAction!.subgoal(this);
                    if (subgoal && goal.id !== subgoal.id) {
                        this.goals.push(subgoal);
                        subGoalActive = false;
                    }
                }
                if (subGoalActive) {
                    this.input = exec;
                }
            }
        } else {
            this.input = {
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
                turning:true,
            };
        }
    
        if (this._gotoTarget) {
            const adjustedTarget = maintainDistance(this, this._gotoTarget, 5);
            if (Geometry.distance(this.player.position, adjustedTarget) < 2 || this.pathA >= this.path.length) {
                this._gotoTarget = undefined;
            } else if (Geometry.distance(this.player.position, this.path[this.pathA]) < 1) {
                this.pathA++;
            } else if (this.input) {
                const nextPos = this.path[this.pathA];
                const dx = nextPos.x - this.player.position.x;
                const dy = nextPos.y - this.player.position.y;
                this.input.movement.left = dx < -1;
                this.input.movement.right = dx > 1;
                this.input.movement.up = dy < -1;
                this.input.movement.down = dy > 1;
                
                this.input.turning=true
                this.input.rotation = smoothRotation(this, nextPos);
            }
        }
    
        if (this.input) {
            this.player.processInputs(this.input);
            this.input = undefined;
        }
    }
}
