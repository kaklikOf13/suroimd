import { GameConstants, Layer, ObjectCategory } from "@common/constants";
import { Buildings, type BuildingDefinition } from "@common/definitions/buildings";
import { Obstacles, RotationMode, type ObstacleDefinition } from "@common/definitions/obstacles";
import { ObstacleModeVariations } from "@common/definitions/modes";
import { MapPacket, type MapPacketData } from "@common/packets/mapPacket";
import { PacketStream } from "@common/packets/packetStream";
import { type Orientation, type Variation } from "@common/typings";
import { CircleHitbox, GroupHitbox, PolygonHitbox, RectangleHitbox, type Hitbox } from "@common/utils/hitbox";
import { equalLayer } from "@common/utils/layer";
import { Angle, Collision, Geometry, Numeric, τ } from "@common/utils/math";
import { cloneDeep, mergeDeep, type Mutable, type SMutable } from "@common/utils/misc";
import { MapObjectSpawnMode, NullString, type ReferenceTo, type ReifiableDef } from "@common/utils/objectDefinitions";
import { SeededRandom, pickRandomInArray, random, randomFloat, randomPointInsideCircle, randomRotation, randomVector, weightedRandom } from "@common/utils/random";
import { FloorNames, IslandReturn, River, Terrain } from "@common/utils/terrain";
import { Vec, type Vector } from "@common/utils/vector";
import { Config } from "./config";
import { getLootFromTable } from "./data/lootTables";
import { IslandDef, IslandSpawns, MapDefinition, MapName, MapPlace, Maps, ObstacleClump, RiverDefinition } from "./data/maps";
import { type Game } from "./game";
import { Building } from "./objects/building";
import { Obstacle } from "./objects/obstacle";
import { CARDINAL_DIRECTIONS, Logger, getRandomIDString } from "./utils/misc";
import { GunItem } from "./inventory/gunItem";
import { Armors } from "@common/definitions/armors";
import { Backpacks } from "@common/definitions/backpacks";

interface MapBuild{
    defs:BuildingDefinition
    build:Building
    orientation:Orientation
    layer:number
    position:Vector
}

export class GameMap {
    readonly game: Game;

    private readonly mapDef: MapDefinition;
    private readonly quadBuildings: Record<1 | 2 | 3 | 4, string[]> = { 1: [], 2: [], 3: [], 4: [] };
    private readonly quadMajorBuildings: Array<1 | 2 | 3 | 4> = [];
    private readonly buildings:MapBuild[]=[]
    private readonly majorBuildingPositions: Vector[] = [];

    private readonly occupiedBridgePositions: Vector[] = [];

    private readonly clearings: RectangleHitbox[] = [];

    readonly width: number;
    readonly height: number;
    readonly oceanSize: number;
    readonly beachSize: number;

    readonly obstacles:Obstacle[]=[];

    readonly beachHitbox: GroupHitbox<RectangleHitbox[]>;

    readonly seed: number;

    readonly terrain: Terrain;

    private readonly _packet: Omit<MapPacketData, "objects"> & { readonly objects: Mutable<MapPacketData["objects"]> };

    /**
     * A cached map packet buffer
     * Since the map is static, there's no reason to serialize a map packet for each player that joins the game
     */
    readonly buffer: ArrayBuffer;

    private readonly _beachPadding;

    static getRandomRotation<T extends RotationMode>(mode: T): RotationMapping[T] {
        switch (mode) {
            case RotationMode.Full:
                // @ts-expect-error not sure why ts thinks the return type should be 0
                return randomRotation();
            case RotationMode.Limited:
                // @ts-expect-error see above
                return random(0, 3);
            case RotationMode.Binary:
                // @ts-expect-error see above
                return random(0, 1);
            case RotationMode.None:
            default:
                return 0;
        }
    }

    static getRandomBuildingOrientation(mode: NonNullable<BuildingDefinition["rotationMode"]>): Orientation {
        switch (mode) {
            case RotationMode.Binary:
                return pickRandomInArray([0, 2]);
            default:
                return GameMap.getRandomRotation(mode);
        }
    }

    islands:IslandReturn[]=[]

