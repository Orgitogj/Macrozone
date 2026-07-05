import HomeHeader from '@/src/components/HomeHeader';
import MacroGrid from '@/src/components/MacroGrid';
import RecentMeals from '@/src/components/RecentMeals';
import { getMeals, Meal } from '@/src/storage/Meals';
import { globalStyles } from '../../styles/global';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text } from 'react-native';

export default function HomeScreen() {
  const [meals, setMeals] = useState<Meal[]>([]);

  const loadMeals = async () => {
    const data = await getMeals();
    setMeals(data);
    console.log('Loaded meals:', data);
  };

  useFocusEffect(
    useCallback(() => {
      loadMeals();
    }, []),
  );

  return (
    <ScrollView style={globalStyles.container}>
      <Text style={globalStyles.title}>MacroZone</Text>
      <HomeHeader />
      <MacroGrid />
      <RecentMeals  meals={/>
    </ScrollView>
  );
}