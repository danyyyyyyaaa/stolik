import React from 'react'
import { Text, View } from 'react-native'

const FILLED_COLOR = '#F59E0B'
const EMPTY_COLOR  = '#D1D5DB'

export function Stars({
  rating,
  size = 12,
  emptyColor = EMPTY_COLOR,
}: {
  rating:      number
  size?:       number
  emptyColor?: string
}) {
  const filled = Math.floor(rating)
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Text
          key={i}
          style={{
            fontSize:   size,
            lineHeight: size * 1.25,
            color:      i <= filled ? FILLED_COLOR : emptyColor,
          }}
        >
          {i <= filled ? '★' : '☆'}
        </Text>
      ))}
    </View>
  )
}
