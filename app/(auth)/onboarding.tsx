import { useLocalSearchParams } from 'expo-router';

import { OnboardingScreen } from '@/features/onboarding/ui/OnboardingScreen';
import { parseOnboardingStep } from '@/shared/actions/params';

/** One route for all three steps (?step=0|1|2). */
export default function OnboardingRoute() {
  const { step } = useLocalSearchParams<{ step?: string }>();
  return <OnboardingScreen step={parseOnboardingStep(step)} />;
}
