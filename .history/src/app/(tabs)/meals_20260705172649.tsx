import { globalStyles } from '../../styles/global';
import { Link } from 'expo-router';
import { StyleSheet, Text, ScrollView } from 'react-native';
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
  
  return (
    <ScrollView style={globalStyles.container}>
      <Text style={globalStyles.title}>All Meals</Text>
      <Link href='/add-meal' style={{ fontSize: 18, color: '#007bff' }}>
        Add New Meal
      </Link>
    </ScrollView>
  );
}