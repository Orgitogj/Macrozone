import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';

import { colors, globalStyles } from '@/styles/global';

type FormScreenProps = {
  title?: string;
  children: ReactNode;
};

export function FormScreen({ title, children }: FormScreenProps) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, title ? styles.withTitle : styles.withHeader]}
        keyboardShouldPersistTaps='handled'
        keyboardDismissMode='on-drag'
        automaticallyAdjustKeyboardInsets
      >
        {title ? (
          <Text style={[globalStyles.title, styles.title]} accessibilityRole='header'>
            {title}
          </Text>
        ) : null}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  withTitle: {
    paddingTop: 60,
  },
  withHeader: {
    paddingTop: 16,
  },
  title: {
    marginBottom: 24,
  },
});
