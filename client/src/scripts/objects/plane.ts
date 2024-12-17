import { GameConstants, Layer } from "@common/constants";
import { adjacentOrEqualLayer } from "@common/utils/layer";
import { Geometry } from "@common/utils/math";
import { Vec, type Vector } from "@common/utils/vector";
import { type Game } from "../game";
import { type GameSound } from "../managers/soundManager";
import { PIXI_SCALE } from "../utils/constants";
import { SuroiSprite } from "../utils/pixi";

export class Plane {
    readonly game: Game;

    readonly startPosition: Vector;
    readonly endPosition: Vector;
    readonly image: SuroiSprite;
    readonly sound: GameSound;

    readonly airstrike:boolean;

    readonly startTime = Date.now();

    static readonly maxDistanceSquared = (GameConstants.maxPosition * 20) ** 2;

    constructor(game: Game, startPosition: Vector, direction: number, airstrike:boolean) {
        this.game = game;

        this.startPosition = startPosition;

        this.endPosition = Vec.add(
            this.startPosition,
            Vec.fromPolar(direction, this.game.map.width * 2)
        );

        this.airstrike=airstrike
        if(this.airstrike){
            this.sound = game.soundManager.play(
                "airstrike_plane",
                {
                    position: startPosition,
                    falloff: 0.5,
                    maxRange: 256,
                    dynamic: true
                }
            );
            this.image = new SuroiSprite("airstrike_plane")
            .setZIndex(Number.MAX_SAFE_INTEGER - 2) // todo: better logic for this lol
            .setRotation(direction)
            .setScale(4);
        }else{
            this.sound = game.soundManager.play(
                "airdrop_plane",
                {
                    position: startPosition,
                    falloff: 0.5,
                    maxRange: 256,
                    dynamic: true
                }
            );
            this.image = new SuroiSprite("airdrop_plane")
            .setZIndex(Number.MAX_SAFE_INTEGER - 2) // todo: better logic for this lol
            .setRotation(direction)
            .setScale(4);
        }

        game.camera.addObject(this.image);
    }

    update(): void {
        const position = this.sound.position = Vec.lerp(
            this.startPosition,
            this.endPosition,
            (Date.now() - this.startTime) / (this.airstrike?5000:(GameConstants.airdrop.flyTime * 2))
        );

        this.image.setVPos(Vec.scale(position, PIXI_SCALE));

        if (Geometry.distanceSquared(position, this.startPosition) > Plane.maxDistanceSquared) {
            this.destroy();
            this.game.planes.delete(this);
        }

        if (this.game.layer && this.game.layer !== Layer.Floor1) {
            this.image.visible = adjacentOrEqualLayer(Layer.Ground, this.game.layer);
            this.sound.maxRange = adjacentOrEqualLayer(Layer.Ground, this.game.layer) ? 256 : 0;
        }
    }

    destroy(): void {
        this.image.destroy();
    }
}
