import { Text, type StyleProp, type TextStyle } from 'react-native';

import { globalStyles } from '@/styles/global';

type EmptyStateProps = {
  message: string;
  style?: StyleProp<TextStyle>;
};

export function EmptyState({ message, style }: EmptyStateProps) {
  return <Text style={[globalStyles.empty, style]}>{message}</Text>;
}
