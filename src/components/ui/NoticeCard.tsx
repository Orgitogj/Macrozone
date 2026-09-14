import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/styles/global';

type NoticeCardProps = {
  message: string;
  title?: string;
  tone?: 'info' | 'warning';
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function NoticeCard({ message, title, tone = 'info', children, style }: NoticeCardProps) {
  const accent = tone === 'warning' ? colors.macroCarbs : colors.primary;
  return (
    <View
      style={[styles.card, { borderLeftColor: accent }, style]}
      accessibilityRole={tone === 'warning' ? 'alert' : 'summary'}
    >
      <Ionicons
        name={tone === 'warning' ? 'warning-outline' : 'information-circle-outline'}
        size={20}
        color={accent}
      />
      <View style={styles.body}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.message}>{message}</Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 14,
  },
  body: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
