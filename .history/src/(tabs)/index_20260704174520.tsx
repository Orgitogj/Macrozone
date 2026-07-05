import { globalStyles } from '../styles/global';

import { Text, ScrollView } from 'react-native';
import HomeHeader from '../components/HomeHeader';
import MacroGrid from '../components/MacroGrid';
import RecentMeals from '../components/RecentMeals';
export default function HomeScreen() {
  return (
    <ScrollView style={globalStyles.container}>
      <Text style={globalStyles.title}>MacroZone</Text>
     <HomeHeader />
    <MacroGrid/>
    <RecentMeals/>
    </ScrollView>
  );
}