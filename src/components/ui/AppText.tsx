import { Text, type TextProps, type TextStyle } from 'react-native';

import { MAX_FONT_SCALE, typography, useTheme, type TextVariant, type ThemeColors } from '@/theme';

export type AppTextTone =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'accent'
  | 'danger'
  | 'success'
  | 'warning'
  | 'onPrimary';

type AppTextProps = TextProps & {
  variant?: TextVariant;
  tone?: AppTextTone;
  align?: TextStyle['textAlign'];
};

function toneColor(colors: ThemeColors, tone: AppTextTone): string {
  switch (tone) {
    case 'primary':
      return colors.textPrimary;
    case 'secondary':
      return colors.textSecondary;
    case 'muted':
      return colors.textMuted;
    case 'accent':
      return colors.primary;
    case 'danger':
      return colors.danger;
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'onPrimary':
      return colors.textOnPrimary;
  }
}

export function AppText({
  variant = 'body',
  tone = 'primary',
  align,
  style,
  maxFontSizeMultiplier,
  ...props
}: AppTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      {...props}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? MAX_FONT_SCALE[variant]}
      style={[typography[variant], { color: toneColor(colors, tone) }, align ? { textAlign: align } : null, style]}
    />
  );
}
