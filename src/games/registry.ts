import type { GameDisciplineId } from "@/types";
import type { GamePlugin } from "@/games/types";
import { KniffelGamePlugin } from "@/games/kniffel";
import { SchockenGamePlugin } from "@/games/schocken";
import { KegelnGamePlugin } from "@/games/kegeln";

export const GAME_PLUGINS: Record<GameDisciplineId, GamePlugin<any>> = {
    kniffel: KniffelGamePlugin,
    schocken: SchockenGamePlugin,
    kegeln: KegelnGamePlugin,
};

export const ALL_GAME_PLUGINS: GamePlugin<any>[] = [
    KniffelGamePlugin,
    SchockenGamePlugin,
    KegelnGamePlugin,
];

export function getGamePlugin(id: GameDisciplineId): GamePlugin<any> {
    return GAME_PLUGINS[id] || KniffelGamePlugin;
}
