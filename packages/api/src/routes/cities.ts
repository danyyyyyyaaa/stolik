import { Router } from 'express'

const router = Router()

const CITIES = [
  { name: 'Warszawa', lat: 52.2297, lng: 21.0122, zoom: 13 },
  { name: 'Krakow', lat: 50.0647, lng: 19.9450, zoom: 13 },
  { name: 'Wroclaw', lat: 51.1079, lng: 17.0385, zoom: 13 },
  { name: 'Gdansk', lat: 54.3520, lng: 18.6466, zoom: 13 },
  { name: 'Poznan', lat: 52.4064, lng: 16.9252, zoom: 13 },
]

// ─── GET /api/cities — list of supported cities ─────────────────────────────
router.get('/', (_req, res) => {
  res.json(CITIES)
})

export { router as citiesRouter }
