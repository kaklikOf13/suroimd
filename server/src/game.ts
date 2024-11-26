import { defaultUnlockGuns, defaultUnlockMelees, defaultUnlockWeapons, GameConstants, KillfeedMessageType, Layer, ObjectCategory, TeamSize } from "@common/constants";
import { type ExplosionDefinition } from "@common/definitions/explosions";
import { Loots, type LootDefinition } from "@common/definitions/loots";
import { MapPings, type MapPing } from "@common/definitions/mapPings";
import { Obstacles, type ObstacleDefinition } from "@common/definitions/obstacles";
import { SyncedParticles, type SyncedParticleDefinition, type SyncedParticleSpawnerDefinition } from "@common/definitions/syncedParticles";
import { type ThrowableDefinition } from "@common/definitions/throwables";
import { PlayerInputPacket } from "@common/packets/inputPacket";
import { JoinPacket, type JoinPacketData } from "@common/packets/joinPacket";
import { JoinedPacket } from "@common/packets/joinedPacket";
import { KillFeedPacket, type KillFeedPacketData } from "@common/packets/killFeedPacket";
import { type InputPacket, type OutputPacket } from "@common/packets/packet";
import { PacketStream } from "@common/packets/packetStream";
import { PingPacket } from "@common/packets/pingPacket";
import { SpectatePacket } from "@common/packets/spectatePacket";
import { type PingSerialization } from "@common/packets/updatePacket";
import { CircleHitbox, type Hitbox } from "@common/utils/hitbox";
import { EaseFunctions, Geometry, Numeric, Statistics } from "@common/utils/math";
import { mergeDeep, Timeout } from "@common/utils/misc";
import { ItemType, MapObjectSpawnMode, SetArray, type ReifiableDef } from "@common/utils/objectDefinitions";
import { pickRandomInArray, randomFloat, randomPointInsideCircle, randomRotation } from "@common/utils/random";
import { type SuroiByteStream } from "@common/utils/suroiByteStream";
import { Vec, type Vector } from "@common/utils/vector";
import { type WebSocket } from "uWebSockets.js";
import { parentPort } from "worker_threads";
import { Config } from "./config";
import { MapName, Maps } from "./data/maps";
import { WorkerMessages, type GameData, type WorkerMessage } from "./gameManager";
import { Gas } from "./gas";
import { GunItem } from "./inventory/gunItem";
import type { MeleeItem } from "./inventory/meleeItem";
import { ThrowableItem } from "./inventory/throwableItem";
import { GameMap } from "./map";
import { Bullet, type DamageRecord, type ServerBulletOptions } from "./objects/bullet";
import { type Emote } from "./objects/emote";
import { Explosion } from "./objects/explosion";
import { type BaseGameObject, type GameObject } from "./objects/gameObject";
import { Loot, type ItemData } from "./objects/loot";
import { Obstacle } from "./objects/obstacle";
import { Parachute } from "./objects/parachute";
import { Player, type PlayerContainer } from "./objects/player";
import { SyncedParticle } from "./objects/syncedParticle";
import { ThrowableProjectile } from "./objects/throwableProj";
import { PluginManager } from "./pluginManager";
import { Group, Team } from "./team";
import { Grid } from "./utils/grid";
import { IDAllocator } from "./utils/idAllocator";
import { cleanUsername, Logger, removeFrom } from "./utils/misc";
import { GoapAgent } from "./utils/goap";
import { Building } from "./objects/building";
import { Guns } from "@common/definitions/guns";
import { Melees } from "@common/definitions/melees";
import { DefaultGamemode, Gamemode, Gamemodes, SpawnMode } from "./data/gamemode";
/*
    eslint-disable

    @stylistic/indent-binary-ops
*/

/*
    `@stylistic/indent-binary-ops`: eslint sucks at indenting ts types
 */


export class Game implements GameData {
    public readonly id: number;

    readonly map: GameMap;
    readonly gamemode:Gamemode;
    readonly gas: Gas;
    readonly grid: Grid;
    readonly pluginManager = new PluginManager(this);

    readonly partialDirtyObjects = new Set<BaseGameObject>();
    readonly fullDirtyObjects = new Set<BaseGameObject>();

    updateObjects = false;

    readonly livingPlayers = new Set<Player>();
    readonly livingNpcs=new Set<Player>();
    /**
     * Players that have connected but haven't sent a JoinPacket yet
     */
    readonly connectingPlayers = new Set<Player>();
    readonly connectedPlayers = new Set<Player>();
    readonly spectatablePlayers: Player[] = [];
    /**
     * New players created this tick
     */
    readonly newPlayers: Player[] = [];
    /**
    * Players deleted this tick
    */
    readonly deletedPlayers: number[] = [];

    /**
     * Packets created this tick that will be sent to all players
     */
    readonly packets: InputPacket[] = [];

    readonly maxTeamSize: TeamSize;

    readonly teamMode: boolean;
    

    readonly teams = new SetArray<Team>();
    readonly npcTeams = new Map<number,Team>();
    readonly groups = new Map<number,Group>();

    private _nextTeamID = -1;
    get nextTeamID(): number { return ++this._nextTeamID; }

