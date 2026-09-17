import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppLoader } from '@/components/ui/AppLoader';
import { AppText } from '@/components/ui/AppText';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SearchField } from '@/components/ui/SearchField';
import { TextButton } from '@/components/ui/TextButton';
import { AiEntryPanel } from '@/features/ai-meal/components/AiEntryPanel';
import { FavoriteButton } from '@/features/library/components/FavoriteButton';
import { LibraryRow } from '@/features/library/components/LibraryRow';
import { LIBRARY_LIMITS } from '@/features/library/constants';
import { useLibraryNavigation } from '@/features/library/hooks/useLibraryNavigation';
import { getLibraryErrorMessage, getLibraryService } from '@/features/library/services/libraryActions';
import { LogDestinationFields } from '@/features/meals/components/LogDestinationFields';
import { ADD_MODES, useAddHubRows, type AddHubRow, type AddMode, type LibraryMode } from '@/features/meals/hooks/useAddHubRows';
import { CreateMealScreen } from '@/features/meals/screens/CreateMealScreen';
import type { MealType } from '@/features/meals/types';
import type { LogDestination } from '@/features/meals/utils/libraryEntries';
import { inferMealTypeFromDate } from '@/features/meals/utils/mealType';
import { useTodayDateKey } from '@/hooks/useTodayDateKey';
import { spacing } from '@/theme';
import { createSingleFlight } from '@/utils/singleFlight';
import type { LocalDateKey } from '@/utils/date';

type AddFoodScreenProps = {
  title?: string;
  presetDate?: LocalDateKey | null;
  presetMealType?: MealType | null;
  initialMode?: AddMode;
};

const MODE_LABELS: Readonly<Record<AddMode, string>> = {
  recent: 'Recent',
  favorites: 'Favorites',
  foods: 'Foods',
  savedMeals: 'Saved Meals',
  recipes: 'Recipes',
  ai: 'AI',
  manual: 'Manual',
};

const MODE_OPTIONS = ADD_MODES.map((value) => ({ value, label: MODE_LABELS[value] }));

const EMPTY_TEXT: Readonly<Record<LibraryMode, { title: string; message: string; searchTitle: string }>> = {
  recent: {
    title: 'No recent foods yet',
    message: 'Foods you add from your library will appear here for quick logging.',
    searchTitle: 'No recent foods',
  },
  favorites: {
    title: 'No favorites yet',
    message: 'Tap the star on a food to keep it here.',
    searchTitle: 'No matching favorites',
  },
  foods: {
    title: 'No foods yet',
    message: 'Create a food once, then reuse it with any amount.',
    searchTitle: 'No matching foods',
  },
  savedMeals: {
    title: 'No saved meals yet',
    message: 'Save a group of foods you often eat together.',
    searchTitle: 'No matching saved meals',
  },
  recipes: {
    title: 'No recipes yet',
    message: 'Build a recipe from foods and log it by the serving.',
    searchTitle: 'No matching recipes',
  },
};

function Separator() {
  return <View style={styles.separator} />;
}

