import { GameConstants } from "../constants";
import { Badges, type BadgeDefinition } from "../definitions/badges";
import { Emotes, type EmoteDefinition } from "../definitions/emotes";
import { Loots } from "../definitions/loots";
import { type SkinDefinition } from "../definitions/skins";
import { createPacket } from "./packet";

export type JoinPacketData = {
    readonly protocolVersion: number
    readonly name: string
    readonly isMobile: boolean

    readonly skin: SkinDefinition
    readonly badge?: BadgeDefinition

    readonly emotes: ReadonlyArray<EmoteDefinition | undefined>,

    gun1?:string,
    gun2?:string,
    melee?:string
};

// protocol version is automatically set; use this type when
// creating an object for use by a JoinPacket
export type JoinPacketCreation = Omit<JoinPacketData, "protocolVersion">;

export const JoinPacket = createPacket("JoinPacket")<JoinPacketCreation, JoinPacketData>({
    serialize(stream, data) {
        const emotes = data.emotes;
        const hasBadge = data.badge !== undefined;
        stream.writeBooleanGroup2(
            data.isMobile,
            hasBadge,
            (data.melee!==undefined&&data.melee.length>0),
            (data.gun1!==undefined&&data.gun1.length>0),
            (data.gun2!==undefined&&data.gun2.length>0),
            emotes[0] !== undefined,
            emotes[1] !== undefined,
            emotes[2] !== undefined,
            emotes[3] !== undefined,
            emotes[4] !== undefined,
            emotes[5] !== undefined
        );

        stream.writeUint16(GameConstants.protocolVersion);
        stream.writePlayerName(data.name);

        Loots.writeToStream(stream, data.skin);

        if (hasBadge) {
            Badges.writeToStream(stream, data.badge);
        }

        if(data.melee){
            stream.writeUint16(data.melee.length)
            stream.writeString(data.melee.length,data.melee)
        }
        if(data.gun1){
            stream.writeUint16(data.gun1.length)
            stream.writeString(data.gun1.length,data.gun1)
        }
        if(data.gun2){
            stream.writeUint16(data.gun2.length)
            stream.writeString(data.gun2.length,data.gun2)
        }

        for (let i = 0; i < 6; i++) {
            const emote = emotes[i];
            if (emote !== undefined) {
                Emotes.writeToStream(stream, emote);
            }
        }
    },

    deserialize(stream) {
        const [
            isMobile,
            hasBadge,
            melee,
            gun1,
            gun2,
            ...emotes
        ] = stream.readBooleanGroup2();
        
        return {
            protocolVersion: stream.readUint16(),
            name: stream.readPlayerName().replaceAll(/<[^>]+>/g, "").trim(), // Regex strips out HTML
            isMobile,

            skin: Loots.readFromStream(stream),
            badge: hasBadge ? Badges.readFromStream(stream) : undefined,

            melee:melee?stream.readString(stream.readUint16()):undefined,
            gun1:gun1?stream.readString(stream.readUint16()):undefined,
            gun2:gun2?stream.readString(stream.readUint16()):undefined,
    
            emotes: Array.from({ length: 6 }, (_, i) => emotes[i] ? Emotes.readFromStream(stream) : undefined)
        };
    }
});