    readonly customTeams: globalThis.Map<string, Team> = new globalThis.Map<string, Team>();

    readonly explosions: Explosion[] = [];
    readonly emotes: Emote[] = [];

    /**
     * All bullets that currently exist
     */
    readonly bullets = new Set<Bullet>();
    /**
     * All bullets created this tick
     */
    readonly newBullets: Bullet[] = [];

    /**
     * All airdrops
     */
    readonly airdrops: Airdrop[] = [];

    /**
     * All planes this tick
     */
    readonly planes: Array<{
        readonly position: Vector
        readonly direction: number
    }> = [];

    readonly detectors: Obstacle[] = [];

    /**
     * All map pings this tick
     */
    readonly mapPings: PingSerialization[] = [];

    private readonly _timeouts = new Set<Timeout>();

    addTimeout(callback: () => void, delay = 0): Timeout {
        const timeout = new Timeout(callback, this.now + delay);
        this._timeouts.add(timeout);
        return timeout;
    }

    private _started = false;

    // #region GameData interface members

    startedTime = Number.MAX_VALUE; // Default of Number.MAX_VALUE makes it so games that haven't started yet are joined first
    allowJoin = false;
    over = false;
    stopped = false;
    get aliveCount(): number {
        return Math.max(this.livingPlayers.size-this.livingNpcs.size,0);
    }

    // #endregion

    startTimeout?: Timeout;

    aliveCountDirty = false;

    /**
     * The value of `Date.now()`, as of the start of the tick.
     */
    private _now = Date.now();
    get now(): number { return this._now; }

    private readonly idealDt = 1000 / Config.tps;

    /**
     * Game Tick delta time
     */
    private _dt = this.idealDt;
    get dt(): number { return this._dt; }

    private readonly _tickTimes: number[] = [];

    private readonly _idAllocator = new IDAllocator(16);

    private readonly _start = this._now;
    get start(): number { return this._start; }

    /**
     * **Warning**: This is a getter _with side effects_! Make
     * sure to either use the id returned by this getter or
     * to return it.
     */
    get nextObjectID(): number {
        return this._idAllocator.takeNext();
    }

    killEveryone(){
        for(const p of this.livingPlayers.values()){
            p.die({
                
            })
        }
    }

    constructor(id: number, maxTeamSize: TeamSize,gamemode?:string) {
        this.id = id;
        this.maxTeamSize = maxTeamSize;
        this.teamMode = this.maxTeamSize > TeamSize.Solo;
        this.updateGameData({
            aliveCount: 0,
            allowJoin: false,
            over: false,
            stopped: false,
            startedTime: -1
        });

        const { width, height } = Maps[Config.map.split(":")[0] as MapName];
        this.grid = new Grid(this, width, height);

        if(gamemode){
            this.gamemode=mergeDeep(DefaultGamemode,Gamemodes[gamemode])
        }else{
            this.gamemode=DefaultGamemode
        }

        this.map = new GameMap(this, this.gamemode.map||Config.map);

        this.gas = new Gas(this);

        this.pluginManager.loadPlugins();

        this.setGameData({ allowJoin: true });

        this.pluginManager.emit("game_created", this);
        Logger.log(`Game ${this.id} | Created in ${Date.now() - this._start} ms`);

        // Start the tick loop
        this.tick();
    }

    onMessage(stream: SuroiByteStream, player: Player): void {
        const packetStream = new PacketStream(stream);
        while (true) {
            const packet = packetStream.deserializeClientPacket();
            if (packet === undefined) break;
            this.onPacket(packet, player);
        }
    }

    onPacket(packet: OutputPacket, player: Player): void {
        switch (true) {
            case packet instanceof JoinPacket:
                this.activatePlayer(player, packet.output);
                break;
            case packet instanceof PlayerInputPacket:
                // Ignore input packets from players that haven't finished joining, dead players, and if the game is over
                if (!player.joined || player.dead || player.game.stopped) return;
                player.processInputs(packet.output);
                break;
            case packet instanceof SpectatePacket:
                player.spectate(packet.output);
                break;
            case packet instanceof PingPacket: {
                if (Date.now() - player.lastPingTime < 4000) return;
                player.lastPingTime = Date.now();
                const stream = new PacketStream(new ArrayBuffer(8));
                stream.serializeServerPacket(PingPacket.create());
                player.sendData(stream.getBuffer());
                break;
            }
        }
    }