    generateIsland(def:IslandDef,position:Vector,hitboxSize:number=20,seededRandom = new SeededRandom(this.seed),name?:string){
        const rivers: River[] = [];

        const ir=this.terrain.generateIsland({
            beach:def.beach,
            beachSize:def.beachSize,
            grass:def.grass,
            interiorSize:def.interiorSize,
        },position)
        const irh=ir.beachHBR.clone()
        irh.min=Vec.subComponent(irh.min,hitboxSize,hitboxSize)
        irh.max=Vec.addComponent(irh.max,hitboxSize,hitboxSize)
        if (def.rivers) {
            //if (def.trails) rivers.push(...this._generateRivers(def.trails, seededRandom, true));
            if (def.rivers) rivers.push(...this._generateRivers(def.rivers, seededRandom,false,ir.beachHBR));
        }

        this.terrain.addRivers(rivers)
        ir.rivers.push(...rivers)
        this.islands.push(ir)
        this._generateClearings(def.clearings,def,ir);
        for(const cd of def.chooses??[]){
            const count=random(cd.min,cd.max)
            const weights=cd.objects.map(({ weight }) => weight)
            for(let c=0;c<count;c++){
                const item=weightedRandom(cd.objects, weights)
                if("build" in item&&item.build!==NullString){
                    this._generateBuildings(item.build,def,1,ir)
                }else if("obstacle" in item&&item.obstacle!==NullString){
                    this._generateObstacles(item.obstacle,def,1,undefined,ir)
                }
            }
        }
        Object.entries(def.buildings ?? {}).forEach(([building, count]) => this._generateBuildings(building,def, count,ir));
        for (const clump of def.obstacleClumps ?? []) {
            this._generateObstacleClumps(clump,ir);
        }
        Object.entries(def.loots ?? {}).forEach(([loot, count]) => this._generateLoots(loot, count,ir));
        Object.entries(def.obstacles ?? {}).forEach(([obstacle, count]) => this._generateObstacles(obstacle,def, count,undefined,ir));
        def.onGenerate?.(this,ir);
    }
    places:MapPlace[]=[]
    addPlace(place:MapPlace,porcent:boolean=true){
        const absPosition = Vec.create(
            porcent?this.width * (place.position.x + randomFloat(-0.04, 0.04) ):place.position.x,
            porcent?this.height * (place.position.y + randomFloat(-0.04, 0.04) ):place.position.y,
        );

        this.places.push({ name:place.name, position: absPosition });
    }

    constructor(game: Game, mapData: typeof Config["map"], seed=random(0, 2 ** 31)) {
        this.game = game;

        const [name, ...params] = typeof mapData === "string"?mapData.split(":") as [MapName, ...string[]]:mapData.extends.split(":") as [MapName, ...string[]];
        let mapDef:MapDefinition
        if(typeof mapData === "string"){
            mapDef = Maps[name]
        }else if(mapData!==undefined){
            mapDef=cloneDeep(Maps[mapData.extends])
            for(const i of mapData.change_island){
                const islandD=(mapDef.islands??[])[i.island[0]].chooses[i.island[1]]
                if(!islandD){
                    console.error("Invalid Line")
                    continue
                }
                mapDef.islands![i.island[0]].chooses[i.island[1]]=mergeDeep(islandD,i.def)
            }
        }else{
            throw "Invalid Map Def"
        }

        // @ts-expect-error I don't know why this rule exists
        type PacketType = this["_packet"];

        const packet = {
            objects: [],
            floors:[]
        } as SMutable<PacketType>;
        this._packet = packet;

        this.seed = packet.seed = seed;
        
        Logger.log(`Game ${game.id} | Map seed: ${this.seed}`);

        this.width = packet.width = mapDef.width;
        this.height = packet.height = mapDef.height;
        this.oceanSize = mapDef.oceanSize;
        this.beachSize = mapDef.beachSize;

        this.mapDef = mapDef;

        // + 8 to account for the jagged points
        const beachPadding = this._beachPadding = mapDef.oceanSize + mapDef.beachSize + 8;
        const oceanSize = this.oceanSize + 8;

        this.beachHitbox = new GroupHitbox(
            new RectangleHitbox(
                Vec.create(this.width - beachPadding, oceanSize),
                Vec.create(this.width - oceanSize, this.height - oceanSize)
            ),
            new RectangleHitbox(
                Vec.create(oceanSize, oceanSize),
                Vec.create(this.width - beachPadding, beachPadding)
            ),
            new RectangleHitbox(
                Vec.create(oceanSize, oceanSize),
                Vec.create(beachPadding, this.height - beachPadding)
            ),
            new RectangleHitbox(
                Vec.create(oceanSize, this.height - beachPadding),
                Vec.create(this.width - beachPadding, this.height - oceanSize)
            )
        );

        const seededRandom = new SeededRandom(this.seed)

        this.terrain = new Terrain(
            this.width,
            this.height,
            this.seed,
            FloorNames.Water
        );
        for(const is of mapDef.islands??[]){
            const count=(is.max!==undefined&&is.min!==undefined)&&is.min?random(is.min,is.max):1
            const ma=is.spawnAttempts??20
            let smartRow=0
            let smartCol=0
            let sri=0
            const smartOffset=is.smartOffset??20
            for(let i=0;i<count;i++){
                const isd=pickRandomInArray(is.chooses)
                let attempts=0
                const ihb=new RectangleHitbox(Vec.create(0,0),Vec.create(isd.interiorSize+isd.beachSize,isd.interiorSize+isd.beachSize))
                while(attempts<ma){
                    attempts++
                    let position:Vector|undefined
                    switch(is.spawn??IslandSpawns.Random){
                        case IslandSpawns.Center:
                            position=Vec.create((this.width/2)-(ihb.max.x-ihb.min.x)/2,(this.height/2)-(ihb.max.y-ihb.min.y)/2)
                            break
                        case IslandSpawns.Smart:
                            if(is.smartList){
                                smartCol=is.smartList[sri].x
                                smartRow=is.smartList[sri].y
                                position=Vec.create((smartCol*(ihb.max.x+smartOffset))+smartOffset,(smartRow*(ihb.max.y+smartOffset))+smartOffset)
                            }else{
                                position=Vec.create((smartCol*(ihb.max.x+smartOffset))+smartOffset,(smartRow*(ihb.max.y+smartOffset))+smartOffset)
                                if(ihb.max.x+position.x>this.width-smartOffset*2){
                                    smartCol=0
                                    smartRow++
                                    position.y=(smartRow*(ihb.max.y+smartOffset))+smartOffset
                                    position.x=(smartCol*(ihb.max.x+smartOffset))+smartOffset
                                }
                                smartCol++
                            }
                            sri++
                            break
                        default:
                            position=randomVector(0,this.width,0,this.height)
                            let col=false
                            const irthb=ihb.transform(position)
                            for(const hb of this.islands){
                                if(hb.beachHBR.collidesWith(irthb)){
                                    col=true
                                    break
                                }
                            }
                            if(col||irthb.min.x<0||irthb.min.y<0||irthb.max.x>=this.width||irthb.max.y>=this.height){
                                position=undefined
                            }
                            break
                    }
                    if(!position){
                        continue
                    }
                    this.generateIsland(isd,position,undefined,seededRandom)
                    const name:undefined|string=is.names?(is.names.orden?is.names.names[Math.min(is.names.names.length-1,i)]:pickRandomInArray(is.names.names)):undefined
                    if(name)this.addPlace({position:Vec.add(position,Vec.scale(ihb.max,0.5)),name:name},false)
                    break
                }
            }
        }
        packet.rivers = this.terrain.rivers;

        mapDef.onGenerate?.(this, params);

        if (mapDef.places) {
            for(const p of mapDef.places){
                this.addPlace(p)
            }
        }
        packet.places = this.places
        //@ts-ignore
        for(const l of Object.values(Layer)){
            for(const f of this.terrain.floors[l as Layer]){
                this._packet.floors.push({hitbox:f.hitbox,layer:l as Layer,type:f.type,build:f.build})
            }
        }

        const stream = new PacketStream(new ArrayBuffer(1 << 16));
        stream.serializeServerPacket(MapPacket.create(packet));
        this.buffer = stream.getBuffer();
    }

