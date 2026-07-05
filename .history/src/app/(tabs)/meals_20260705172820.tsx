import { globalStyles } from '../../styles/global';
import { Link } from 'expo-router';
import { StyleSheet, Text, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback,useState } from 'react';
import MealItem from '../../components/MealItem';
import { getMeals, Meal } from '@/src/storage/Meals';


export default function MealsScreen() {



  const [meals,setMeals]=useState<Meal[]>([]);
  const loadMeals=async ()=>{
    const data =await getMeals();
    setMeals(data);
  };


  useFocusEffect(
    useCallback(()=>{
      loadMeals();

    },[])
  );

  return (
    <ScrollView style={globalStyles.container}>
      <Text style={globalStyles.title}>All Meals</Text>
      <View style={{mar}}></View>
    </ScrollView>
  );
}