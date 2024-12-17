import { GameConstants, GasState } from "@common/constants";
import { CircleHitbox } from "@common/utils/hitbox";
import { Geometry, Numeric } from "@common/utils/math";
import { MapObjectSpawnMode } from "@common/utils/objectDefinitions";
import { pickRandomInArray, randomBoolean, randomPointInsideCircle } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";
import { type Game } from "./game";
import { DefaultGasStages, GasStage } from "./data/gasStages";
import { GasMode } from "./data/gamemode";
export class Gas {
    stage = 0;
    state = GasState.Inactive;
    currentDuration = 0;
    countdownStart = 0;
    completionRatio = 0;

    oldPosition!: Vector;
    newPosition!: Vector;
    currentPosition!: Vector;

    oldRadius!: number;
    newRadius!: number;
    currentRadius!: number;

    dps = 0;
    private _lastDamageTimestamp!:number;

    dirty = false;
    completionRatioDirty = false;

    private _doDamage = false;
    get doDamage(): boolean { return this._doDamage; }

    readonly game: Game;
    readonly mapSize: number;

    clearing:boolean=false;

    gasTime:number=0
    advTime:number=0

    constructor(game: Game) {
        this.game = game;
        this.mapSize = (this.game.map.width + this.game.map.height) / 2;

        let firstStage:GasStage=DefaultGasStages[0]

        switch(game.gamemode.gas.mode){
            case GasMode.Staged:
                firstStage = game.gamemode.gas.stages[0];
                this.oldRadius = firstStage.oldRadius * this.mapSize;
                this.newRadius = firstStage.newRadius * this.mapSize;
                break;
            case GasMode.Procedural:
                this.oldRadius = game.gamemode.gas.initialRadius * this.mapSize;
                this.newRadius=this.oldRadius
                this.state=GasState.Inactive
                this.stage=0

                this.gasTime=game.gamemode.gas.waiting.initialTime
                this.advTime=game.gamemode.gas.advance.initialTime
        }
        this.currentRadius = this.oldRadius;
        this.oldPosition = Vec.create(this.game.map.width / 2, this.game.map.height / 2);
        this.newPosition = Vec.clone(this.oldPosition);
        this.currentPosition = Vec.clone(this.oldPosition);
        this._lastDamageTimestamp = this.game.now;
    }

    tick(): void {
        if (this.state !== GasState.Inactive&&!(this.completionRatio>1&&this.clearing)) {
            this.completionRatio = (this.game.now - this.countdownStart) / (1000 * this.currentDuration);
            this.completionRatioDirty = true;
        }

        this._doDamage = false;

        if (this.game.now - this._lastDamageTimestamp >= 1000) {
            this._lastDamageTimestamp = this.game.now;
            this._doDamage = true;

            if (this.state === GasState.Advancing) {
                this.currentPosition = Vec.lerp(this.oldPosition, this.newPosition, this.completionRatio);
                this.currentRadius = Numeric.lerp(this.oldRadius, this.newRadius, this.completionRatio);
            }
        }
    }
    clearGas(transition:number=1){
        if(this.clearing)return
        this.state=GasState.Advancing
        this.clearing=true;
        this.oldRadius=this.currentRadius;
        this.newRadius=0.95*this.mapSize;
        this.oldPosition=this.currentPosition;
        this.newPosition=Vec.create(this.game.map.width / 2, this.game.map.height / 2)
        this.countdownStart=this.game.now
        this.currentDuration=transition
        this.completionRatio=0
        this.dps=0
        this.dirty=true
        this.completionRatioDirty = true;
    }

    // Generate random coordinate within quadrant
    private static _genQuadCoord(v: Vector, width: number, height: number): Vector {
        // Define initial offsets by dividing width and height into 4ths and multiplying it by a random number between 0 and 1
        let xOffset = Math.ceil(width / 4 * Math.random());
        let yOffset = Math.ceil(height / 4 * Math.random());

        // Apply weighting to the outer corners
        if (randomBoolean()) {
            xOffset = randomBoolean() ? Math.ceil(xOffset * 0.2) : xOffset;
            yOffset = randomBoolean() ? Math.ceil(yOffset * 0.2) : yOffset;
        }

        // Case switch to, depending on the quadrant, generate the random offset for said
        // quadrant, with a random weight towards this outside or the inside of the map
        const { x, y } = v;
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        if (x < halfWidth && y < halfHeight) {
            return Vec.create(Math.ceil(width / 4 + xOffset), Math.ceil(height / 4 + yOffset));
        } else if (x >= halfWidth && y < halfHeight) {
            return Vec.create(Math.ceil(3 * width / 4 - xOffset), Math.ceil(height / 4 + yOffset));
        } else if (x < halfWidth && y >= halfHeight) {
            return Vec.create(Math.ceil(width / 4 + xOffset), Math.ceil(3 * height / 4 - yOffset));
        } else {
            return Vec.create(x, y);
        }
    }

    scaledDamage(position: Vector): number {
        const distIntoGas = Geometry.distance(position, this.currentPosition) - this.currentRadius;
        return this.dps + Numeric.clamp(distIntoGas - GameConstants.gas.unscaledDamageDist, 0, Infinity) * GameConstants.gas.damageScaleFactor;
    }

