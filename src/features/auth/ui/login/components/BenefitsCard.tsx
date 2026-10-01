import { Card, ListRow } from '@/shared/ui';

import type { Benefit } from '../../../config/benefits';

export function BenefitsCard({ benefits }: { benefits: readonly Benefit[] }) {
  return (
    <Card tight divided>
      {benefits.map((benefit) => (
        <ListRow
          key={benefit.title}
          compact
          icon={benefit.icon}
          iconColor={benefit.color}
          title={benefit.title}
          description={benefit.description}
        />
      ))}
    </Card>
  );
}