    private _generateRivers(definition: RiverDefinition, randomGenerator: SeededRandom, isTrail = false,area:RectangleHitbox): River[] {
        const {
            minAmount,
            maxAmount,
            maxWideAmount,
            wideChance,
            minWidth,
            maxWidth,
            minWideWidth,
            maxWideWidth,
            floor,
            outline
        } = definition;
        const rivers: River[] = [];
        const amount = randomGenerator.getInt(minAmount, maxAmount);

        // generate a list of widths and sort by biggest, to make sure wide rivers generate first
        let wideAmount = 0;
        const widths = Array.from(
            { length: amount },
            () => {
                if (wideAmount < maxWideAmount && randomGenerator.get() < wideChance) {
                    wideAmount++;
                    return randomGenerator.getInt(minWideWidth, maxWideWidth);
                } else {
                    return randomGenerator.getInt(minWidth, maxWidth);
                }
            }
        ).sort((a, b) => b - a);
        const halfWidth = (area.max.x-area.min.x) / 2;
        const halfHeight = (area.max.y-area.min.y) / 2;
        const center = area.getCenter();

        const padding = isTrail ? GameConstants.trailPadding : GameConstants.riverPadding;
        const width = (area.max.x-area.min.x)+padding;
        const height= (area.max.y-area.min.y)+padding;
        const bounds = new RectangleHitbox(
            Vec.create(area.min.x-padding, area.min.y-padding),
            Vec.create(area.min.x+width, area.min.y+height)
        );

        let i = 0;
        let attempts = 0;
        while (i < amount && attempts < 100) {
            attempts++;
            let start: Vector;

            const horizontal = !!randomGenerator.getInt();
            const reverse = !!randomGenerator.getInt();

            if (horizontal) {
                const topHalf = randomGenerator.get(0, halfHeight);
                const bottomHalf = randomGenerator.get(halfHeight, height);
                start = Vec.create(bounds.min.x, bounds.min.y+(reverse ? bottomHalf : topHalf));
            } else {
                const leftHalf = randomGenerator.get(0, halfWidth);
                const rightHalf = randomGenerator.get(halfWidth, width);
                start = Vec.create(bounds.min.x+(reverse ? rightHalf : leftHalf), bounds.min.y);
            }

            const startAngle = Angle.betweenPoints(center, start) + (reverse ? 0 : Math.PI);

            const riverWidth = widths[i];

            if (this._generateRiver(
                start,
                startAngle,
                riverWidth,
                bounds,
                isTrail,
                rivers,
                randomGenerator,
                floor,
                outline,
                area
            )) i++;
        }

        return rivers;
    }

