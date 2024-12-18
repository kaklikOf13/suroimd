import { Layer, LayersList } from "../constants";
import { GroupHitbox, PolygonHitbox, RectangleHitbox, type Hitbox } from "./hitbox";
import { Collision, Numeric } from "./math";
import { SeededRandom } from "./random";
import { Vec, type Vector } from "./vector";

export interface FloorDefinition {
    readonly color: number
    readonly speedMultiplier?: number
    readonly overlay?: boolean
    readonly particles?: boolean
    readonly instaKill?: boolean
}

export const enum FloorNames {
    Grass = "grass",
    Dirt = "dirt",
    Stone = "stone",
    Wood = "wood",
    Sand = "sand",
    Metal = "metal",
    Carpet = "carpet",
    Water = "water",
    Void = "void",
    Snow = "snow",
    SnowSand="snow_sand"
}

export const FloorTypes: Record<FloorNames, FloorDefinition> = {
    grass: {
        color: 0x5a8939
    },
    dirt: {
        color: 0x604320
    },
    stone: {
        color: 0x121212
    },
    wood: {
        color: 0x7f5500
    },
    sand: {
        color: 0xb99b5f
    },
    metal: {
        color: 0x808080
    },
    carpet: {
        color: 0x32a868
    },
    water: {
        color: 0x00ddff,
        speedMultiplier: 0.7,
        overlay: true,
        particles: true
    },
    void: {
        color: 0x77390d,
        instaKill:true,
    },
    //Snow
    snow: {
        color:0xc9d1d9
    },
    snow_sand: {
        color:0xb4bfcb
    }
};

function jaggedRectangle(
    hitbox: RectangleHitbox,
    spacing: number,
    variation: number,
    random: SeededRandom
): Vector[] {
    const topLeft = Vec.clone(hitbox.min);
    const topRight = Vec.create(hitbox.max.x, hitbox.min.y);
    const bottomRight = Vec.clone(hitbox.max);
    const bottomLeft = Vec.create(hitbox.min.x, hitbox.max.y);

    const points: Vector[] = [];

    variation = variation / 2;
    const getVariation = (): number => random.get(-variation, variation);

    for (let x = topLeft.x + spacing; x < topRight.x; x += spacing) {
        points.push(Vec.create(x, topLeft.y + getVariation()));
    }
    for (let y = topRight.y + spacing; y < bottomRight.y; y += spacing) {
        points.push(Vec.create(topRight.x + getVariation(), y));
    }
    for (let x = bottomRight.x - spacing; x > bottomLeft.x; x -= spacing) {
        points.push(Vec.create(x, bottomRight.y + getVariation()));
    }
    for (let y = bottomLeft.y - spacing; y > topLeft.y; y -= spacing) {
        points.push(Vec.create(bottomLeft.x + getVariation(), y));
    }

    return points;
}
export interface Island{
    readonly grass:(FloorNames|undefined),
    readonly beachSize: number,
    readonly beach:(FloorNames|undefined)
    readonly interiorSize:number
}
export interface FloorBase{
    readonly type: FloorNames,
    readonly hitbox: Hitbox,
    readonly build:boolean
}
export interface IslandReturn{
    beachHB: Hitbox;
    grassHB: Hitbox;
    beachHBR: RectangleHitbox;
    grassHBR: RectangleHitbox;
    beachHBGroup: GroupHitbox;
    rivers:River[]
}
export class Terrain {
    readonly width: number
    readonly height: number
    readonly widthC: number;
    readonly heightC: number;
    readonly cellSize = 64;

    //@ts-ignore
    readonly floors: Record<Layer,{hitbox:Hitbox, type:FloorNames, build:boolean}[]>={};

    readonly rivers: River[]=[];

    //@ts-ignore
    private readonly _grid: Record<Layer,({
            readonly rivers: River[]
            readonly floors: FloorBase[]
    })[][]> = {};

