import { useState } from 'react';
import { addMeal } from '@/src/storage/Meals';
import { router } from 'expo-router';
import {
  StyleSheet,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, globalStyles } from '../../styles/global';
