import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { StyleSheet } from 'react-native-unistyles';

import { motion } from '@/theme';

import { IconButton } from './IconButton';
import { PressDelay } from './pressDelay';
import { Text } from './Text';

export interface SheetLayoutProps {
  title: string;
  /** Small line above the title ("Today"). */
  eyebrow?: string;
  /** Line under the title ("Today, 7:30 PM"). */
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** The sheet has a text field: keep it above the keyboard (only such sheets track the keyboard). */
  keyboard?: boolean;
  testID?: string;
}

/**
 * The inside of every bottom sheet (New check-in, the Day sheet). The sheet itself is the platform's native
 * form sheet (the stack presents it), so dragging, settling and dismissing follow the finger natively;
 * this lays out its header (title, Close) and scrolls the content above the keyboard.
 */
export function SheetLayout({
  title,
  eyebrow,
  subtitle,
  onClose,
  children,
  keyboard = false,
  testID,
}: SheetLayoutProps) {
  const body = (
    <>
      <View style={styles.header}>
        <View style={styles.titles}>
          {eyebrow ? (
            <Text variant="caption" tone="secondary">
              {eyebrow}
            </Text>
          ) : null}
          <Text variant="title3" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="footnote" tone="secondary">
              {subtitle}
            </Text>
          ) : null}
        </View>
        <IconButton icon="close" onPress={onClose} accessibilityLabel="Close" testID="sheet-close" />
      </View>
      {children}
    </>
  );
  return (
    <PressDelay value={motion.scroll.pressDelayMs}>
      {keyboard ? (
        <KeyboardAwareScrollView
          testID={testID}
          bottomOffset={24}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          accessibilityViewIsModal
        >
          {body}
        </KeyboardAwareScrollView>
      ) : (
        <ScrollView
          testID={testID}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          accessibilityViewIsModal
        >
          {body}
        </ScrollView>
      )}
    </PressDelay>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  content: {
    gap: 18,
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.gutter,
    paddingBottom: Math.max(rt.insets.bottom, theme.spacing.lg) + theme.spacing.lg,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  titles: { flex: 1, gap: 2 },
}));