    readonly tick = (): void => {
        const now = Date.now();
        this._dt = now - this._now;
        this._now = now;

        // execute timeouts
        for (const timeout of this._timeouts) {
            if (timeout.killed) {
                this._timeouts.delete(timeout);
                continue;
            }

            if (this.now > timeout.end) {
                timeout.callback();
                this._timeouts.delete(timeout);
            }
        }

        for (const loot of this.grid.pool.getCategory(ObjectCategory.Loot)) {
            loot.update();
        }

        for (const parachute of this.grid.pool.getCategory(ObjectCategory.Parachute)) {
            parachute.update();
        }

        for (const projectile of this.grid.pool.getCategory(ObjectCategory.ThrowableProjectile)) {
            projectile.update();
        }

        for (const syncedParticle of this.grid.pool.getCategory(ObjectCategory.SyncedParticle)) {
            syncedParticle.update();
        }

        // Update bullets
        let records: DamageRecord[] = [];
        for (const bullet of this.bullets) {
            records = records.concat(bullet.update());

            if (bullet.dead) {
                const onHitExplosion = bullet.definition.onHitExplosion;
                if (onHitExplosion && !bullet.reflected) {
                    this.addExplosion(
                        onHitExplosion,
                        bullet.position,
                        bullet.shooter,
                        bullet.layer,
                        bullet.sourceGun instanceof GunItem ? bullet.sourceGun : undefined
                    );
                }
                this.bullets.delete(bullet);
            }
        }

        /*
            Do the damage after updating all bullets
            This is to make sure bullets hitting the same object on the same tick will all die so
            they don't de-sync with the client

            Example: a shotgun insta-killing a crate—on the client all bullets will hit the crate,
            while on the server, the usual approach of dealing damage on-update would cause some
            bullets to pass through unhindered since the crate would have been destroyed by the
            first pellets.
        */
        for (const { object, damage, source, weapon, position } of records) {
            object.damage({
                amount: damage,
                source,
                weaponUsed: weapon,
                position: position
            });
        }

        // Handle explosions
        for (const explosion of this.explosions) {
            explosion.explode();
        }

        // Update detectors
        for (const detector of this.detectors) {
            detector.updateDetector();
        }

        for(let i=0;i<this.map.obstacles.length;i++){
            if(this.map.obstacles[i].dead){
                this.map.obstacles.splice(i,1);
                i--;
                continue;
            }
            this.map.obstacles[i].update()
        }

        // Update gas
        this.gas.tick();

        // Delete players that haven't sent a JoinPacket after 5 seconds
        for (const player of this.connectingPlayers) {
            if (this.now - player.joinTime > 10000) {
                player.disconnect("JoinPacket not received after 5 seconds");
            }
        }

        // First loop over players: movement, animations, & actions
        for (const player of this.grid.pool.getCategory(ObjectCategory.Player)) {
            if (!player.dead) player.update();
        }

        // Cache objects serialization
        for (const partialObject of this.partialDirtyObjects) {
            if (!this.fullDirtyObjects.has(partialObject)) {
                partialObject.serializePartial();
            }
        }
        for (const fullObject of this.fullDirtyObjects) {
            fullObject.serializeFull();
        }

        //NPCS AI
        for(const npc of this.livingNpcs){
            npc.AI()
        }

        // Second loop over players: calculate visible objects & send updates
        for (const player of this.connectedPlayers) {
            if (!player.joined) continue;
            player.secondUpdate();
        }

        // Third loop over players: clean up after all packets have been sent
        for (const player of this.connectedPlayers) {
            if (!player.joined) continue;

            player.postPacket();
        }

        // Reset everything
        this.fullDirtyObjects.clear();
        this.partialDirtyObjects.clear();
        this.newBullets.length = 0;
        this.explosions.length = 0;
        this.emotes.length = 0;
        this.newPlayers.length = 0;
        this.deletedPlayers.length = 0;
        this.packets.length = 0;
        this.planes.length = 0;
        this.mapPings.length = 0;
        this.aliveCountDirty = false;
        this.gas.dirty = false;
        this.gas.completionRatioDirty = false;
        this.updateObjects = false;

        if (
            this._started
            && !this.over
            && (
                this.gamemode.group ? new Set([...this.livingPlayers].map(p => p.groupID)).size <= 1:(this.teamMode
                    ? this.aliveCount <= (this.maxTeamSize as number) && new Set([...this.livingPlayers].map(p => p.teamID)).size <= 1
                    : this.aliveCount <= 1)
            )
        ) {
            this.pluginManager.emit("game_end", this);

            this.setGameData({ allowJoin: false, over: true });

            // End the game in 1 second
            this.addTimeout(() => {
                for (const player of this.livingPlayers) {
                    const { movement } = player;
                    movement.up = movement.down = movement.left = movement.right = false;
                    player.attacking = false;
                    player.sendEmote(player.loadout.emotes[4]);
                    player.sendGameOverPacket(true);
                    this.pluginManager.emit("player_did_win", player);
                }
                setTimeout(()=>{
                    this.setGameData({ stopped: true });
                    Logger.log(`Game ${this.id} | Ended`);
                },100)
            }, 2000);
        }

        if (this.aliveCount >= this.gamemode.maxPlayersPerGame) {
            this.createNewGame();
        }

        // Record performance and start the next tick
        // THIS TICK COUNTER IS WORKING CORRECTLY!
        // It measures the time it takes to calculate a tick, not the time between ticks.
        const tickTime = Date.now() - this.now;
        this._tickTimes.push(tickTime);

        if (this._tickTimes.length >= 200) {
            const mspt = Statistics.average(this._tickTimes);
            const stddev = Statistics.stddev(this._tickTimes);
            Logger.log(`Game ${this.id} | ms/tick: ${mspt.toFixed(2)} ± ${stddev.toFixed(2)} | Load: ${((mspt / this.idealDt) * 100).toFixed(1)}%`);
            this._tickTimes.length = 0;
        }

        this.pluginManager.emit("game_tick", this);

        if (!this.stopped) {
            setTimeout(this.tick, this.idealDt);
        }
    };

