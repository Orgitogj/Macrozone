import { StyleSheet, type TextStyle } from 'react-native';

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const borderWidths = {
  hairline: StyleSheet.hairlineWidth,
  thin: 1,
  thick: 2,
} as const;

export const fontSizes = {
  micro: 12,
  caption: 13,
  label: 14,
  body: 16,
  subheading: 17,
  heading: 20,
  title: 28,
  display: 36,
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'micro';

export const typography: Readonly<Record<TextVariant, TextStyle>> = {
  display: { fontSize: fontSizes.display, lineHeight: 42, fontWeight: fontWeights.bold },
  title: { fontSize: fontSizes.title, lineHeight: 34, fontWeight: fontWeights.bold },
  heading: { fontSize: fontSizes.heading, lineHeight: 26, fontWeight: fontWeights.semibold },
  subheading: { fontSize: fontSizes.subheading, lineHeight: 22, fontWeight: fontWeights.semibold },
  body: { fontSize: fontSizes.body, lineHeight: 22, fontWeight: fontWeights.regular },
  bodyStrong: { fontSize: fontSizes.body, lineHeight: 22, fontWeight: fontWeights.semibold },
  label: { fontSize: fontSizes.label, lineHeight: 19, fontWeight: fontWeights.semibold },
  caption: { fontSize: fontSizes.caption, lineHeight: 18, fontWeight: fontWeights.regular },
  micro: { fontSize: fontSizes.micro, lineHeight: 16, fontWeight: fontWeights.medium },
};

export const MAX_FONT_SCALE: Readonly<Record<TextVariant, number>> = {
  display: 1.4,
  title: 1.5,
  heading: 1.8,
  subheading: 2,
  body: 2,
  bodyStrong: 2,
  label: 2,
  caption: 2,
  micro: 2,
};

export const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

export const touchTargets = {
  min: 44,
  comfortable: 48,
} as const;

export const componentSizes = {
  control: 52,
  segment: 44,
  progressBar: 8,
  progressBarCompact: 6,
  stepIndicator: 4,
} as const;

export const layout = {
  maxContentWidth: 720,
  screenPaddingHorizontal: spacing.xl,
} as const;

export const opacity = {
  pressed: 0.7,
  disabled: 0.45,
} as const;
