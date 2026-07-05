import { globalStyles } from './components/styles/global';

import { ScrollView, Text } from 'react-native';
import HomeHeader from '../../app/components/HomeHeader';
import MacroGrid from '../../app/components/MacroGrid';
import RecentMeals from '../../app/components/RecentMeals';
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