    setGameData(data: Partial<Omit<GameData, "aliveCount">>): void {
        for (const [key, value] of Object.entries(data)) {
            // HACK this is kinda really fkin dumb, i dunno why this isn't working
            this[key as keyof typeof data] = value as never;
        }
        this.updateGameData(data);
    }

    updateGameData(data: Partial<GameData>): void {
        parentPort?.postMessage({ type: WorkerMessages.UpdateGameData, data } satisfies WorkerMessage);
    }

    createNewGame(): void {
        if (!this.allowJoin) return; // means a new game has already been created by this game

        parentPort?.postMessage({ type: WorkerMessages.CreateNewGame });
        Logger.log(`Game ${this.id} | Attempting to create new game`);
        this.setGameData({ allowJoin: false });
    }

    private _killLeader: Player | undefined;
    get killLeader(): Player | undefined { return this._killLeader; }

    updateKillLeader(player: Player): void {
        const oldKillLeader = this._killLeader;

        if (player.kills > (this._killLeader?.kills ?? (GameConstants.player.killLeaderMinKills - 1)) && !player.dead) {
            this._killLeader = player;

            if (oldKillLeader !== this._killLeader) {
                this._sendKillLeaderKFPacket(KillfeedMessageType.KillLeaderAssigned);
            }
        } else if (player === oldKillLeader) {
            this._sendKillLeaderKFPacket(KillfeedMessageType.KillLeaderUpdated);
        }
    }

    killLeaderDead(killer?: Player): void {
        this._sendKillLeaderKFPacket(KillfeedMessageType.KillLeaderDeadOrDisconnected, { attackerId: killer?.id });
        let newKillLeader: Player | undefined;
        for (const player of this.livingPlayers) {
            if (player.kills > (newKillLeader?.kills ?? (GameConstants.player.killLeaderMinKills - 1)) && !player.dead) {
                newKillLeader = player;
            }
        }
        this._killLeader = newKillLeader;
        this._sendKillLeaderKFPacket(KillfeedMessageType.KillLeaderAssigned);
    }

    killLeaderDisconnected(leader: Player): void {
        this._sendKillLeaderKFPacket(KillfeedMessageType.KillLeaderDeadOrDisconnected, { disconnected: true });
        let newKillLeader: Player | undefined;
        for (const player of this.livingPlayers) {
            if (player === leader) continue;
            if (player.kills > (newKillLeader?.kills ?? (GameConstants.player.killLeaderMinKills - 1)) && !player.dead) {
                newKillLeader = player;
            }
        }

        if ((this._killLeader = newKillLeader) !== undefined) {
            this._sendKillLeaderKFPacket(KillfeedMessageType.KillLeaderAssigned);
        }
    }

    private _sendKillLeaderKFPacket<
        Message extends
            | KillfeedMessageType.KillLeaderAssigned
            | KillfeedMessageType.KillLeaderDeadOrDisconnected
            | KillfeedMessageType.KillLeaderUpdated
    >(
        messageType: Message,
        options?: Partial<Omit<KillFeedPacketData & { readonly messageType: NoInfer<Message> }, "messageType" | "playerID" | "attackerKills">>
    ): void {
        if (this._killLeader === undefined) return;

        this.packets.push(
            KillFeedPacket.create({
                messageType,
                victimId: this._killLeader.id,
                attackerKills: this._killLeader.kills,
                ...options
            } as KillFeedPacketData & { readonly messageType: Message })
        );
    }

    addPlayerIntoGroup(player:Player,id:number){
        if(id>=this.groups.size){
            this.groups.set(id,new Group(id))
            this.groups.get(id)!.addPlayer(player)
        }else{
            this.groups.get(id)!.addPlayer(player)
        }
        player.dirty.group=true
        player.setDirty()
    }

