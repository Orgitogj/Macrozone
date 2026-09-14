import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, useThemedStyles, type Theme } from '@/theme';

export type ScreenEdge = 'top' | 'bottom';

type ScreenProps = {
  children: ReactNode;
  edges?: readonly ScreenEdge[];
};

export function Screen({ children, edges = [] }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  return (
    <View
      style={[
        styles.root,
        { paddingTop: edges.includes('top') ? insets.top : 0, paddingBottom: edges.includes('bottom') ? insets.bottom : 0 },
      ]}
    >
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      width: '100%',
      maxWidth: layout.maxContentWidth,
      alignSelf: 'center',
      paddingHorizontal: layout.screenPaddingHorizontal,
    },
  });
