import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Button } from './Button';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { Text } from './Text';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.root}>
      <View style={styles.illustration} accessible={false}>
        <Icon name={icon} size={28} color={theme.colors.accentText} />
      </View>
      <Text variant="title3" align="center" accessibilityRole="header">
        {title}
      </Text>
      {body ? (
        <Text variant="sub" tone="secondary" align="center" style={styles.body}>
          {body}
        </Text>
      ) : null}
      {action && (
        <View style={styles.action}>
          <Button label={action.label} onPress={action.onPress} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.xxl },
  illustration: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentSoft,
    marginBottom: theme.spacing.xs,
  },
  body: { maxWidth: 300, lineHeight: 21 },
  action: { alignSelf: 'stretch', marginTop: theme.spacing.sm },
}));
