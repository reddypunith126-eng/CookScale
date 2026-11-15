// Open-Meteo: free, open, no API key, CORS-enabled. https://open-meteo.com/
const WMO = {
  0: ['Clear sky', '☀️'], 1: ['Mainly clear', '🌤️'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'],
  45: ['Fog', '🌫️'], 48: ['Rime fog', '🌫️'], 51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'],
  55: ['Heavy drizzle', '🌧️'], 61: ['Light rain', '🌦️'], 63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'],
  71: ['Light snow', '🌨️'], 73: ['Snow', '🌨️'], 75: ['Heavy snow', '❄️'], 80: ['Rain showers', '🌦️'],
  81: ['Showers', '🌧️'], 82: ['Violent showers', '⛈️'], 95: ['Thunderstorm', '⛈️'], 96: ['Storm + hail', '⛈️'],
}

export function describeWeather(code) {
  return WMO[code] || ['—', '🌡️']
}

export function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => reject(new Error(e.message || 'Location permission denied')),
      { timeout: 8000 },
    )
  })
}

export async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&temperature_unit=fahrenheit`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Weather lookup failed (' + res.status + ')')
  const data = await res.json()
  const c = data.current || {}
  const [description, icon] = describeWeather(c.weather_code)
  return {
    tempF: Math.round(c.temperature_2m),
    humidity: c.relative_humidity_2m,
    code: c.weather_code,
    description,
    icon,
  }
}

// One-shot: resolve current location then weather.
export async function fetchCurrentWeather(saved) {
  const { lat, lon } = saved?.lat != null ? saved : await getPosition()
  const w = await fetchWeather(lat, lon)
  return { ...w, lat, lon }
}
