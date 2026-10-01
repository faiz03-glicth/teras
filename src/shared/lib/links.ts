import { requireEnv } from '@/core/config/env';

import type { LegalDoc } from '../actions/types';

/** External URLs, built from configuration. */
export const links = {
  legal: (doc: LegalDoc): string => `${requireEnv().EXPO_PUBLIC_LEGAL_BASE_URL}/${doc}`,
  helpCenter: (): string => `${requireEnv().EXPO_PUBLIC_LEGAL_BASE_URL}/help`,
};