    readonly seed:number
    constructor(
        width: number,
        height: number,
        seed: number,
        ocean:(FloorNames|undefined)=FloorNames.Water,
    ) {
        this.width = Math.floor(width);
        this.height = Math.floor(height);
        this.widthC = Math.floor(width / this.cellSize);
        this.heightC = Math.floor(height / this.cellSize);

        this.seed=seed

        //@ts-ignore
        for(const l of LayersList){
            this._grid[l as Layer]=[]
            this.floors[l as Layer]=[]
            for (let x = 0; x <= this.widthC; x++) {
                //@ts-ignore
                this._grid[l as Layer]?.push([])
                for (let y = 0; y <= this.heightC; y++) {
                    this._grid[l as Layer][x].push({
                        rivers:[],
                        floors:[],
                    })
                }
            }
        }

        if(ocean)this.addFloor(ocean,new RectangleHitbox(Vec.create(0,0),Vec.create(this.width,this.height)),Layer.Ground)
    }
    generateIsland(island:Island,position:Vector=Vec.create(0,0)):IslandReturn{
        // generate beach and grass
        const beachPadding = island.beachSize;

        const random = new SeededRandom(this.seed);

        const spacing = 16;
        const variation = 8;

        const beachRect = new RectangleHitbox(
            Vec.create(position.x, position.y),
            Vec.create(position.x + island.interiorSize+beachPadding, position.y + island.interiorSize+beachPadding)
        );

        const grassRect = new RectangleHitbox(
            Vec.create(beachPadding+position.x, beachPadding+position.y),
            Vec.create(island.interiorSize+position.x, island.interiorSize+position.y)
        );

        const beachHitbox = new PolygonHitbox(jaggedRectangle(beachRect, spacing, variation, random));
        const grassHitbox = new PolygonHitbox(jaggedRectangle(grassRect, spacing, variation, random));

        if(island.beach)this.addFloor(island.beach,beachHitbox,Layer.Ground)
        if(island.grass)this.addFloor(island.grass,grassHitbox,Layer.Ground)

        return {beachHB:beachHitbox,grassHB:grassHitbox,beachHBR:beachRect.toRectangle(),grassHBR:grassHitbox.toRectangle(),beachHBGroup:new GroupHitbox(
            new RectangleHitbox(
                Vec.create(beachRect.max.x-island.beachSize, beachRect.min.y),
                Vec.create(beachRect.max.x, beachRect.max.y)
            ),//Right
            new RectangleHitbox(
                Vec.create(beachRect.min.x, beachRect.min.y),
                Vec.create(position.x+beachRect.max.x, position.y+island.beachSize)
            ),//Top
            new RectangleHitbox(
                Vec.create(beachRect.min.x, beachRect.min.y),
                Vec.create(beachRect.min.x+island.beachSize, beachRect.max.y)
            ),//Left
            new RectangleHitbox(
                Vec.create(beachRect.min.x,beachRect.max.y-island.beachSize),
                Vec.create(beachRect.max.x,beachRect.max.y)
            ),//Bottom
        ),rivers:[]}
    }
    addRivers(rivers:River[]){
        // add rivers
        for (const river of rivers) {
            const rect = river.bankHitbox.toRectangle();

            const min = this._roundToCells(rect.min);
            const max = this._roundToCells(rect.max);

            for (let x = min.x; x <= max.x; x++) {
                for (let y = min.y; y <= max.y; y++) {
                    const min = Vec.create(x * this.cellSize, y * this.cellSize);
                    const rect = new RectangleHitbox(
                        min,
                        Vec.add(min, Vec.create(this.cellSize, this.cellSize))
                    );
                    // only add it to cells it collides with
                    if (river.bankHitbox.collidesWith(rect)) {
                        this._grid[Layer.Ground]![x][y].rivers.push(river);
                    }
                }
            }
            this.rivers.push(river);
        }
    }

    addFloor(type: FloorNames, hitbox: Hitbox, layer: Layer, build:boolean=false): void {
        this.floors[layer].push({hitbox, type, build});
        // get the bounds of the hitbox
        const rect = hitbox.toRectangle();
        // round it to the grid cells
        const min = this._roundToCells(rect.min);
        const max = this._roundToCells(rect.max);

        // add it to all grid cells that it intersects
        for (let x = min.x; x <= max.x; x++) {
            for (let y = min.y; y <= max.y; y++) {
                this._grid[layer][x][y].floors.push({ type, hitbox, build });
            }
        }
    }

    getFloor(position: Vector, layer: Layer): FloorNames {
        const pos = this._roundToCells(position);
        let floor: FloorNames = FloorNames.Void;

        const cell = this._grid[layer][pos.x][pos.y];
        for (const f of cell.floors) {
            if (f.build&&f.hitbox.isPointInside(position)) {
                floor=f.type
            }
        }
        if(floor!==FloorNames.Void){
            return floor
        }
        for (const river of cell.rivers) {
            if (river.waterHitbox?.isPointInside(position)) {
                floor = river.floor;
                return floor;
            }

            if (river.bankHitbox?.isPointInside(position)) {
                floor = river.outline;
                return floor;
            }
        }

        for (const f of cell.floors) {
            if (f.hitbox.isPointInside(position)) {
                floor=f.type
            }
        }

        /*
            if no floor was found at this position, then it's either the ocean (layer 0)
            or the void (all other floors)
        */
        return floor;
    }

