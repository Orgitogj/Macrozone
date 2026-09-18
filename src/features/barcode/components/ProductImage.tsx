import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { isAllowedImageUrl } from '@/features/barcode/providers/openFoodFacts/openFoodFactsResponse';
import { componentSizes, radii, spacing, useThemedStyles, type Theme } from '@/theme';

type ProductImageProps = {
  url: string | null;
  productName: string;
};

export function ProductImage({ url, productName }: ProductImageProps) {
  const styles = useThemedStyles(createStyles);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (url === null || failedUrl === url || !isAllowedImageUrl(url)) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: url }}
        style={styles.image}
        resizeMode='contain'
        onError={() => setFailedUrl(url)}
        accessible
        accessibilityRole='image'
        accessibilityLabel={`Package photo of ${productName || 'this product'} from Open Food Facts`}
      />
      <AppText variant='micro' tone='muted'>
        Photo: Open Food Facts contributors, CC BY-SA 3.0. It may not show the current package.
      </AppText>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      gap: spacing.xs,
      alignItems: 'center',
    },
    image: {
      width: componentSizes.control * 3,
      height: componentSizes.control * 3,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surfaceMuted,
    },
  });
