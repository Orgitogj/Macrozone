import { useCallback, useState } from 'react';
import { FlatList, Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLoader } from '@/components/ui/AppLoader';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SearchField } from '@/components/ui/SearchField';
import { TextButton } from '@/components/ui/TextButton';
import { LibraryRow } from '@/features/library/components/LibraryRow';
import { useLibraryResource } from '@/features/library/hooks/useLibraryResource';
import { getLibraryService } from '@/features/library/services/libraryActions';
import type { Food } from '@/features/library/types';
import { describeFoodRow } from '@/features/library/utils/libraryRowText';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { layout, spacing, useThemedStyles, type Theme } from '@/theme';

type FoodPickerModalProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSelect: (food: Food) => void;
};

function FoodPickerContent({ title, onClose, onSelect }: Omit<FoodPickerModalProps, 'visible'>) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const load = useCallback(() => getLibraryService().listFoods({ search: debouncedSearch }), [debouncedSearch]);
  const { resource, retry } = useLibraryResource(load, 'Could not load your foods.');

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <AppText variant='heading' accessibilityRole='header' style={styles.title}>
          {title}
        </AppText>
        <TextButton label='Close' onPress={onClose} />
      </View>
      <SearchField value={search} onChangeText={setSearch} placeholder='Search foods' accessibilityLabel='Search foods' />
      {resource.status === 'loading' ? <AppLoader accessibilityLabel='Loading foods' /> : null}
      {resource.status === 'error' ? <ErrorState message={resource.message} onRetry={retry} /> : null}
      {resource.status === 'ready' ? (
        <FlatList
          data={resource.data}
          keyExtractor={(food) => food.id}
          keyboardShouldPersistTaps='handled'
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={
            <EmptyState
              title={debouncedSearch.trim() ? 'No matching foods' : 'No foods yet'}
              message={
                debouncedSearch.trim()
                  ? 'Try a different search.'
                  : 'Create foods in the Foods tab of Add first, then add them here.'
              }
            />
          }
          renderItem={({ item }) => {
            const text = describeFoodRow(item);
            return (
              <LibraryRow
                title={text.title}
                subtitle={text.subtitle}
                detail={text.detail}
                accessibilityLabel={text.accessibilityLabel}
                accessibilityHint='Adds this food'
                onPress={() => onSelect(item)}
              />
            );
          }}
        />
      ) : null}
    </View>
  );
}

function Separator() {
  return <View style={separatorStyles.separator} />;
}

export function FoodPickerModal({ visible, title, onClose, onSelect }: FoodPickerModalProps) {
  return (
    <Modal visible={visible} animationType='slide' onRequestClose={onClose} presentationStyle='fullScreen'>
      {visible ? <FoodPickerContent title={title} onClose={onClose} onSelect={onSelect} /> : null}
    </Modal>
  );
}

const separatorStyles = StyleSheet.create({
  separator: {
    height: spacing.sm,
  },
});

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: layout.screenPaddingHorizontal,
      gap: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    title: {
      flex: 1,
    },
    list: {
      paddingBottom: spacing.huge,
    },
  });