    /**
     * Get rivers near a position
     */
    getRiversInPosition(position: Vector,layer:Layer=Layer.Ground): River[] {
        const pos = this._roundToCells(position);
        return this._grid[layer][pos.x][pos.y].rivers;
    }

    /**
     * Get rivers near a hitbox
     */
    getRiversInHitbox(hitbox: Hitbox,layer:Layer=Layer.Ground): River[] {
        const rivers = new Set<River>();

        const rect = hitbox.toRectangle();
        const min = this._roundToCells(rect.min);
        const max = this._roundToCells(rect.max);

        for (let x = min.x; x <= max.x; x++) {
            for (let y = min.y; y <= max.y; y++) {
                for (const river of this._grid[layer][x][y].rivers) {
                    rivers.add(river);
                }
            }
        }
        return [...rivers];
    }

    private _roundToCells(vector: Vector): Vector {
        return Vec.create(
            Numeric.clamp(Math.floor(vector.x / this.cellSize), 0, this.widthC),
            Numeric.clamp(Math.floor(vector.y / this.cellSize), 0, this.heightC)
        );
    }
}

function catmullRomDerivative(t: number, p0: number, p1: number, p2: number, p3: number): number {
    return 0.5 * (p2 - p0 + 2 * t * (2 * p0 - 5 * p1 + 4 * p2 - p3) + 3 * t * t * (3 * p1 - 3 * p2 + p3 - p0));
}

function catmullRom(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const tSquared = t * t;
    return 0.5 * (2 * p1 + t * (p2 - p0) + tSquared * (2 * p0 - 5 * p1 + 4 * p2 - p3) + tSquared * t * (3 * p1 - 3 * p2 + p3 - p0));
}

function clipRayToPoly(point: Vector, direction: Vector, polygon: PolygonHitbox): Vector {
    const end = Vec.add(point, direction);
    if (!polygon.isPointInside(end)) {
        const t = Collision.rayIntersectsPolygon(point, direction, polygon.points);
        if (t) {
            return Vec.scale(direction, t);
        }
    }
    return direction;
}

export class River {
    readonly bankWidth: number;

    readonly waterHitbox?: PolygonHitbox;
    readonly bankHitbox: PolygonHitbox;

    readonly isTrail: boolean;

    readonly floor:FloorNames
    readonly outline:FloorNames

    readonly bounds:RectangleHitbox

    constructor(
        readonly width: number,
        readonly points: readonly Vector[],
        otherRivers: readonly River[],
        bounds: RectangleHitbox,
        isTrail: boolean,
        floor:FloorNames=FloorNames.Water,
        outline:FloorNames=FloorNames.Dirt,
        waterHB?:PolygonHitbox,
        bankHB?:PolygonHitbox
    ) {
        this.isTrail = isTrail;
        const isRiver = !isTrail;
        this.floor=floor
        this.outline=outline
        this.bounds=bounds

        const length = this.points.length - 1;

        this.bankWidth = isRiver ? Numeric.clamp(this.width * 0.75, 12, 20) : this.width;

        const waterPoints: Vector[] = new Array<Vector>(length * 2);
        const bankPoints: Vector[] = new Array<Vector>(length * 2);

        const endsOnMapBounds = !bounds.isPointInside(this.points[this.points.length - 1]);

        if(!(bankHB&&waterHB)){
            for (let i = 0; i < this.points.length; i++) {
                const current = this.points[i];
                const normal = this.getNormal(i / length);

                let bankWidth = this.bankWidth;

                // find closest colliding river to adjust the bank width and clip this river
                let collidingRiver: River | null = null;
                for (const river of otherRivers) {
                    if (river.isTrail !== isTrail) continue;
                    const length = Vec.length(
                        Vec.sub(
                            river.getPosition(river.getClosestT(current)),
                            current
                        )
                    );

                    if (length < river.width * 2) {
                        bankWidth = Numeric.max(bankWidth, river.bankWidth);
                    }

                    if ((i === 0 || i === this.points.length - 1) && length < 48) {
                        collidingRiver = river;
                    }
                }

                let width = this.width;

                const end = 2 * (Numeric.max(1 - i / length, i / length) - 0.5);
                // increase river width near map bounds
                if (isRiver && (i < (this.points.length / 2) || endsOnMapBounds)) {
                    width = (1 + end ** 3 * 1.5) * this.width;
                }

                const calculatePoints = (width: number, hitbox: PolygonHitbox | undefined, points: Vector[]): void => {
                    let ray1 = Vec.scale(normal, width);
                    let ray2 = Vec.scale(normal, -width);

                    if (hitbox) {
                        ray1 = clipRayToPoly(current, ray1, hitbox);
                        ray2 = clipRayToPoly(current, ray2, hitbox);
                    }

                    points[i] = Vec.add(current, ray1);
                    points[this.points.length + length - i] = Vec.add(current, ray2);
                };

                if (isRiver&&!waterHB) {
                    calculatePoints(width, collidingRiver?.waterHitbox, waterPoints);
                }

                calculatePoints(width + bankWidth, collidingRiver?.bankHitbox, bankPoints);
            }
        }
        this.waterHitbox = isRiver ? (waterHB??new PolygonHitbox(waterPoints)) : undefined;
        this.bankHitbox = bankHB??new PolygonHitbox(bankPoints);
    }