    private _generateRiver(
        startPos: Vector,
        startAngle: number,
        width: number,
        bounds: RectangleHitbox,
        isTrail: boolean,
        rivers: River[],
        randomGenerator: SeededRandom,
        floor?:FloorNames,
        outline?:FloorNames,
        area?: RectangleHitbox
    ): boolean {
        if(!area){
            return false
        }
        const riverPoints: Vector[] = [];

        riverPoints.push(startPos);

        let angle = startAngle;
        const points = isTrail ? 25 : 100;

        for (let i = 1; i < points; i++) {
            const lastPoint = riverPoints[i - 1];
            const center = area.getCenter();

            const distFactor = Geometry.distance(lastPoint, center) / ((area.max.x-area.min.x) / 2);

            const maxDeviation = Numeric.lerp(0.8, 0.1, distFactor);
            const minDeviation = Numeric.lerp(0.3, 0.1, distFactor);

            angle = angle + randomGenerator.get(
                -randomGenerator.get(minDeviation, maxDeviation),
                randomGenerator.get(minDeviation, maxDeviation)
            );

            const pos = Vec.add(lastPoint, Vec.fromPolar(angle, randomGenerator.getInt(30, 80)));

            // end the river if it collides with another river
            let collided = false;
            for (const river of rivers) {
                if (river.isTrail !== isTrail) continue; // Trails should only end when colliding with other trails, same for rivers
                const points = river.points;
                for (let j = 1; j < points.length; j++) {
                    const intersection = Collision.lineIntersectsLine(lastPoint, pos, points[j - 1], points[j]);
                    if (intersection) {
                        const dist = Geometry.distance(intersection, riverPoints[i - 1]);
                        if (dist > 16) riverPoints[i] = intersection;
                        collided = true;
                        break;
                    }
                }
                if (collided) break;
            }
            if (collided) break;

            if (!bounds.isPointInside(pos)) {
                riverPoints[i] = Vec.create(
                    Numeric.clamp(pos.x, bounds.min.x, bounds.max.x),
                    Numeric.clamp(pos.y, bounds.min.y, bounds.max.y)
                );
                break;
            }

            riverPoints[i] = pos;
        }
        if (riverPoints.length > 99 || riverPoints.length < 3) return false;

        const mapBounds = area;
        
        const r=new River(width, riverPoints, rivers, mapBounds, isTrail,floor,outline)
        rivers.push(r);

        return true;
    }

    // TODO Move this to a utility class and use it in gas.ts as well
    getQuadrant(x: number, y: number, width: number, height: number): 1 | 2 | 3 | 4 {
        if (x < width / 2 && y < height / 2) {
            return 1;
        } else if (x >= width / 2 && y < height / 2) {
            return 2;
        } else if (x < width / 2 && y >= height / 2) {
            return 3;
        } else {
            return 4;
        }
    }

    private _generateClearings(clearingDef: IslandDef["clearings"],idef:IslandDef,ir:IslandReturn): void {
        if (!clearingDef) return;

        const {
            minWidth,
            minHeight,
            maxWidth,
            maxHeight,
            count,
            obstacles
        } = clearingDef;

        for (let i = 0; i < count; i++) {
            const width = randomFloat(minWidth, maxWidth);
            const height = randomFloat(minHeight, maxHeight);
            let hitbox = RectangleHitbox.fromRect(width, height);

            let position;
            let attempts = 0;
            let validPositionFound = false;
            while (!validPositionFound && attempts < 100) {
                if ((position = this.getRandomPosition(hitbox)) !== undefined) {
                    validPositionFound = true;
                    this.clearings.push(hitbox = RectangleHitbox.fromRect(width, height, position));
                    break;
                }
                attempts++;
            }

            if (attempts >= 100 && !validPositionFound) {
                Logger.warn("Failed to find valid position for clearing");
                continue;
            }

            for (const obstacle of obstacles) {
                this._generateObstacles(
                    obstacle.idString,
                    idef,
                    random(obstacle.min, obstacle.max),
                    () => hitbox.randomPoint(),
                    ir
                );
            }
        }
    }

