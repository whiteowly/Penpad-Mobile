import { StyleSheet, Text, View } from 'react-native'
import React from 'react'


export const getWeekNumber = (date: Date = new Date()): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; 
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
};
export const getDayOfWeek = (date: Date = new Date(), locale: string = 'en-US'): string => {
  return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
};
export const getMonthAndDay = (date: Date = new Date(), locale: string = 'en-US'): string => {
    return new Intl.DateTimeFormat(locale, { month: 'long'}).format(date);
};