    getControlPoints(t: number): {
        pt: number
        p0: Vector
        p1: Vector
        p2: Vector
        p3: Vector
    } {
        const count = this.points.length;
        t = Numeric.clamp(t, 0, 1);
        const i = ~~(t * (count - 1));
        const i1 = i === count - 1 ? i - 1 : i;
        const i2 = i1 + 1;
        const i0 = i1 > 0 ? i1 - 1 : i1;
        const i3 = i2 < count - 1 ? i2 + 1 : i2;

        return {
            pt: t * (count - 1) - i1,
            p0: this.points[i0],
            p1: this.points[i1],
            p2: this.points[i2],
            p3: this.points[i3]
        };
    }

    getTangent(t: number): Vector {
        const { pt, p0, p1, p2, p3 } = this.getControlPoints(t);
        return {
            x: catmullRomDerivative(pt, p0.x, p1.x, p2.x, p3.x),
            y: catmullRomDerivative(pt, p0.y, p1.y, p2.y, p3.y)
        };
    }

    getNormal(t: number): Vector {
        const tangent = this.getTangent(t);
        const vec = Vec.normalizeSafe(tangent, Vec.create(1, 0));
        return Vec.create(-vec.y, vec.x);
    }

    getPosition(t: number): Vector {
        const { pt, p0, p1, p2, p3 } = this.getControlPoints(t);

        return {
            x: catmullRom(pt, p0.x, p1.x, p2.x, p3.x),
            y: catmullRom(pt, p0.y, p1.y, p2.y, p3.y)
        };
    }

    getClosestT(position: Vector): number {
        let closestDistSq = Number.MAX_VALUE;
        let closestSegIdx = 0;
        for (let i = 0; i < this.points.length - 1; i++) {
            const distSq = Collision.distanceToLine(position, this.points[i], this.points[i + 1]);
            if (distSq < closestDistSq) {
                closestDistSq = distSq;
                closestSegIdx = i;
            }
        }

        const idx0 = closestSegIdx;
        const idx1 = idx0 + 1;
        const s0 = this.points[idx0];
        const s1 = this.points[idx1];
        const seg = Vec.sub(s1, s0);
        const t = Numeric.clamp(Vec.dotProduct(Vec.sub(position, s0), seg) / Vec.dotProduct(seg, seg), 0, 1);
        const len = this.points.length - 1;
        const tMin = Numeric.clamp((idx0 + t - 0.1) / len, 0, 1);
        const tMax = Numeric.clamp((idx0 + t + 0.1) / len, 0, 1);

        // Refine closest point by testing near the closest segment point
        let nearestT = (idx0 + t) / len;
        let nearestDistSq = Number.MAX_VALUE;
        const kIter = 8;
        for (let i = 0; i <= kIter; i++) {
            const testT = Numeric.lerp(i / kIter, tMin, tMax);
            const testPos = this.getPosition(testT);
            const testDistSq = Vec.squaredLength(Vec.sub(testPos, position));
            if (testDistSq < nearestDistSq) {
                nearestT = testT;
                nearestDistSq = testDistSq;
            }
        }

        // Refine by offsetting along the spline tangent
        const tangent = this.getTangent(nearestT);
        const tanLen = Vec.length(tangent);
        if (tanLen > 0) {
            const nearest = this.getPosition(nearestT);
            const offset = Vec.dotProduct(tangent, Vec.sub(position, nearest)) / tanLen;
            const offsetT = nearestT + offset / (tanLen * len);
            if (Vec.squaredLength(Vec.sub(position, this.getPosition(offsetT))) < Vec.squaredLength(Vec.sub(position, nearest))) {
                nearestT = offsetT;
            }
        }

        return nearestT;
    }
}