    private _generateBuildings(definition: ReifiableDef<BuildingDefinition>,def:IslandDef, count: number,ir:IslandReturn): void {
        const buildingDef = Buildings.reify(definition);

        if (!buildingDef.bridgeHitbox) {
            const { idString, rotationMode } = buildingDef;
            const { majorBuildings = [], quadBuildingLimit = {} } = def;

            let attempts = 0;
            for (let i = 0; i < count; i++) {
                let position: Vector | undefined;
                let orientation: Orientation | undefined;
                let validPositionFound = false;

                while (!validPositionFound && attempts < 100) {
                    orientation = GameMap.getRandomBuildingOrientation(rotationMode);

                    position = this.getRandomPosition(buildingDef.spawnHitbox, {
                        orientation,
                        spawnMode: buildingDef.spawnMode,
                        orientationConsumer: (newOrientation: Orientation) => {
                            orientation = newOrientation;
                        },
                        maxAttempts: 400,
                        ir:ir
                    });
                    if (position === undefined) {
                        Logger.warn(`Failed to find valid position for building ${idString}`);
                        break;
                    }
                    const shr=buildingDef.spawnHitbox.toRectangle()
                    if(buildingDef.spawnMode===MapObjectSpawnMode.Grass){
                        const rghb=ir.grassHB.toRectangle()
                        position.x=Numeric.clamp(position.x,rghb.min.x+shr.min.x,rghb.max.x-shr.max.x)
                        position.y=Numeric.clamp(position.y,rghb.min.y+shr.min.x,rghb.max.y-shr.max.y)
                    }else if(buildingDef.spawnMode!==MapObjectSpawnMode.Beach){
                        const rbhb=ir.beachHB.toRectangle()
                        position.x=Numeric.clamp(position.x,rbhb.min.x+shr.min.x,rbhb.max.x-shr.max.x)
                        position.y=Numeric.clamp(position.y,rbhb.min.y+shr.min.x,rbhb.max.y-shr.max.y)
                    }

                    const quad = this.getQuadrant(position.x, position.y, this.width, this.height);

                    if (majorBuildings.includes(idString)) {
                        if (
                            this.quadMajorBuildings.includes(quad)
                            // undefined position would cause continue above
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            || this.majorBuildingPositions.some(pos => Geometry.distanceSquared(pos, position!) < 150000)
                        ) {
                            attempts++;
                            continue;
                        } else {
                            this.quadMajorBuildings.push(quad);
                            this.majorBuildingPositions.push(position);
                        }
                    } else if (idString in quadBuildingLimit) {
                        if (this.quadBuildings[quad].filter(b => b === idString).length >= quadBuildingLimit[idString]) {
                            attempts++;
                            continue;
                        } else {
                            this.quadBuildings[quad].push(idString);
                        }
                    }

                    validPositionFound = true;
                }

                if (!validPositionFound && position === undefined) {
                    Logger.warn(`Failed to place building ${idString} after ${attempts} attempts`);
                    break
                }

                if (position !== undefined) this.generateBuilding(buildingDef, position, orientation);

                attempts = 0; // Reset attempts counter for the next building
            }
        } else {
            let spawnedCount = 0;

            const generateBridge = (river: River) => (start: number, end: number): void => {
                if (spawnedCount >= count) return;

                let shortestDistance = Number.MAX_VALUE;
                let bestPosition = 0.5;
                let bestOrientation: Orientation = 0;
                for (let pos = start; pos <= end; pos += 0.05) {
                    // Find the best orientation
                    const direction = Vec.direction(river.getTangent(pos));
                    for (let orientation: Orientation = 0; orientation < 4; orientation++) {
                        const distance = Math.abs(Angle.minimize(direction, CARDINAL_DIRECTIONS[orientation]));
                        if (distance < shortestDistance) {
                            shortestDistance = distance;
                            bestPosition = pos;
                            bestOrientation = orientation as Orientation;
                        }
                    }
                }
                const position = river.getPosition(bestPosition);

                if (
                    this.occupiedBridgePositions.some(pos => Vec.equals(pos, position))
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    || this.isInRiver(buildingDef.bridgeHitbox!.transform(position, 1, bestOrientation))
                ) return;

                const spawnHitbox = buildingDef.spawnHitbox.transform(position, 1, bestOrientation);

                // checks if the bridge hitbox collides with another object and if so does not spawn it
                for (const object of this.game.grid.intersectsHitbox(spawnHitbox)) {
                    const objectHitbox = "spawnHitbox" in object && object.spawnHitbox;

                    if (!objectHitbox) continue;
                    if (spawnHitbox.collidesWith(objectHitbox)) return;
                }

                this.occupiedBridgePositions.push(position);
                this.generateBuilding(buildingDef, position, bestOrientation);
                spawnedCount++;
            };

            this.terrain.rivers
                .filter(({ isTrail }) => !isTrail)
                .map(generateBridge)
                .forEach(generator => {
                    generator(0.1, 0.4);
                    generator(0.6, 0.9);
                });
        }
    }

