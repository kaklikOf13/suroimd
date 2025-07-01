import { MapName } from "@common/definitions/maps/maps";
import { type GameMap } from "../map";
import { Vec } from "@common/utils/vector";
import { Obstacles } from "@common/definitions/obstacles";
import { Variation } from "@common/typings";
import { Loots } from "@common/definitions/loots";

export type map_gen_callback=(map: GameMap, params: string[])=>void

export const map_gen_ret:Partial<Record<MapName,map_gen_callback>>={
    "debug":(map:GameMap)=>{
        // Generate all buildings

        /*const buildingPos = Vec.create(200, map.height - 600);

        for (const building of Buildings.definitions) {
            map.generateBuilding(building.idString, buildingPos);
            const rect = building.spawnHitbox.toRectangle();
            buildingPos.x += rect.max.x - rect.min.x;

            buildingPos.x += 20;
            if (buildingPos.x > map.width - 300) {
                buildingPos.x = 200 - 140;
                buildingPos.y += 200;
            }
        }*/

        // Generate all obstacles
        const obstaclePos = Vec.create(200, 200);

        for (const obstacle of Obstacles.definitions) {
            if (obstacle.invisible) continue;
            for (let i = 0; i < (obstacle.variations ?? 1); i++) {
                map.generateObstacle(obstacle.idString, obstaclePos, { variation: i as Variation });

                obstaclePos.x += 20;
                if (obstaclePos.x > map.width / 2 - 20) {
                    obstaclePos.x = map.width / 2 - 140;
                    obstaclePos.y += 20;
                }
            }
        }

        // Generate all Loots
        const itemPos = Vec.create(map.width / 2, map.height / 2);
        for (const item of Loots.definitions) {
            map.game.addLoot(item, itemPos, 0, { count: Infinity, pushVel: 0, jitterSpawn: false });

            itemPos.x += 10;
            if (itemPos.x > map.width / 2 + 100) {
                itemPos.x = map.width / 2;
                itemPos.y += 10;
            }
        }
    },
    "singleBuilding":(map, [building])=>{
        // map.game.grid.addObject(new Decal(map.game, "lodge_decal", Vec.create(this.width / 2, this.height / 2), 0));
        /* for (let i = 0; i < 10; i++) {
            map.generateBuilding(`container_${i + 1}`, Vec.create((this.width / 2) + 15 * i, this.height / 2 - 15), 0);
        } */
        map.generateBuilding(building, Vec.create(1024 / 2, 1024 / 2), 0);
    },
    
    "singleObstacle":(map, [obstacle])=>{
        map.generateObstacle(obstacle, Vec.create(1024 / 2, 1024 / 2), { layer: 0, rotation: 0 });
    }
}