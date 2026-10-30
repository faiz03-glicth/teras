import { useRef } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionLabel,
  SegmentedControl,
  SheetLayout,
  Text,
} from '@/shared/ui';

import { ShareCard } from './components/ShareCard';
import { SharePreview } from './components/SharePreview';
import { useShareViewModel } from './useShareViewModel';

/**
 * Form sheet: a finished workout as a picture or as text. The picture is shown smaller than it is shared
 * (a Story, 9:16); the person picks its layout and its ground, then copies the words, saves the picture to
 * Photos, or opens the phone's share sheet (Instagram, Messages, anywhere). What the last tap did is said
 * in words under the keys.
 */
export function ShareSheet({ id }: { id: string | null }) {
  const cardRef = useRef<View>(null);
  const vm = useShareViewModel(id, cardRef);
  const { model } = vm;

  return (
    <SheetLayout
      title="Share workout"
      subtitle={model ? `${model.title} · ${model.dateLabel}` : undefined}
      onClose={vm.onClose}
      testID="share-sheet"
    >
      {vm.status === 'loading' && <LoadingState label="Loading the workout" testID="share-loading" />}
      {vm.status === 'error' && (
        <Card>
          <ErrorState title="Couldn't load this workout" onRetry={vm.onRetry} testID="share-error" />
        </Card>
      )}
      {vm.status === 'missing' && (
        <Card>
          <EmptyState icon="dumbbell" title="Workout not found" />
        </Card>
      )}

      {vm.status === 'ready' && model && (
        <>
          <SharePreview look={vm.look}>
            <ShareCard ref={cardRef} model={model} layout={vm.layout} look={vm.look} />
          </SharePreview>

          <View style={styles.group}>
            <SectionLabel>Layout</SectionLabel>
            <SegmentedControl
              options={vm.layouts}
              value={vm.layout}
              onChange={vm.onLayout}
              accessibilityLabel="Layout"
              testID="share-layout"
            />
          </View>

          <View style={styles.group}>
            <SectionLabel>{vm.backgroundLabel}</SectionLabel>
            <SegmentedControl
              options={vm.looks}
              value={vm.look}
              onChange={vm.onLook}
              accessibilityLabel="Background"
              testID="share-look"
            />
          </View>

          <View style={styles.keys}>
            <View style={styles.key}>
              <Button
                label="Save image"
                icon="download"
                variant="secondary"
                onPress={vm.onSave}
                loading={vm.busy === 'save'}
                loadingLabel="Saving…"
                disabled={vm.busy !== null && vm.busy !== 'save'}
                testID="share-save"
              />
            </View>
          </View>

          {/* What the last tap did. Always on screen, so a result never moves the keys. */}
          <Text
            variant="footnote"
            tone={vm.result?.problem ? 'danger' : 'secondary'}
            align="center"
            style={styles.result}
            accessibilityLiveRegion="polite"
            testID="share-result"
          >
            {vm.result?.message ?? ' '}
          </Text>

          <Button
            label="Share"
            icon="share"
            size="xl"
            onPress={vm.onShare}
            loading={vm.busy === 'share'}
            loadingLabel="Preparing…"
            disabled={vm.busy !== null && vm.busy !== 'share'}
            testID="share-share"
          />
        </>
      )}
    </SheetLayout>
  );
}

const styles = StyleSheet.create((theme) => ({
  group: { gap: theme.spacing.md },
  keys: { flexDirection: 'row', gap: theme.spacing.md },
  key: { flex: 1 },
  result: { minHeight: 20, marginTop: -theme.spacing.xs },
}));
