import { globalStyles } from "../styles/global";
import { Text,ScrollView } from "react-native";


export default function MealsScreen(){

return(
  <ScrollView style={globalStyles.container}>
<Text style={globalStyles.title}>All meals</Text>
  </ScrollView>
)
;
}