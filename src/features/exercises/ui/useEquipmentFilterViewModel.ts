import { useCallback } from 'react';

import { EQUIPMENT, type Equipment } from '@/core/db/schema';
import { EQUIPMENT_LABELS } from '@/features/exercises/domain/labels';
import { goBack } from '@/shared/actions';
import { haptics } from '@/shared/lib/haptics';

import { useExerciseBrowserStore } from '../state/exerciseBrowserStore';

type EquipmentChoice = Equipment | 'all';

const CHOICES: readonly { value: EquipmentChoice; label: string }[] = [
  { value: 'all', label: 'All equipment' },
  ...EQUIPMENT.map((equipment) => ({ value: equipment, label: EQUIPMENT_LABELS[equipment] })),
];

/** The equipment filter: the kind picked narrows the browser, then the sheet closes. */
export function useEquipmentFilterViewModel() {
  const equipment = useExerciseBrowserStore((state) => state.equipment);
  const setEquipment = useExerciseBrowserStore((state) => state.setEquipment);
  const chosen: EquipmentChoice = equipment ?? 'all';

  return {
    options: CHOICES.map((choice) => ({ ...choice, selected: choice.value === chosen })),
    onPick: useCallback(
      (value: EquipmentChoice) => {
        haptics.selection();
        setEquipment(value === 'all' ? null : value);
        goBack();
      },
      [setEquipment],
    ),
    onClose: () => goBack(),
  };
}
