import { createPacket } from "./packet";

export type GameOverData = {
    readonly playerID: number
    readonly kills: number
    readonly damageDone: number
    readonly damageTaken: number
    readonly timeAlive: number
    readonly score:number
    readonly stopAfter:number
    readonly wonToo: boolean
} & ({
    readonly won: true
    readonly rank: 1
} | {
    readonly won: false
    readonly rank: number
});

export const GameOverPacket = createPacket("GameOverPacket")<GameOverData>({
    serialize(strm, data) {
        strm.writeUint8(data.rank)
            .writeBooleanGroup(data.wonToo,data.won)
            .writeObjectId(data.playerID)
            .writeUint8(data.kills)
            .writeUint32(data.score)
            .writeUint16(data.damageDone)
            .writeUint16(data.damageTaken)
            .writeUint16(data.timeAlive)
            .writeUint16(data.stopAfter);
    },

    deserialize(stream) {
        const rank = stream.readUint8();
        const bg=stream.readBooleanGroup()
        return {
            won: bg[0],
            wonToo:bg[1],
            rank,
            playerID: stream.readObjectId(),
            kills: stream.readUint8(),
            score: stream.readUint32(),
            damageDone: stream.readUint16(),
            damageTaken: stream.readUint16(),
            timeAlive: stream.readUint16(),
            stopAfter:stream.readUint16(),
        } as GameOverData;
    }
});