export function AddFoodScreen({ title, presetDate = null, presetMealType = null, initialMode = 'recent' }: AddFoodScreenProps) {
  const todayKey = useTodayDateKey();
  const navigation = useLibraryNavigation();
  const [destination, setDestination] = useState<LogDestination>(() => ({
    date: presetDate ?? todayKey,
    mealType: presetMealType ?? inferMealTypeFromDate(new Date()),
  }));
  const [mode, setMode] = useState<AddMode>(initialMode);
  const [search, setSearch] = useState('');
  const [favoriteMessage, setFavoriteMessage] = useState<string | null>(null);
  const [favoriteFlight] = useState(createSingleFlight);
  const libraryMode: LibraryMode = mode === 'manual' || mode === 'ai' ? 'recent' : mode;
  const hub = useAddHubRows(libraryMode, search);

  const modeChips = (
    <ChipGroup
      options={MODE_OPTIONS}
      value={mode}
      onChange={(next) => {
        setMode(next);
        setFavoriteMessage(null);
      }}
      role='tablist'
      accessibilityLabel='Add from'
    />
  );

  if (mode === 'manual') {
    return (
      <CreateMealScreen
        key={`${destination.date}-${destination.mealType}`}
        title={title}
        presetDate={destination.date}
        presetMealType={destination.mealType}
        headerAccessory={<View style={styles.manualChips}>{modeChips}</View>}
      />
    );
  }

  if (mode === 'ai') {
    return (
      <Screen edges={title ? ['top'] : ['bottom']}>
        <ScrollView
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps='handled'
        >
          <View style={styles.header}>
            {title ? <ScreenHeader title={title} subtitle='Log food to your diary' /> : null}
            <LogDestinationFields destination={destination} todayKey={todayKey} onChange={setDestination} />
            {modeChips}
            <AiEntryPanel destination={destination} onLogManually={() => setMode('manual')} />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  const toggleFavorite = (row: Extract<AddHubRow, { kind: 'food' }>) =>
    favoriteFlight.run(async () => {
      setFavoriteMessage(null);
      try {
        await getLibraryService().setFavorite(row.food.id, !row.food.isFavorite);
        void Haptics.selectionAsync();
        await hub.reload();
      } catch (error) {
        setFavoriteMessage(getLibraryErrorMessage(error, 'Could not update favorites. Please try again.'));
      }
    });

  const createAction =
    mode === 'foods' || mode === 'favorites' || mode === 'recent'
      ? { label: 'New Food', onPress: () => navigation.createFood(destination) }
      : mode === 'savedMeals'
        ? { label: 'New Saved Meal', onPress: () => navigation.createSavedMeal(destination) }
        : { label: 'New Recipe', onPress: () => navigation.createRecipe(destination) };

  const searchLabel =
    mode === 'savedMeals' ? 'Search saved meals' : mode === 'recipes' ? 'Search recipes' : mode === 'favorites' ? 'Search favorites' : 'Search foods';
  const refreshError = hub.resource.status === 'ready' ? hub.resource.refreshError : null;
  const rows = hub.rows;
  const empty = EMPTY_TEXT[libraryMode];
  const isSearching = hub.appliedSearch.trim().length > 0;

  const header = (
    <View style={styles.header}>
      {title ? <ScreenHeader title={title} subtitle='Log food to your diary' /> : null}
      <LogDestinationFields destination={destination} todayKey={todayKey} onChange={setDestination} />
      {modeChips}
      {mode !== 'recent' ? (
        <SearchField value={search} onChangeText={setSearch} placeholder={searchLabel} accessibilityLabel={searchLabel} />
      ) : null}
      <View style={styles.actions}>
        <TextButton label={createAction.label} icon='add' onPress={createAction.onPress} />
        {mode === 'recent' || mode === 'favorites' ? (
          <TextButton label='Browse Foods' tone='secondary' onPress={() => setMode('foods')} />
        ) : null}
      </View>
      {refreshError ? (
        <NoticeCard tone='warning' message={refreshError}>
          <TextButton label='Try again' size='small' onPress={hub.retry} />
        </NoticeCard>
      ) : null}
      {favoriteMessage ? <NoticeCard tone='danger' message={favoriteMessage} /> : null}
      {hub.resource.status === 'error' ? <ErrorState message={hub.resource.message} onRetry={hub.retry} /> : null}
      {hub.resource.status !== 'error' && rows === null ? <AppLoader accessibilityLabel='Loading your food library' /> : null}
    </View>
  );

  return (
    <Screen edges={title ? ['top'] : ['bottom']}>
      <FlatList
        data={rows ?? []}
        keyExtractor={(row) => row.key}
        ListHeaderComponent={header}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps='handled'
        keyboardDismissMode='on-drag'
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          rows !== null ? (
            <EmptyState
              title={isSearching ? empty.searchTitle : empty.title}
              message={isSearching ? 'Try a different search, or create something new.' : empty.message}
            />
          ) : null
        }
        ListFooterComponent={
          rows !== null && rows.length >= LIBRARY_LIMITS.listLimit ? (
            <AppText variant='caption' tone='muted' style={styles.footer}>
              {`Showing the first ${LIBRARY_LIMITS.listLimit} results. Refine your search to find more.`}
            </AppText>
          ) : null
        }
        renderItem={({ item }) => {
          switch (item.kind) {
            case 'food':
              return (
                <LibraryRow
                  title={item.text.title}
                  subtitle={item.text.subtitle}
                  detail={item.text.detail}
                  accessibilityLabel={item.text.accessibilityLabel}
                  accessibilityHint='Opens this food to choose an amount'
                  onPress={() => navigation.openFood(item.food.id, destination, item.suggestedAmount)}
                  trailing={
                    <FavoriteButton name={item.food.name} isFavorite={item.food.isFavorite} onToggle={() => void toggleFavorite(item)} />
                  }
                />
              );
            case 'savedMeal':
              return (
                <LibraryRow
                  title={item.text.title}
                  subtitle={item.text.subtitle}
                  detail={item.text.detail}
                  accessibilityLabel={item.text.accessibilityLabel}
                  accessibilityHint='Opens this saved meal'
                  onPress={() => navigation.openSavedMeal(item.savedMeal.id, destination)}
                />
              );
            case 'recipe':
              return (
                <LibraryRow
                  title={item.text.title}
                  subtitle={item.text.subtitle}
                  detail={item.text.detail}
                  accessibilityLabel={item.text.accessibilityLabel}
                  accessibilityHint='Opens this recipe to choose servings'
                  onPress={() => navigation.openRecipe(item.recipe.id, destination)}
                />
              );
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  manualChips: {
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.xl,
  },
  list: {
    paddingBottom: spacing.huge,
  },
  separator: {
    height: spacing.sm,
  },
  footer: {
    marginTop: spacing.lg,
  },
});
