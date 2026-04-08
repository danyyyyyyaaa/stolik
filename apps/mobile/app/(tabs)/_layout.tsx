import React, { useRef, useEffect } from 'react'
import { View, Animated, Platform, StyleSheet } from 'react-native'
import { Tabs } from 'expo-router'
import {
  Home, Search, MapPin, BookMarked, User, Heart,
} from 'lucide-react-native'
import { useTheme, colors, radii, shadows } from '../../src/theme'
import { useLang } from '../../src/i18n'

// ─── Animated tab icon ────────────────────────────────────────────────────────

type LucideIcon = typeof Home

function TabIcon({
  Icon,
  color,
  focused,
  accentColor,
}: {
  Icon: LucideIcon
  color: string
  focused: boolean
  accentColor: string
}) {
  const dotScale  = useRef(new Animated.Value(focused ? 1 : 0)).current
  const iconScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(dotScale, {
        toValue: focused ? 1 : 0,
        useNativeDriver: true,
        tension: 180,
        friction: 12,
      }),
      Animated.sequence([
        Animated.timing(iconScale, {
          toValue: focused ? 1.12 : 0.92,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(iconScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 10,
        }),
      ]),
    ]).start()
  }, [focused])

  return (
    <View style={styles.iconWrap}>
      <Animated.View style={{ transform: [{ scale: iconScale }] }}>
        <Icon
          size={24}
          color={color}
          strokeWidth={focused ? 2.5 : 1.75}
          fill={focused ? color : 'transparent'}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: accentColor,
            transform: [{ scaleX: dotScale }],
            opacity: dotScale,
          },
        ]}
      />
    </View>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabLayout() {
  const { th, themeKey } = useTheme()
  const { t }  = useLang()

  const activeColor   = themeKey === 'dark' ? colors.primaryAccent : colors.primary
  const inactiveColor = '#9CA3AF'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: th.navBg,
          borderTopWidth:  0,
          paddingBottom:   Platform.OS === 'ios' ? 24 : 10,
          paddingTop:      10,
          height:          Platform.OS === 'ios' ? 84 : 64,
          // Shadow above the tab bar
          ...shadows.lg,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarActiveTintColor:   activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelStyle: {
          fontSize:    10,
          fontFamily:  'PlusJakartaSans_600SemiBold',
          marginTop:   2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.home_label,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Home} color={color} focused={focused} accentColor={activeColor} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t.search_label,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Search} color={color} focused={focused} accentColor={activeColor} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t.map_label,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={MapPin} color={color} focused={focused} accentColor={activeColor} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t.bookings_label,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={BookMarked} color={color} focused={focused} accentColor={activeColor} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t.favorites_label,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Heart} color={color} focused={focused} accentColor={activeColor} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.profile_label,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={User} color={color} focused={focused} accentColor={activeColor} />
          ),
        }}
      />
    </Tabs>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  iconWrap: {
    alignItems:     'center',
    justifyContent: 'center',
    width:          36,
    height:         30,
  },
  dot: {
    width:        16,
    height:       3,
    borderRadius: radii.full,
    marginTop:    4,
  },
})
