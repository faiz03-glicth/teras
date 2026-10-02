import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, Card, ListRow, Screen, SectionLabel, SegmentedControl, Text } from '@/shared/ui';

import { useProfileViewModel } from './useProfileViewModel';

/** Profile: the account and how the app looks, moves, sounds and feels. The chart and dashboard come later. */
export function ProfileScreen() {
  const vm = useProfileViewModel();
  return (
    <Screen scroll withTabBar testID="profile-screen" contentStyle={styles.content}>
      <Text variant="title" accessibilityRole="header">
        Profile
      </Text>

      <Card>
        <Text variant="title3" testID="profile-name">
          {vm.name}
        </Text>
        <Text variant="footnote" tone="secondary">
          {vm.accountLine}
        </Text>
      </Card>

      <View style={styles.group}>
        <SectionLabel>Theme</SectionLabel>
        <SegmentedControl
          options={vm.themeOptions}
          value={vm.theme}
          onChange={vm.onThemeChange}
          accessibilityLabel="Theme"
          testID="profile-theme"
        />
      </View>

      <View style={styles.group}>
        <SectionLabel>Reduce motion</SectionLabel>
        <SegmentedControl
          options={vm.reduceMotionOptions}
          value={vm.reduceMotion}
          onChange={vm.onReduceMotionChange}
          accessibilityLabel="Reduce motion"
          testID="profile-reduce-motion"
        />
      </View>

      <View style={styles.group}>
        <SectionLabel>Feedback</SectionLabel>
        <Card tight divided>
          <ListRow
            title="Sound effects"
            icon="volume"
            trailing="toggle"
            toggleValue={vm.soundEffects}
            onToggle={vm.onSoundEffectsChange}
            testID="profile-sounds"
          />
          <ListRow
            title="Haptics"
            icon="sparkles"
            trailing="toggle"
            toggleValue={vm.haptics}
            onToggle={vm.onHapticsChange}
            testID="profile-haptics"
          />
        </Card>
      </View>

      <View style={styles.group}>
        <Button
          label="Replay Get Started"
          variant="secondary"
          onPress={vm.onReplayGetStarted}
          testID="profile-replay"
        />
        <Button
          label="Log out"
          variant="danger"
          onPress={vm.onSignOut}
          loading={vm.signingOut}
          loadingLabel="Logging out…"
          testID="profile-logout"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.spacing.xl },
  group: { gap: theme.spacing.sm },
}));