    generateBuilding(
        definition: ReifiableDef<BuildingDefinition>,
        position: Vector,
        orientation?: Orientation,
        layer?: number
    ): Building | undefined {
        definition = Buildings.reify(definition);
        orientation ??= GameMap.getRandomBuildingOrientation(definition.rotationMode);
        layer ??= 0;

        if (
            this.game.pluginManager.emit(
                "building_will_generate",
                {
                    definition,
                    position,
                    orientation,
                    layer
                }
            )
        ) return;

        const building = new Building(this.game, definition, Vec.clone(position), orientation, layer);

        for (const obstacleData of definition.obstacles) {
            let idString = getRandomIDString<
                ObstacleDefinition,
                ReferenceTo<ObstacleDefinition> | typeof NullString
            >(obstacleData.idString);
            if (idString === NullString) continue;
            const gameMode = GameConstants.modeName;
            if (obstacleData.modeVariant) {
                idString = `${idString}${ObstacleModeVariations[gameMode] ?? ""}`;
            }

            const obstacleDef = Obstacles.fromString(idString);
            let obstacleRotation = obstacleData.rotation ?? GameMap.getRandomRotation(obstacleDef.rotationMode);

            if (obstacleDef.rotationMode === RotationMode.Limited) {
                obstacleRotation = Numeric.addOrientations(orientation, obstacleRotation as Orientation);
            }

            let lootSpawnOffset: Vector | undefined;

            if (obstacleData.lootSpawnOffset) lootSpawnOffset = Vec.addAdjust(Vec.create(0, 0), obstacleData.lootSpawnOffset, orientation);

            const obstacle = this.generateObstacle(
                obstacleDef,
                Vec.addAdjust(position, obstacleData.position, orientation),
                {
                    rotation: obstacleRotation,
                    layer: layer + (obstacleData.layer ?? 0),
                    scale: obstacleData.scale ?? 1,
                    variation: obstacleData.variation,
                    lootSpawnOffset,
                    parentBuilding: building,
                    puzzlePiece: obstacleData.puzzlePiece,
                    locked: obstacleData.locked,
                    activated: obstacleData.activated
                }
            );

            if (
                obstacle && (
                    obstacleDef.isActivatable
                    || obstacleDef.isDoor
                )
            ) {
                building.interactableObstacles.add(obstacle);
            }
        }

        for (const lootData of definition.lootSpawners) {
            for (const item of getLootFromTable(lootData.table)) {
                this.game.addLoot(
                    item.idString,
                    Vec.addAdjust(position, lootData.position, orientation),
                    layer,
                    { count: item.count, jitterSpawn: false }
                );
            }
        }

        for (const subBuilding of definition.subBuildings) {
            const idString = getRandomIDString<
                BuildingDefinition,
                ReferenceTo<BuildingDefinition> | typeof NullString
            >(subBuilding.idString);

            if (idString === NullString) continue;

            const finalOrientation = Numeric.addOrientations(orientation, subBuilding.orientation ?? 0);
            this.generateBuilding(
                idString,
                Vec.addAdjust(position, subBuilding.position, finalOrientation),
                finalOrientation,
                layer + (subBuilding.layer ?? 0)
            );
        }

        for (const floor of definition.floors) {
            this.terrain.addFloor(floor.type, floor.hitbox.transform(position, 1, orientation), floor.layer ?? layer,true);
        }

        if (!definition.hideOnMap) this._packet.objects.push(building);
        this.game.grid.addObject(building);
        this.game.pluginManager.emit("building_did_generate", building);

        this.buildings.push({defs:definition,orientation,layer,position,build:building})

        return building;
    }

    generate_after_start(){
        for(const b of this.buildings){
            const definition=b.defs
            if(definition.npcs){
                for(const npcData of definition.npcs){
                    const npc=this.game.addNpc(
                        Vec.addAdjust(b.position, npcData.position, b.orientation),
                        npcData.data,npcData.layer??b.layer,b.build,npcData.team)
                    if(npcData.items){
                        for(const item of Object.getOwnPropertyNames(npcData.items)){
                            npc.inventory.items.setItem(item,npcData.items[item])
                        }
                    }
                    if(npcData.weapons){
                        for(const weapon of Object.keys(npcData.weapons).map(key => Number(key))){
                            npc.inventory.addOrReplaceWeapon(weapon,npcData.weapons[weapon])
                            const w=npc.inventory.getWeapon(weapon)
                            if(w instanceof GunItem){
                                w.ammo=w.definition.capacity
                            }
                        }
                    }
                    if(npcData.equips){
                        if(npcData.equips.helmet){
                            npc.inventory.helmet=Armors.fromStringSafe(npcData.equips.helmet)
                        }
                        if(npcData.equips.vest){
                            npc.inventory.vest=Armors.fromStringSafe(npcData.equips.vest)
                        }
                        if(npcData.equips.backpack){
                            npc.inventory.backpack=Backpacks.fromString(npcData.equips.backpack)
                        }
                    }
                }
            }
        }
    }

    private _generateObstacles(definition: ReifiableDef<ObstacleDefinition>,idef:IslandDef, count: number, getPosition?: () => Vector,ir?:IslandReturn): void {
        // i don't know why "definition = Obstacles.reify(definition)" doesn't work anymore, but it doesn't
        const def = Obstacles.reify(definition);

        const { scale = { spawnMin: 1, spawnMax: 1 }, variations, rotationMode } = def;
        const { spawnMin, spawnMax } = scale;
        const effSpawnHitbox = def.spawnHitbox ?? def.hitbox;

        for (let i = 0; i < count; i++) {
            const scale = randomFloat(spawnMin, spawnMax);
            const variation = (variations !== undefined ? random(0, variations - 1) : 0) as Variation;
            const rotation = GameMap.getRandomRotation(rotationMode);

            let orientation: Orientation = 0;

            if (rotationMode === RotationMode.Limited) {
                orientation = rotation as Orientation;
            }

            const position = this.getRandomPosition(effSpawnHitbox, {
                getPosition,
                scale,
                orientation,
                spawnMode: def.spawnMode,
                ignoreClearings: idef.clearings?.allowedObstacles?.includes(def.idString),
                ir:ir
            });

            if (!position) {
                Logger.warn(`Failed to find valid position for obstacle ${def.idString}`);
                break;
            }

            this.generateObstacle(def, position, { layer: Layer.Ground, scale, variation });
        }
    }

