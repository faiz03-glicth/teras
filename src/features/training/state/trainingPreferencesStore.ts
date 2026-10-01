import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/core/storage/persistStorage';

import {
  BODYWEIGHT_KG,
  HEIGHT_CM,
  REST_SECONDS,
  stepBodyweightKg,
  stepHeightCm,
  stepRestSeconds,
  type StepDirection,
  type WeightUnit,
} from '../domain/preferences';

interface TrainingPreferences {
  unit: WeightUnit;
  bodyweightKg: number;
  heightCm: number;
  restSeconds: number;
}

interface TrainingPreferencesState extends TrainingPreferences {
  setUnit: (unit: WeightUnit) => void;
  stepBodyweight: (direction: StepDirection) => void;
  stepHeight: (direction: StepDirection) => void;
  stepRest: (direction: StepDirection) => void;
}

export const DEFAULT_TRAINING_PREFERENCES: TrainingPreferences = {
  unit: 'kg',
  bodyweightKg: BODYWEIGHT_KG.default,
  heightCm: HEIGHT_CM.default,
  restSeconds: REST_SECONDS.default,
};

/**
 * What Set up asks for: units, bodyweight, height and default rest. Chosen once during Get Started, used
 * by every later screen, and kept between launches. They stay on this device (they are preferences, not
 * data). The steppers move by the unit shown, so they are stored with the unit they were stepped in.
 */
export const useTrainingPreferencesStore = create<TrainingPreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_TRAINING_PREFERENCES,
      setUnit: (unit) => set({ unit }),
      stepBodyweight: (direction) =>
        set(({ bodyweightKg, unit }) => ({ bodyweightKg: stepBodyweightKg(bodyweightKg, direction, unit) })),
      stepHeight: (direction) =>
        set(({ heightCm, unit }) => ({ heightCm: stepHeightCm(heightCm, direction, unit) })),
      stepRest: (direction) =>
        set(({ restSeconds }) => ({ restSeconds: stepRestSeconds(restSeconds, direction) })),
    }),
    {
      name: 'teras.training-preferences',
      // No version bump for `heightCm`: a saved state without it keeps the default.
      version: 1,
      storage: persistStorage,
      partialize: ({ unit, bodyweightKg, heightCm, restSeconds }): TrainingPreferences => ({
        unit,
        bodyweightKg,
        heightCm,
        restSeconds,
      }),
    },
  ),
);
