import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ScreenEdge } from '@/components/layout/Screen';
import { layout, spacing, useThemedStyles, type Theme } from '@/theme';

type ScrollScreenProps = {
  children: ReactNode;
  edges?: readonly ScreenEdge[];
};

export function ScrollScreen({ children, edges = [] }: ScrollScreenProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={undefined}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: spacing.lg + (edges.includes('top') ? insets.top : 0),
            paddingBottom: spacing.huge + (edges.includes('bottom') ? insets.bottom : 0),
          },
        ]}
        keyboardShouldPersistTaps='handled'
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scroll: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: layout.screenPaddingHorizontal,
    },
    inner: {
      width: '100%',
      maxWidth: layout.maxContentWidth,
      alignSelf: 'center',
    },
  });
