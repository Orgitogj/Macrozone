import HomeHeader from '@/src/components/HomeHeader';
import MacroGrid from '@/src/components/MacroGrid';
import RecentMeals from '@/src/components/RecentMeals';
import { colors, globalStyles } from '../../styles/global';
import { ScrollView, Text } from 'react-native';

export default function HomeScreen() {
  return (
    <ScrollView style={globalStyles.container}>
      <Text style={globalStyles.title}>MacroZone</Text>
      <HomeHeader />
      <MacroGrid />
      <RecentMeals />
    </ScrollView>
  );
}