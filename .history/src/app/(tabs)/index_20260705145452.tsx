import { globalStyles } from '../../';
import { StyleSheet, Text, View } from 'react-native';
import HomeHeader from '../components/HomeHeader';
import MacroGrid from '@/components/MacroGrid';

export default function HomeScreen() {
  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>MacroZone</Text>
      <HomeHeader />
      <MacroGrid />
    </View>
  );
}