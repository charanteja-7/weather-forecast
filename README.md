# Atmos weather forecast

Atmos is a responsive weather desk for current conditions, the next 12 hours, and a seven-day outlook. It began as a college weather project and has been rebuilt as a production-ready static app.

## What changed

- Replaced exposed OpenWeather credentials with the free, keyless [Open-Meteo](https://open-meteo.com/) forecast and geocoding APIs.
- Added live city search, browser geolocation, recent places, refresh, and Celsius/Fahrenheit switching.
- Added current conditions, a temperature chart, daylight progress, six weather details, and a seven-day forecast.
- Added responsive desktop, tablet, and mobile layouts plus accessible controls and loading/error states.
- Bundled the Geist typeface locally so the visual system does not depend on a font CDN.

## Run locally

This is a dependency-free static app. Serve the directory with any local web server:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Deploy to Vercel

```bash
vercel
```

No environment variables or API keys are required.

## Data source

Weather forecasts and place search are provided by Open-Meteo. Forecasts are estimates; users should consult official local alerts for safety-critical decisions.

