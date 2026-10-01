import { buildLevelGrid, type HeatGrid, type HeatLevel } from '@/features/heatmap/domain/grid';
import { seededRandom } from '@/shared/lib/random/seededRandom';

export const HERO_COLUMNS = 14;
export const HERO_ROWS = 7;

/** A stable, believable training wave for Welcome: about a third of days empty, the rest levels 1–4. */
function buildHeroGrid(seed: number): HeatGrid {
  const next = seededRandom(seed);
  return buildLevelGrid(HERO_COLUMNS, HERO_ROWS, (): HeatLevel => {
    if (next() < 0.34) return 0;
    return (1 + Math.floor(next() * 4)) as HeatLevel;
  });
}

export const HERO_GRID = buildHeroGrid(5);
