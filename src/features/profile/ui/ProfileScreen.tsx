import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import {
  BarChart,
  Button,
  Card,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  SectionLabel,
  SegmentedControl,
  Text,
} from '@/shared/ui';

import { BmiScale } from './components/BmiScale';
import { useProfileViewModel } from './useProfileViewModel';

/**
 * Profile: the account, the last twelve weeks of training, the bodyweight and BMI, and how the app looks,
 * moves, sounds and feels. The dashboard opens Records, the exercise library and the Calendar.
 */
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

      <Card style={styles.chart} testID="profile-chart">
        {vm.chart.status === 'loading' && <LoadingState label="Loading your weeks" />}
        {vm.chart.status === 'error' && (
          <ErrorState
            title="Couldn't load your weeks"
            onRetry={vm.chart.onRetry}
            testID="profile-chart-error"
          />
        )}
        {vm.chart.status === 'ready' && (
          <>
            <View style={styles.thisWeek}>
              <Text variant="title3" style={styles.number}>
                {vm.chart.thisWeek}
              </Text>
              <Text variant="sub" tone="secondary">
                this week
              </Text>
            </View>
            <BarChart
              values={vm.chart.values}
              labels={vm.chart.labels}
              labelMode="spread"
              accessibilityLabel={vm.chart.accessibilityLabel}
            />
          </>
        )}
        <SegmentedControl
          options={vm.chart.measureOptions}
          value={vm.chart.measure}
          onChange={vm.chart.onMeasureChange}
          accessibilityLabel="Chart measure"
          testID="profile-chart-measure"
        />
      </Card>

      <View style={styles.group}>
        <SectionLabel>Dashboard</SectionLabel>
        <View style={styles.dashboard}>
          {vm.dashboard.map((item) => (
            <View key={item.label} style={styles.dashboardItem}>
              <Button
                label={item.label}
                icon={item.icon}
                variant="secondary"
                onPress={item.onPress}
                testID={item.testID}
              />
            </View>
          ))}
        </View>
      </View>

      <Card style={styles.body} testID="profile-body">
        <Text variant="headline" accessibilityRole="header">
          Bodyweight · BMI
        </Text>
        <View style={styles.thisWeek}>
          <Text variant="display" style={styles.number} testID="profile-bodyweight">
            {vm.body.weight}
          </Text>
          <Text variant="headline" tone="secondary">
            {vm.body.unit}
          </Text>
        </View>
        <Text variant="sub" accessibilityLabel={`BMI ${vm.body.bmi}, ${vm.body.categoryLabel}`}>
          <Text variant="sub" tone="secondary">
            BMI{' '}
          </Text>
          <Text variant="sub" weight="semibold" style={styles.number}>
            {vm.body.bmi}
          </Text>
          <Text variant="sub" weight="semibold" tone={vm.body.category === 'normal' ? 'accent' : 'primary'}>
            {'  '}
            {vm.body.categoryLabel}
          </Text>
        </Text>
        <BmiScale position={vm.body.position} category={vm.body.category} />
        <View style={styles.bodyActions}>
          <View style={styles.dashboardItem}>
            <Button
              label="Log weight"
              icon="plus"
              variant="secondary"
              onPress={vm.body.onLogWeight}
              testID="profile-log-weight"
            />
          </View>
          <View style={styles.dashboardItem}>
            <Button label="FFMI" variant="secondary" onPress={vm.body.onFfmi} testID="profile-ffmi" />
          </View>
        </View>
        <Text variant="mini" tone="tertiary">
          BMI is a rough estimate for adults and does not reflect individual health. Not medical advice.
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
  chart: { gap: theme.spacing.md },
  body: { gap: theme.spacing.sm },
  bodyActions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  // Two to a row, as in the prototype.
  dashboard: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  dashboardItem: { flexBasis: '47%', flexGrow: 1 },
  thisWeek: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs },
  number: { fontVariant: ['tabular-nums'] },
}));
