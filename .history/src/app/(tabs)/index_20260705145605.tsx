import { globalStyles } from '../../styles/global';
import { StyleSheet, Text, View } from 'react-native';
import Homme
import MacroGrid from '@/src/components/MacroGrid';

export default function HomeScreen() {
  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>MacroZone</Text>
      <HomeHeader />
      <MacroGrid />
    </View>
  );
}