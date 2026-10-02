import { ChipRow, SheetLayout } from '@/shared/ui';

import { BodyMap } from './components/BodyMap';
import { useMuscleFilterViewModel } from './useMuscleFilterViewModel';

/** Form sheet over the exercise browser: narrow it to one muscle, on the body or from the list. */
export function MuscleFilterSheet() {
  const vm = useMuscleFilterViewModel();

  return (
    <SheetLayout
      title="Muscle"
      subtitle="Tap a muscle on the body, or pick from the list."
      onClose={vm.onClose}
      testID="muscle-filter-sheet"
    >
      <BodyMap highlight={vm.highlight} width={132} onRegion={vm.onRegion} />
      <ChipRow
        options={vm.options}
        value={vm.value}
        onChange={vm.onPick}
        accessibilityLabel="Muscle"
        testID="muscle-filter"
      />
    </SheetLayout>
  );
}