    generateObstacle(
        definition: ReferenceTo<ObstacleDefinition> | ObstacleDefinition,
        position: Vector,
        {
            rotation,
            layer,
            scale,
            variation,
            lootSpawnOffset,
            parentBuilding,
            puzzlePiece,
            locked,
            activated
        }: {
            rotation?: number
            layer?: number
            scale?: number
            variation?: Variation
            lootSpawnOffset?: Vector
            parentBuilding?: Building
            puzzlePiece?: string | boolean
            locked?: boolean
            activated?: boolean
        } = {}
    ): Obstacle | undefined {
        const def = Obstacles.reify(definition);
        layer ??= 0;

        scale ??= randomFloat(def.scale?.spawnMin ?? 1, def.scale?.spawnMax ?? 1);
        if (variation === undefined && def.variations !== undefined) {
            variation = random(0, def.variations - 1) as Variation;
        }

        rotation ??= GameMap.getRandomRotation(def.rotationMode);

        if (
            this.game.pluginManager.emit(
                "obstacle_will_generate",
                {
                    type: def,
                    position,
                    rotation,
                    layer,
                    scale,
                    variation,
                    lootSpawnOffset,
                    parentBuilding,
                    puzzlePiece,
                    locked,
                    activated
                }
            )
        ) return;

        const obstacle = new Obstacle(
            this.game,
            def,
            Vec.clone(position),
            rotation,
            layer,
            scale,
            variation,
            lootSpawnOffset,
            parentBuilding,
            puzzlePiece,
            locked,
            activated
        );

        if (!def.hideOnMap && !def.invisible && obstacle.layer === Layer.Ground) this._packet.objects.push(obstacle);
        this.game.grid.addObject(obstacle);
        this.game.updateObjects = true;
        this.obstacles.push(obstacle)
        this.game.pluginManager.emit("obstacle_did_generate", obstacle);
        return obstacle;
    }

    private _generateObstacleClumps(clumpDef: ObstacleClump,ir:IslandReturn): void {
        const clumpAmount = clumpDef.clumpAmount;
        const firstObstacle = Obstacles.reify(clumpDef.clump.obstacles[0]);

        const { clump: { obstacles, minAmount, maxAmount, radius, jitter } } = clumpDef;

        for (let i = 0; i < clumpAmount; i++) {
            const position = this.getRandomPosition(
                new CircleHitbox(radius + jitter),
                {
                    spawnMode: firstObstacle.spawnMode,
                    ir
                }
            );

            if (!position) {
                Logger.warn("Spawn position cannot be found");
                break;
            }

            const amountOfObstacles = random(minAmount, maxAmount);
            const offset = randomRotation();
            const step = τ / amountOfObstacles;

            for (let j = 0; j < amountOfObstacles; j++) {
                this.generateObstacle(
                    pickRandomInArray(obstacles),
                    Vec.add(
                        randomPointInsideCircle(position, jitter),
                        Vec.fromPolar(j * step + offset, radius)
                    ),
                );
            }
        }
    }

    private _generateLoots(table: string, count: number,ir:IslandReturn): void {
        for (let i = 0; i < count; i++) {
            const loot = getLootFromTable(table);

            const position = this.getRandomPosition(
                new CircleHitbox(5),
                { spawnMode: MapObjectSpawnMode.GrassAndSand,ir:ir }
            );

            if (!position) {
                Logger.warn(`Failed to find valid position for loot generated from table '${table}'`);
                break;
            }

            for (const item of loot) {
                this.game.addLoot(
                    item.idString,
                    position,
                    Layer.Ground,
                    { count: item.count, jitterSpawn: false }
                );
            }
        }
    }

