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
        stream.writeUint16(GameConstants.protocolVersion);
        stream.writePlayerName(data.name);
        stream.writeBoolean(data.isMobile);

        Loots.writeToStream(stream, data.skin);
        Badges.writeOptional(stream, data.badge);

        for (const emote of data.emotes) {
            Emotes.writeOptional(stream, emote);
        }

        stream.writeBoolean(!(data.gun1==undefined||data.gun1==""))

        if(data.gun1){
            stream.writeUint16(data.gun1.length)
            stream.writeASCIIString(data.gun1,data.gun1.length)
        }

        stream.writeBoolean(!(data.gun2==undefined||data.gun2==""))

        if(data.gun2){
            stream.writeUint16(data.gun2.length)
            stream.writeASCIIString(data.gun2,data.gun2.length)
        }

        stream.writeBoolean(!(data.melee==undefined||data.melee==""))

        if(data.melee){
            stream.writeUint16(data.melee.length)
            stream.writeASCIIString(data.melee,data.melee.length)
        }
    },

    deserialize(stream) {
        const ret:JoinPacketData={
            protocolVersion: stream.readUint16(),
            name: stream.readPlayerName().replaceAll(/<[^>]+>/g, "").trim(), // Regex strips out HTML
            isMobile: stream.readBoolean(),

            skin: Loots.readFromStream(stream, true),
            badge: Badges.readOptional(stream),

            emotes: Array.from({ length: 6 }, () => Emotes.readOptional(stream)),
        };
        if(stream.readBoolean()){
            const ss=stream.readUint16()
            ret.gun1=stream.readASCIIString(ss)
        }
        if(stream.readBoolean()){
            const ss=stream.readUint16()
            ret.gun2=stream.readASCIIString(ss)
        }
        if(stream.readBoolean()){
            const ss=stream.readUint16()
            ret.melee=stream.readASCIIString(ss)
        }
        return ret
    }
});
