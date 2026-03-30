export type RootStackParamList = {
  Home:       undefined
  Search:     undefined
  Map:        undefined
  Bookings:   undefined
  Profile:    undefined
  Restaurant: { restaurantId: string }
  Booking:    { restaurantId: string }
  Confirmed:  undefined
}