    addPlayer(socket: WebSocket<PlayerContainer>): Player | undefined {
        if (this.pluginManager.emit("player_will_connect")) {
            return undefined;
        }

        let spawnPosition = Vec.create(this.map.width / 2, this.map.height / 2);
        let spawnLayer;

        let team: Team | undefined;
        if (this.teamMode) {
            const { teamID, autoFill } = socket.getUserData();

            if (teamID) {
                team = this.customTeams.get(teamID);

                if (
                    !team // team doesn't exist
                    || (team.players.length && !team.hasLivingPlayers()) // team isn't empty but has no living players
                    || team.players.length >= (this.maxTeamSize as number) // team is full
                ) {
                    this.teams.add(team = new Team(this.nextTeamID, autoFill));
                    this.customTeams.set(teamID, team);
                }
            } else {
                const vacantTeams = this.teams.valueArray.filter(
                    team =>
                        team.autoFill
                        && team.players.length < (this.maxTeamSize as number)
                        && team.hasLivingPlayers()
                );
                if (vacantTeams.length) {
                    team = pickRandomInArray(vacantTeams);
                } else {
                    this.teams.add(team = new Team(this.nextTeamID));
                }
            }
        }

        switch (this.gamemode.spawn.mode) {
            case SpawnMode.Normal: {
                const hitbox = new CircleHitbox(5);
                const gasPosition = this.gas.currentPosition;
                const gasRadius = this.gas.newRadius ** 2;
                const teamPosition = this.teamMode
                    // teamMode should guarantee the `team` object's existence
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    ? pickRandomInArray(team!.getLivingPlayers())?.position
                    : undefined;

                let foundPosition = false;
                for (let tries = 0; !foundPosition && tries < 200; tries++) {
                    const position = this.map.getRandomPosition(
                        hitbox,
                        {
                            maxAttempts: 500,
                            spawnMode: MapObjectSpawnMode.GrassAndSand,
                            getPosition: this.teamMode && teamPosition
                                ? () => randomPointInsideCircle(teamPosition, 20, 10)
                                : undefined,
                            collides: position => Geometry.distanceSquared(position, gasPosition) >= gasRadius
                        }
                    );

                    // Break if the above code couldn't find a valid position, as it's unlikely that subsequent loops will
                    if (!position) break;
                    else spawnPosition = position;

                    // Ensure the position is at least 60 units from other players
                    foundPosition = true;
                    const radiusHitbox = new CircleHitbox(60, spawnPosition);
                    for (const object of this.grid.intersectsHitbox(radiusHitbox)) {
                        if (
                            object.isPlayer
                            // teamMode should guarantee the `team` object's existence
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            && (!this.teamMode || !team!.players.includes(object))
                        ) {
                            foundPosition = false;
                        }
                    }
                }

                // Spawn on top of a random teammate if a valid position couldn't be found
                if (!foundPosition && teamPosition) spawnPosition = teamPosition;
                break;
            }
            case SpawnMode.Radius: {
                const { x, y } = this.gamemode.spawn.position;
                spawnPosition = randomPointInsideCircle(
                    Vec.create(x, y),
                    this.gamemode.spawn.radius
                );
                break;
            }
            case SpawnMode.Fixed: {
                const { x, y } = this.gamemode.spawn.position;
                spawnPosition = Vec.create(x, y);
                spawnLayer =this.gamemode.spawn.layer ?? Layer.Ground;
                break;
            }
            case SpawnMode.Center: {
                // no-op; this is the default
                break;
            }
        }

        // Player is added to the players array when a JoinPacket is received from the client
        const player = new Player(this, spawnPosition, socket, spawnLayer, team);
        this.connectingPlayers.add(player);
        this.pluginManager.emit("player_did_connect", player);
        return player;
    }

