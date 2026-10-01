import { useLocalSearchParams } from 'expo-router';

import { LoginScreen } from '@/features/auth/ui/login/LoginScreen';
import { parseAuthIntent } from '@/shared/actions/params';

/** One route for both variants (?intent=new|existing). */
export default function LoginRoute() {
  const { intent } = useLocalSearchParams<{ intent?: string }>();
  return <LoginScreen intent={parseAuthIntent(intent, 'new')} />;
}