    advanceGasStage(): void {
        const gas = this.game.gamemode.gas;
        if (gas.mode === GasMode.Disabled||this.clearing) return;

        if(this.game.gamemode.gas.mode===GasMode.Staged){
            const currentStage = this.game.gamemode.gas.stages[this.stage + 1];
            if (currentStage === undefined) return;

            const isDebug = gas.mode === GasMode.Debug;
            const duration = isDebug && gas.overrideDuration !== undefined && currentStage.duration !== 0
                ? gas.overrideDuration
                : currentStage.duration;

            this.stage++;
            this.state = currentStage.state;
            this.currentDuration = duration;
            this.completionRatio = 1;
            this.countdownStart = this.game.now;

            if (currentStage.state === GasState.Waiting) {
                this.oldPosition = Vec.clone(this.newPosition);
                if (currentStage.newRadius !== 0) {
                    const { width, height } = this.game.map;
                    if (isDebug && gas.overridePosition) {
                        this.newPosition = Vec.create(width / 2, height / 2);
                    } else {
                        this.randomPos(currentStage.oldRadius,currentStage.newRadius)
                    }
                } else {
                    this.newPosition = Vec.clone(this.oldPosition);
                }
                this.currentPosition = Vec.clone(this.oldPosition);
                this.currentRadius = currentStage.oldRadius * this.mapSize;
            }

            this.oldRadius = currentStage.oldRadius * this.mapSize;
            this.newRadius = currentStage.newRadius * this.mapSize;
            this.dps = currentStage.dps;
            this.dirty = true;
            this.completionRatioDirty = true;

            if (currentStage.summonAirdrop) {
                this.addAirdrop()
            }

            // Start the next stage
            if (duration !== 0) {
                this.completionRatio=0
                this.game.addTimeout(() => {if(!this.clearing){this.advanceGasStage()}}, duration * 1000);
            }
        }else if(gas.mode===GasMode.Procedural){
            let duration=0
            if(this.state!==GasState.Waiting){
                this.state=GasState.Waiting
                this.oldRadius=this.newRadius
                this.newRadius=this.oldRadius*gas.radiusDecay
                if(this.newRadius/this.mapSize<=gas.minRadius){
                    this.newRadius=0
                    this.newPosition=this.currentPosition
                }else{
                    this.oldPosition=this.newPosition
                    this.randomPos(this.oldRadius/this.mapSize,this.newRadius/this.mapSize)
                }
                duration=this.gasTime
                this.gasTime=Math.max(this.gasTime*gas.waiting.timeDecay,gas.waiting.timeMin)
            }else{
                this.state=GasState.Advancing
                duration=this.advTime
                this.advTime=Math.max(this.advTime*gas.advance.timeDecay,gas.advance.timeMin)
            }
            this.stage++
            this.currentPosition=this.oldPosition
            this.currentRadius=this.oldRadius
            this.currentDuration=duration
            this.countdownStart = this.game.now;
            this.dirty = true;
            this.completionRatioDirty = true;
            this.dps=this.stage>2?gas.damage[Math.min(this.stage-2,gas.damage.length)]:0
            if(gas.airdrop.includes(this.stage-1)){
                this.addAirdrop()
            }
            if(this.state==GasState.Waiting&&this.currentRadius===0&&this.newRadius===0){
                this.currentDuration=0
                this.completionRatio=1
                this.oldRadius=0
                this.newRadius=0
                this.currentRadius=0
                return
            }
            if (duration !== 0) {
                this.completionRatio=0
                this.game.addTimeout(() => {if(!this.clearing){this.advanceGasStage()}}, duration * 1000);
            }
        }
    }
    addAirdrop(){
        this.game.summonAirdrop(
            this.game.map.getRandomPosition(
                new CircleHitbox(15),
                {
                    maxAttempts: 500,
                    spawnMode: MapObjectSpawnMode.GrassAndSand,
                    collides: position => Geometry.distanceSquared(position, this.currentPosition) >= this.newRadius ** 2,
                    ir:pickRandomInArray(this.game.map.islands)
                }
            ) ?? this.newPosition
        );
    }
    randomPos(oldRadius:number,newRadius:number){
        const maxDistance = (oldRadius - newRadius) * this.mapSize;
        const maxDistanceSquared = maxDistance ** 2;

        this.newPosition = randomPointInsideCircle(this.oldPosition, maxDistance);

        let quadCoord = Gas._genQuadCoord(this.newPosition, this.game.map.width, this.game.map.height);
        let foundPosition = false;
        for (let attempts = 0; attempts < 100; attempts++) {
            quadCoord = Gas._genQuadCoord(this.newPosition, this.game.map.width, this.game.map.height);
            if (Geometry.distanceSquared(quadCoord, this.oldPosition) <= maxDistanceSquared) {
                foundPosition = true;
                break;
            }
        }

        if (foundPosition) this.newPosition = quadCoord;
    }
    isInGas(position: Vector): boolean {
        return Geometry.distanceSquared(position, this.currentPosition) >= this.currentRadius ** 2;
    }
}
