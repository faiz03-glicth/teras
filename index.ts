// Unistyles must be configured before any StyleSheet is parsed, so it loads right after the router entry.
// See https://www.unistyl.es/v3/guides/expo-router
import 'expo-router/entry';
import './src/theme/unistyles';

import { enableFreeze } from 'react-native-screens';

// A screen the person has already moved away from (it stays mounted behind whatever is now in front
// of it) stops re-rendering once this is on, instead of continuing to do work it can't show.
enableFreeze();