    // Called when a JoinPacket is sent by the client
    activatePlayer(player: Player, packet: JoinPacketData): void {
        const rejectedBy = this.pluginManager.emit("player_will_join", { player, joinPacket: packet });
        if (rejectedBy) {
            player.disconnect(`Connection rejected by server plugin '${rejectedBy.constructor.name}'`);
            return;
        }

        if (packet.protocolVersion !== GameConstants.protocolVersion&&!player.isNpc) {
            player.disconnect(`Invalid game version (expected ${GameConstants.protocolVersion}, was ${packet.protocolVersion})`);
            return;
        }

        if(Config.allowRoles!==undefined&&(!player.role||!Config.allowRoles.includes(player.role))){
            player.disconnect(`Don't Have Permition To Join(expected ${GameConstants.protocolVersion}, was ${packet.protocolVersion})`);
            return;
        }

        player.name = cleanUsername(packet.name);

        player.isMobile = packet.isMobile;
        const skin = packet.skin;
        if (
            skin.itemType === ItemType.Skin
            && !skin.hideFromLoadout
            && ((skin.roleRequired ?? player.role) === player.role)
        ) {
            player.loadout.skin = skin;
        }

        const badge = packet.badge;
        if (!badge?.roles?.length || (player.role !== undefined && badge.roles.includes(player.role))) {
            player.loadout.badge = badge;
        }
        player.loadout.emotes = packet.emotes;
        
        if(this.gamemode.weaponsSelect){
            const weapons=[defaultUnlockGuns,defaultUnlockMelees]
            if(packet.gun1&&Guns.fromStringSafe(packet.gun1)&&weapons[0].includes(packet.gun1)){
                player.inventory.addOrReplaceWeapon(0,Guns.fromString(packet.gun1 as never))
                const w=player.inventory.getWeapon(0) as GunItem
                w.ammo=w.definition.capacity
            }
            if(packet.gun2&&Guns.fromStringSafe(packet.gun2)&&weapons[0].includes(packet.gun2)){
                player.inventory.addOrReplaceWeapon(1,Guns.fromString(packet.gun2 as never))
                const w=player.inventory.getWeapon(1) as GunItem
                w.ammo=w.definition.capacity
            }
            if(packet.melee&&Melees.fromStringSafe(packet.melee)&&weapons[1].includes(packet.melee)){
                player.inventory.addOrReplaceWeapon(2,Melees.fromString(packet.melee as never))
            }
        }

        this.livingPlayers.add(player);
        this.spectatablePlayers.push(player);
        this.connectedPlayers.add(player);
        this.newPlayers.push(player);
        this.grid.addObject(player);
        player.setDirty();
        this.aliveCountDirty = true;
        this.updateObjects = true;
        this.updateGameData({ aliveCount: this.aliveCount });

        player.joined = true;

        player.sendPacket(
            JoinedPacket.create(
                {
                    maxTeamSize: this.maxTeamSize,
                    teamID: player.teamID ?? 0,
                    groupMode:this.gamemode.group,
                    emotes: player.loadout.emotes
                }
            )
        );

        player.sendData(this.map.buffer);

        if(player.isNpc){
            this.livingNpcs.add(player)
        }else{
            this.connectingPlayers.delete(player);
        }

        this.addTimeout(() => { player.disableInvulnerability(); }, 5000);

        if (
            (this.teamMode ? this.teams.size : this.aliveCount) > 1
            && !this._started
            && this.startTimeout === undefined
        ) {
            this.startTimeout = this.addTimeout(() => {
                this.StartGame()
            }, this.gamemode.start_after*1000);
        }

        Logger.log(`Game ${this.id} | "${player.name}" joined`);
        // AccessLog to store usernames for this connection
        if (Config.protection?.punishments) {
            const username = player.name;
            if (username) {
                fetch(
                    `${Config.protection.punishments.url}/accesslog/${player.ip || "none"}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "api-key": Config.protection.punishments.password || "none"
                        },
                        body: `{ "username": "${username}" }`
                    }
                // you fuckin stupid or smth?
                // eslint-disable-next-line @typescript-eslint/use-unknown-in-catch-callback-variable
                ).catch(console.error);
            }
        }

        if(this.gamemode.group){
            this.addPlayerIntoGroup(player,this.gamemode.defaultGroup)
        }

        this.pluginManager.emit("player_did_join", { player, joinPacket: packet });
    }
    StartGame(){
        if(!this._started){
            this._started = true;
            this.setGameData({ startedTime: this.now });
            this.gas.advanceGasStage();
            this.map.generate_after_start();

            this.pluginManager.emit("game_started",this)

            this.addTimeout(this.createNewGame.bind(this), this.gamemode.joinTime * 1000);
            this.addTimeout(this.IATargetCheck.bind(this),3000);

            for(const p of this.livingPlayers.values()){
                p.setDirty()
            }
        }
    }

    IATargetCheck(){
        for(const npc of this.livingNpcs){
            if(npc.goapAgent){
                npc.goapAgent.targetCheck()
            }
        }
        this.addTimeout(this.IATargetCheck.bind(this),1300)
    }

    removePlayer(player: Player): void {
        if (player === this.killLeader) {
            this.killLeaderDisconnected(player);
        }

        player.disconnected = true;
        this.aliveCountDirty = true;
        this.connectingPlayers.delete(player);
        this.connectedPlayers.delete(player);

        if (player.canDespawn) {
            this.livingPlayers.delete(player);
            if(player.isNpc){
                this.livingNpcs.delete(player);
            }
            this.removeObject(player);
            this.deletedPlayers.push(player.id);
            removeFrom(this.spectatablePlayers, player);
            this.updateGameData({ aliveCount: this.aliveCount });

            if (this.teamMode) {
                const team = player.team;
                if (team) {
                    team.removePlayer(player);

                    if (!team.players.length) this.teams.delete(team);
                }
                player.teamWipe();
                player.beingRevivedBy?.action?.cancel();
            }
        } else {
            player.rotation = 0;
            player.movement.up = player.movement.down = player.movement.left = player.movement.right = false;
            player.attacking = false;
            player.setPartialDirty();

            if (this.teamMode && this.now - player.joinTime < 10000) {
                player.team?.removePlayer(player);
            }
        }

        if (player.spectating !== undefined) {
            player.spectating.spectators.delete(player);
        }

        if (this.aliveCount < 2) {
            this.startTimeout?.kill();
            this.startTimeout = undefined;
        }

        if(!player.isNpc){
            try {
                player.socket?.close();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (_) {
                /* not a really big deal if we can't close the socket */
                // when does this ever fail?
            }
        }
        this.pluginManager.emit("player_disconnect", player);
    }

    addNpc(position:Vector,join:JoinPacketData,layer:number,protectBuild?:Building,team?:number):Player{
        let t:Team|undefined=undefined
        if(team!==undefined){
            t=this.npcTeams.get(team)??this.npcTeams.set(team,new Team(team,false)).get(team)
        }
        const npc=new Player(this,position,undefined,layer,t)
        npc.autoReload=false
        npc.goapAgent=new GoapAgent(npc,protectBuild)
        npc.isNpc=true
        this.activatePlayer(npc,join)
        npc.teamID=team
        return npc
    }

    /**
     * Adds a `Loot` item to the game world
     * @param definition The type of loot to add. Prefer passing `LootDefinition` if possible
     * @param position The position to spawn this loot at
     * @param count Optionally define an amount of this loot (note that this does not equate spawning
     * that many `Loot` objects, but rather how many the singular `Loot` object will contain)
     * @returns The created loot object
     */
    addLoot<Def extends LootDefinition = LootDefinition>(
        definition: ReifiableDef<Def>,
        position: Vector,
        layer: Layer,
        { count, pushVel, jitterSpawn = true, data }: {
            readonly count?: number
            readonly pushVel?: number
            /**
             * Whether to add a random offset to the given position
             */
            readonly jitterSpawn?: boolean
            readonly data?: ItemData<Def>
        } = {}
    ): Loot | undefined {
        const args = {
            position,
            layer,
            count,
            pushVel,
            jitterSpawn,
            data
        };

        definition = Loots.reify<Def>(definition);

        if (
            this.pluginManager.emit(
                "loot_will_generate",
                {
                    definition,
                    ...args
                }
            )
        ) return;

        const loot = new Loot<Def>(
            this,
            definition,
            jitterSpawn
                ? Vec.add(
                    position,
                    randomPointInsideCircle(Vec.create(0, 0), GameConstants.lootSpawnDistance)
                )
                : position,
            layer,
            {
                count,
                pushVel,
                data
            }
        );
        this.grid.addObject(loot);

        this.pluginManager.emit(
            "loot_did_generate",
            { loot, ...args }
        );

        return loot;
    }

    removeLoot(loot: Loot): void {
        loot.dead = true;
        this.removeObject(loot);
    }

    addBullet(source: GunItem | Explosion, shooter: GameObject, options: ServerBulletOptions): Bullet {
        const bullet = new Bullet(
            this,
            source,
            shooter,
            options
        );

        this.bullets.add(bullet);
        this.newBullets.push(bullet);

        return bullet;
    }

    addExplosion(
        type: ReifiableDef<ExplosionDefinition>,
        position: Vector,
        source: GameObject,
        layer: Layer,
        weapon?: GunItem | MeleeItem | ThrowableItem,
        damageMod = 1,
        owner?:ThrowableProjectile
    ): Explosion {
        const explosion = new Explosion(this, type, position, source, layer, weapon, damageMod,owner);
        this.explosions.push(explosion);
        return explosion;
    }

    addProjectile(definition: ThrowableDefinition, position: Vector, layer: Layer, source: ThrowableItem): ThrowableProjectile {
        const projectile = new ThrowableProjectile(this, position, layer, definition, source);
        this.grid.addObject(projectile);
        return projectile;
    }

    removeProjectile(projectile: ThrowableProjectile): void {
        this.removeObject(projectile);
        projectile.dead = true;
    }

    addSyncedParticle(definition: SyncedParticleDefinition, position: Vector, layer: Layer | number, creatorID?: number): SyncedParticle {
        const syncedParticle = new SyncedParticle(this, definition, position, layer, creatorID);
        this.grid.addObject(syncedParticle);
        return syncedParticle;
    }

    removeSyncedParticle(syncedParticle: SyncedParticle): void {
        this.removeObject(syncedParticle);
        syncedParticle.dead = true;
    }

    addSyncedParticles(particles: SyncedParticleSpawnerDefinition, position: Vector, layer: Layer | number): void {
        const particleDef = SyncedParticles.fromString(particles.type);
        const { spawnRadius, count, deployAnimation } = particles;

        const duration = deployAnimation?.duration;
        const circOut = EaseFunctions.cubicOut;

        const setParticleTarget = duration
            ? (particle: SyncedParticle, target: Vector) => {
                particle.setTarget(target, duration, circOut);
            }
            : (particle: SyncedParticle, target: Vector) => {
                particle._position = target;
            };

        const spawnParticles = (amount = 1): void => {
            for (let i = 0; i++ < amount; i++) {
                setParticleTarget(
                    this.addSyncedParticle(
                        particleDef,
                        position,
                        layer
                    ),
                    Vec.add(
                        Vec.fromPolar(
                            randomRotation(),
                            randomFloat(0, spawnRadius)
                        ),
                        position
                    )
                );
            }
        };

        if (deployAnimation?.staggering) {
            const staggering = deployAnimation.staggering;
            const initialAmount = staggering.initialAmount ?? 0;

            spawnParticles(initialAmount);

            const addTimeout = this.addTimeout.bind(this);
            const addParticles = spawnParticles.bind(null, staggering.spawnPerGroup);
            const delay = staggering.delay;

            for (let i = initialAmount, j = 1; i < count; i++, j++) {
                addTimeout(addParticles, j * delay);
            }
        } else {
            spawnParticles(particles.count);
        }
    }

    /**
     * Delete an object and give the id back to the allocator
     * @param object The object to delete
     */
    removeObject(object: GameObject): void {
        this.grid.removeObject(object);
        this._idAllocator.give(object.id);
        this.updateObjects = true;
    }

    summonAirdrop(position: Vector): void {
        if (this.pluginManager.emit("airdrop_will_summon", { position })) return;

        const paddingFactor = 1.25;

        const crateDef = Obstacles.fromString("airdrop_crate_locked");
        const crateHitbox = (crateDef.spawnHitbox ?? crateDef.hitbox).clone();
        let thisHitbox = crateHitbox.clone();

        let collided = true;
        let attempts = 0;
        let randomInt: number | undefined;

        while (collided) {
            if (attempts === 500) {
                switch (true) {
                    case position.x < this.map.height / 2 && position.y < this.map.height / 2:
                        randomInt = [1, 2, 3][Math.floor(Math.random() * 3)];
                        break;
                    case position.x > this.map.height / 2 && position.y < this.map.height / 2:
                        randomInt = [1, 4, 5][Math.floor(Math.random() * 3)];
                        break;
                    case position.x < this.map.height / 2 && position.y > this.map.height / 2:
                        randomInt = [3, 6, 7][Math.floor(Math.random() * 3)];
                        break;
                    case position.x > this.map.height / 2 && position.y > this.map.height / 2:
                        randomInt = [4, 6, 8][Math.floor(Math.random() * 3)];
                        break;
                }
            }

            if (randomInt !== undefined) {
                const distance = crateHitbox.toRectangle().max.x * 2 * paddingFactor;

                switch (randomInt) {
                    case 1:
                        position.y = position.y + distance;
                        break;
                    case 2:
                        position.x = position.x + distance;
                        position.y = position.y + distance;
                        break;
                    case 3:
                        position.x = position.x + distance;
                        break;
                    case 4:
                        position.x = position.x - distance;
                        break;
                    case 5:
                        position.x = position.x - distance;
                        position.y = position.y + distance;
                        break;
                    case 6:
                        position.y = position.y - distance;
                        break;
                    case 7:
                        position.y = position.y - distance;
                        position.x = position.x + distance;
                        break;
                    case 8:
                        position.y = position.y - distance;
                        position.x = position.x - distance;
                        break;
                }
            }

            attempts++;
            collided = false;

            for (const airdrop of this.airdrops) {
                thisHitbox = crateHitbox.transform(position);
                const thatHitbox = (airdrop.type.spawnHitbox ?? airdrop.type.hitbox).transform(airdrop.position);
                thatHitbox.scale(paddingFactor);

                if (Vec.equals(thisHitbox.getCenter(), thatHitbox.getCenter())) {
                    /*
                        when dealing with airdrops exactly superimposed, the normal collision
                        method makes them line up all in one direction; ideally, we'd want them
                        to scatter around the original point. to influence the collider, we'll
                        nudge one of the hitboxes
                    */
                    thisHitbox = thisHitbox.transform(Vec.fromPolar(randomRotation(), 0.01));
                }

                if (thisHitbox.collidesWith(thatHitbox)) {
                    collided = true;
                    if (attempts >= 500) continue;
                    thisHitbox.resolveCollision(thatHitbox);
                }
                position = thisHitbox.getCenter();
            }

            thisHitbox = crateHitbox.transform(position);

            {
                const padded = thisHitbox.clone();
                padded.scale(paddingFactor);
                for (const object of this.grid.intersectsHitbox(padded, Layer.Ground)) {
                    let hitbox: Hitbox;
                    if (
                        object.isObstacle
                        && !object.dead
                        && object.definition.indestructible
                        && ((hitbox = object.spawnHitbox.clone()).scale(paddingFactor), hitbox.collidesWith(thisHitbox))
                    ) {
                        collided = true;
                        if (attempts >= 500) continue;
                        thisHitbox.resolveCollision(object.spawnHitbox);
                    }
                    position = thisHitbox.getCenter();
                }
            }

            thisHitbox = crateHitbox.transform(position);

            {
                const padded = thisHitbox.clone();
                padded.scale(paddingFactor);
                // second loop, buildings
                for (const object of this.grid.intersectsHitbox(thisHitbox, Layer.Ground)) {
                    if (
                        object.isBuilding
                        && object.scopeHitbox
                        && object.definition.wallsToDestroy === Infinity
                    ) {
                        const hitbox = object.scopeHitbox.clone();
                        hitbox.scale(paddingFactor);
                        if (!thisHitbox.collidesWith(hitbox)) continue;
                        collided = true;
                        if (attempts >= 500) continue;
                        thisHitbox.resolveCollision(object.scopeHitbox);
                    }
                    position = thisHitbox.getCenter();
                }
            }

            thisHitbox = crateHitbox.transform(position);

            const { min, max } = thisHitbox.toRectangle();
            const width = max.x - min.x;
            const height = max.y - min.y;
            position.x = Numeric.clamp(position.x, width, this.map.width - width);
            position.y = Numeric.clamp(position.y, height, this.map.height - height);
        }

        const direction = randomRotation();

        const planePos = Vec.add(
            position,
            Vec.fromPolar(direction, -GameConstants.maxPosition)
        );

        const airdrop = { position, type: crateDef };

        this.airdrops.push(airdrop);

        this.planes.push({ position: planePos, direction });

        this.addTimeout(() => {
            const parachute = new Parachute(this, position, airdrop);
            this.grid.addObject(parachute);
            this.mapPings.push({
                definition: MapPings.fromString<MapPing>("airdrop_ping"),
                position
            });
        }, GameConstants.airdrop.flyTime);

        this.pluginManager.emit("airdrop_did_summon", { airdrop, position });
    }
}

export interface Airdrop {
    readonly position: Vector
    readonly type: ObstacleDefinition
}
