import { View } from 'react-native';

/**
 * Every `lucide-react-native/icons/*` import under Jest (see jest.config.js). Lucide ships ESM-only .mjs, and
 * icons carry no behaviour, so each is an empty view.
 */
export default function LucideIcon() {
  return <View testID="icon" />;
}
