import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";

export interface MapPingDefinition extends ObjectDefinition {
    /**
     * Color to tint the ping sprite and color the map pulse effect
     */
    readonly color: number
    /**
     * If the ping sprite will be added to the game camera
     */
    readonly showInGame: boolean
    /**
     * For how many seconds the ping will appear, in seconds
     */
    readonly lifetime: number
    /**
     * If the ping is a player ping
     *
     * When set to `true`, clients will be informed of the pinging player,
     * the player's teammate color will be used instead of definition color,
     * any previous pings from that player will be removed
     */
    readonly isPlayerPing: boolean
    readonly ignoreExpiration: boolean
    readonly sound?: string
}

export type PlayerPing = MapPingDefinition & { readonly isPlayerPing: true };
export type MapPing = MapPingDefinition & { readonly isPlayerPing?: false };

export const MapPings = ObjectDefinitions.withDefault<MapPingDefinition>()(
    "MapPings",
    {
        ignoreExpiration: false
    },
    ([derive]) => {
        const gamePingFactory = derive((idString: string, color: number,lifetime:number=120) => ({
            idString,
            color,
            name: idString,
            showInGame: false,
            lifetime: lifetime,
            isPlayerPing: false,
            sound: idString
        }));

        const playerPingFactory = derive((idString: string) => ({
            idString,
            name: idString,
            showInGame: true,
            lifetime: 120,
            isPlayerPing: true,
            color: 0xffffff,
            sound: idString
        }));

        return [
            gamePingFactory(["airdrop_ping", 0x00ffff], { ignoreExpiration: true }),
            gamePingFactory(["airstrike_ping", 0xffff00,8], { ignoreExpiration: true }),
            gamePingFactory(["nuke_ping", 0xffff00,8], { ignoreExpiration: true }),
            playerPingFactory(["warning_ping"]),
            playerPingFactory(["arrow_ping"], { ignoreExpiration: true }),
            playerPingFactory(["gift_ping"]),
            playerPingFactory(["heal_ping"])
        ];
    }
);