    getRandomPosition(
        initialHitbox: Hitbox,
        params?: {
            getPosition?: () => Vector
            collides?: (position: Vector) => boolean
            collidableObjects?: Partial<Record<ObjectCategory, boolean>>
            spawnMode?: MapObjectSpawnMode
            scale?: number
            layer?: Layer
            orientation?: Orientation
            maxAttempts?: number
            // used for beach spawn mode
            // so it can retry on different orientations
            orientationConsumer?: (orientation: Orientation) => void
            ignoreClearings?: boolean
            ir?:IslandReturn
        }
    ): Vector | undefined {
        let position: Vector | undefined = Vec.create(0, 0);

        if(!(params?.ir)){
            return undefined
        }

        const scale = params?.scale ?? 1;
        let orientation = params?.orientation ?? 0;
        const maxAttempts = params?.maxAttempts ?? 200;

        const collidableObjects = params?.collidableObjects ?? {
            [ObjectCategory.Obstacle]: true,
            [ObjectCategory.Building]: true
        };

        const spawnMode = params?.spawnMode ?? MapObjectSpawnMode.Grass;
        const getPosition = params?.getPosition ?? (() => {
            switch (spawnMode) {
                case MapObjectSpawnMode.Grass: {
                    return () => params?.ir?.grassHB.randomPoint()
                }
                case MapObjectSpawnMode.GrassAndSand: {
                    return () => {
                        const rp=params?.ir?.beachHB.randomPoint()
                        return Vec.create(
                            Numeric.clamp(rp?.x??0,(params?.ir?.beachHBR.min.x)??0-width*1.1,(params?.ir?.beachHBR.max.x)??this.width+width*1.1),
                            Numeric.clamp(rp?.y??0,(params?.ir?.beachHBR.min.y)??0-height*1.1,(params?.ir?.beachHBR.max.y)??this.height+height*1.1),
                        )
                    }
                }
                // TODO: evenly distribute objects based on river size
                case MapObjectSpawnMode.River: {
                    // rivers that aren't trails must have a waterHitbox
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    return () => pickRandomInArray((params?.ir!.rivers??[]).filter(({ isTrail }) => !isTrail))?.waterHitbox!.randomPoint();
                }
                case MapObjectSpawnMode.RiverBank: {
                    return () => pickRandomInArray(this.terrain.rivers.filter(({ isTrail }) => !isTrail)).bankHitbox.randomPoint();
                }
                case MapObjectSpawnMode.Beach: {
                    return () => {
                        params?.orientationConsumer?.(
                            orientation = GameMap.getRandomBuildingOrientation(RotationMode.Limited)
                        );

                        const beachRect = params?.ir?.beachHBGroup.hitboxes[orientation].clone().toRectangle();
                        if(!beachRect){
                            return params?.ir?.beachHBGroup.hitboxes[orientation].randomPoint();
                        }
                        switch (orientation) {
                            case 1:
                            case 3: {
                                beachRect.min.x += width;
                                beachRect.max.x -= width;
                                break;
                            }
                            case 0:
                            case 2: {
                                beachRect.min.y += height;
                                beachRect.max.y -= height;
                                break;
                            }
                        }

                        return beachRect.randomPoint();
                    };
                }
                case MapObjectSpawnMode.Trail: {
                    return () => pickRandomInArray(this.terrain.rivers.filter(({ isTrail }) => isTrail)).bankHitbox.randomPoint();
                }
            }
        })();

        const rect = initialHitbox.toRectangle();
        const width = rect.max.x - rect.min.x;
        const height = rect.max.y - rect.min.y;

        let attempts = 0;
        let collided = true;

        while (collided && attempts < maxAttempts) {
            attempts++;
            collided = false;

            //@ts-ignore
            position = getPosition();

            if (!position || params?.collides?.(position)) {
                collided = true;
                continue;
            }

            const hitbox = initialHitbox.transform(position, scale, orientation);

            const objects = this.game.grid.intersectsHitbox(hitbox);
            for (const object of objects) {
                let objectHitbox: Hitbox | undefined;
                if ("spawnHitbox" in object) {
                    objectHitbox = object.spawnHitbox;
                } else if (object.hitbox) {
                    objectHitbox = object.hitbox;
                }
                if (objectHitbox === undefined) continue;

                if (
                    collidableObjects[object.type]
                    && equalLayer(object.layer, params?.layer ?? Layer.Ground)
                    && hitbox.collidesWith(objectHitbox)) {
                    collided = true;
                    break;
                }
            }

            if (collided) continue;

            switch (spawnMode) {
                case MapObjectSpawnMode.Grass:
                case MapObjectSpawnMode.GrassAndSand:
                case MapObjectSpawnMode.Beach: {
                    for (const river of this.terrain.getRiversInHitbox(hitbox)) {
                        if (
                            (spawnMode !== MapObjectSpawnMode.GrassAndSand || river.isTrail)
                            && (
                                river.bankHitbox.isPointInside(position)
                                || hitbox.collidesWith(river.bankHitbox)
                            )
                        ) {
                            collided = true;
                            break;
                        }

                        if (
                            spawnMode === MapObjectSpawnMode.GrassAndSand
                            && (
                                river.waterHitbox?.isPointInside(position)
                                || river.waterHitbox?.collidesWith(hitbox)
                            )
                        ) {
                            collided = true;
                            break;
                        }
                    }
                    if (!params?.ignoreClearings) {
                        for (const clearing of this.clearings) {
                            if (clearing.collidesWith(hitbox)) {
                                collided = true;
                                break;
                            }
                        }
                    }
                    break;
                }
                case MapObjectSpawnMode.River: {
                    if (hitbox instanceof CircleHitbox) {
                        const radius = hitbox.radius;
                        for (
                            const point of [
                                Vec.subComponent(position, 0, radius),
                                Vec.subComponent(position, radius, 0),
                                Vec.addComponent(position, 0, radius),
                                Vec.addComponent(position, radius, 0)
                            ]
                        ) {
                            for (const river of this.terrain.getRiversInHitbox(hitbox)) {
                                if (!river.waterHitbox?.isPointInside(point)) {
                                    collided = true;
                                    break;
                                }
                            }
                            if (collided) break;
                        }
                    }
                    // TODO add code for other hitbox types
                    break;
                }
                case MapObjectSpawnMode.RiverBank:
                case MapObjectSpawnMode.Trail: {
                    if (this.isInRiver(hitbox)) {
                        collided = true;
                        break;
                    }
                    break;
                }
            }
        }

        return attempts < maxAttempts ? position : undefined;
    }

    private isInRiver(hitbox: Hitbox): boolean {
        for (const river of this.terrain.getRiversInHitbox(hitbox)) {
            if (river.waterHitbox?.collidesWith(hitbox)) {
                return true;
            }
        }
        return false;
    }
}

interface RotationMapping {
    [RotationMode.Full]: number
    [RotationMode.Limited]: Orientation
    [RotationMode.Binary]: 0 | 1
    [RotationMode.None]: 0
}
