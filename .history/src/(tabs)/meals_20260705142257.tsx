import { ScrollView, Text } from "react-native";
import { globalStyles } from "./components/styles/global";


export default function MealsScreen(){

return(
  <ScrollView style={globalStyles.container}>
<Text style={globalStyles.title}>All meals</Text>
  </ScrollView>
)
;
}