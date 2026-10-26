# Atmos — weather, beautifully clear

Atmos is a live weather app with an iPhone-style liquid glass design. Frosted glass panels sit on top of an animated scene that follows the real weather of the place you search: sun rays on clear days, drifting clouds, rolling fog, rain on the glass, lightning, falling snow, and a slowly turning night sky full of stars.

**Live demo:** <https://weather-forecast-one-murex.vercel.app>

![Atmos on a clear night in Delhi: black sky with stars and a shooting star behind frosted glass panels](docs/screenshots/night-clear.jpg)

## Every condition has its own scene

The background reacts to the live weather and to day or night at the searched location. All screenshots below are from the live app with real weather data.

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/day-clear.jpg" alt="Clear day in Miami with a soft sun and turning light rays" /><br /><b>Clear day</b> — soft sun with slowly turning light rays (Miami)</td>
    <td width="50%"><img src="docs/screenshots/day-partly-cloudy.jpg" alt="Partly cloudy day in Houston with sun and drifting clouds" /><br /><b>Partly cloudy</b> — sun with puffy clouds drifting at three depths (Houston)</td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/day-cloudy.jpg" alt="Overcast day in Chicago with drifting cloud banks" /><br /><b>Cloudy</b> — fuller cloud banks on a warm mocha sky (Chicago)</td>
    <td><img src="docs/screenshots/day-fog.jpg" alt="Foggy day in Whitehorse with mist rolling across the screen" /><br /><b>Fog</b> — banks of mist rolling across the screen (Whitehorse)</td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/day-rain.jpg" alt="Drizzle in Bogotá with rain streaks and raindrops on the glass" /><br /><b>Rain</b> — falling rain and drops beaded on the "window" (Bogotá)</td>
    <td><img src="docs/screenshots/day-storm.jpg" alt="Thunderstorm in Medellín with a lightning bolt and dark violet sky" /><br /><b>Storm</b> — dark clouds and lightning in sync with the flash (Medellín)</td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/day-snow.jpg" alt="Snow in Fairbanks with flakes falling at two depths" /><br /><b>Snow</b> — flakes drifting down at two depths (Fairbanks)</td>
    <td><img src="docs/screenshots/night-clear.jpg" alt="Clear night in Delhi with a rotating starfield and a shooting star" /><br /><b>Clear night</b> — stars turning around a pole star, the Milky Way, shooting stars and Earth's horizon (Delhi)</td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/night-cloudy.jpg" alt="Overcast night in Bengaluru with grey clouds on a dark sky" /><br /><b>Cloudy night</b> — grey clouds over a dark sky (Bengaluru)</td>
    <td><img src="docs/screenshots/night-rain.jpg" alt="Rainy night in Colombo with rain and drops on the glass" /><br /><b>Rainy night</b> — rain on a dark sky (Colombo)</td>
  </tr>
</table>

### On your phone

<p>
  <img src="docs/screenshots/mobile-night.jpg" alt="Atmos on a phone at night in Delhi" width="260" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/mobile-storm.jpg" alt="Atmos on a phone during a thunderstorm in Medellín" width="260" />
</p>

## Features

- **Live weather** for any city, plus Indian localities and six-digit PIN codes (for example `Gachibowli` or `507211`).
- **Current conditions** with a large reading, a short summary of the day, and sunrise/sunset progress.
- **Next 12 hours** as a temperature chart and an hourly strip with rain chance and day/night icons.
- **Six details**: feels like, humidity, wind, visibility, pressure and UV.
- **Seven-day outlook** with iOS-style temperature range bars on a shared week scale.
- **Your location**, recent places, Celsius/Fahrenheit, and shareable URLs for any place.
- **Responsive** layouts for desktop, tablet and phone.

## How the scenes work

- Plain HTML, CSS and JavaScript, with no framework, build step or image assets for the scenes. Stars, rain, snow, raindrops and the lightning bolt are small inline SVG patterns.
- Each scene layer only renders for its own weather, and all motion uses GPU-friendly `transform` and `opacity` animations.
- White text stays at a contrast ratio of 4.5:1 or better on every scene. The glass dims what's behind it, and a soft scrim plus text shadow protect the location heading.
- **Reduce motion** stops all animation, and **reduce transparency** swaps the glass for solid panels and hides the scenes.

> **Want to see a particular scene?** Search for a city that has that weather right now. Weather changes, so look for one where it's currently raining, snowing or storming, or where it's night.

## Run locally

This is a dependency-free static app. Serve the directory with any local web server:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Deploy to Vercel

```bash
vercel --prod
```

No environment variables or API keys are required.

## Data sources

- Weather forecasts and city search by [Open-Meteo](https://open-meteo.com/).
- Indian locality and PIN code search, and naming of your current location, by [OpenStreetMap](https://www.openstreetmap.org/copyright) (Nominatim).

Forecasts are estimates. Check official local alerts before making weather-sensitive plans.

---

Atmos started as a college weather project and was rebuilt as a modern, production-ready static app.
