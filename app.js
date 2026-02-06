// Interação
const citySearchInput = document.getElementById("city-search-input");
const citySearchButton = document.getElementById("city-search-button");

//Exibição
const currentDate = document.getElementById("current-date");
const cityName = document.getElementById("city-name");
const weatherIcon = document.getElementById("weather-icon");
const weatherDescription = document.getElementById("weather-description");
const currentTemperature = document.getElementById("current-temperature");
const windSpeed = document.getElementById("wind-speed");
const feelsLikeTemperature = document.getElementById("feels-like-temperature");
const currentHumidity = document.getElementById("current-humidity");
const sunriseTime = document.getElementById("sunrise-time");
const sunsetTime = document.getElementById("sunset-time");

// Surf elements
const surfForecastSection = document.getElementById("surf-forecast");
const waveHeightLabel = document.getElementById("wave-height");
const wavePeriodLabel = document.getElementById("wave-period");
const tideStatusLabel = document.getElementById("tide-status");
const surfStatusLabel = document.getElementById("surf-status");

const api_key = "1363ab801829b1767a618632317b13b8";

citySearchButton.addEventListener("click", () => {
  let cityName = citySearchInput.value;
  if (cityName) getCityWeather(cityName);
});

citySearchInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    let cityName = citySearchInput.value;
    if (cityName) getCityWeather(cityName);
  }
});

const lastCity = localStorage.getItem("lastCity");

navigator.geolocation.getCurrentPosition(
  (position) => {
    let lat = position.coords.latitude;
    let lon = position.coords.longitude;

    getCurrentLocationWeather(lat, lon);
  },
  (err) => {
    if (lastCity) {
      getCityWeather(lastCity);
    } else if (err.code === 1) {
      alert(
        "Geolocalização negada pelo usuário, busque manualmente por uma cidade através da barra de pesquisa."
      );
    } else {
      console.log(err);
    }
  }
);

async function getCurrentLocationWeather(lat, lon) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=pt_br&appid=${api_key}`
    );
    const data = await response.json();
    displayWeather(data);
  } catch (error) {
    console.error("Erro ao buscar clima por localização:", error);
  }
}

async function getCityWeather(cityName) {
  weatherIcon.src = `./assets/SVG/loading-icon.svg`;

  try {
    // 1. Get coordinates and state from Geocoding API
    const geoResponse = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${api_key}`
    );
    const geoData = await geoResponse.json();

    if (!geoData || geoData.length === 0) {
      alert("Cidade não encontrada. Tente novamente.");
      return;
    }

    const { lat, lon, name, state, country } = geoData[0];
    const locationDisplay = state ? `${name}, ${state} - ${country}` : `${name}, ${country}`;

    // 2. Get weather data using coordinates
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=pt_br&appid=${api_key}`
    );
    const data = await response.json();

    localStorage.setItem("lastCity", cityName);
    displayWeather(data, locationDisplay);
  } catch (error) {
    console.error("Erro ao buscar clima por cidade:", error);
  }
}

async function getSurfForecast(lat, lon, isRetry = false) {
  try {
    // Current wave data + hourly sea level for tides
    const response = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height,wave_period&hourly=sea_level_height_msl&forecast_days=1`
    );
    const data = await response.json();

    // Check if we have valid marine data
    const hasData = data.current && data.current.wave_height !== null && data.current.wave_height !== undefined;

    if (hasData) {
        displaySurfForecast(data);
    } else if (!isRetry) {
        // If no data, try a point slightly offshore (0.05 deg ~ 5-6km)
        // We try East and South to find water
        getSurfForecast(lat - 0.05, lon + 0.05, true); 
    } else {
        surfForecastSection.style.display = "none";
    }
  } catch (error) {
    console.error("Erro ao buscar dados de surf:", error);
    surfForecastSection.style.display = "none";
  }
}

function displaySurfForecast(data) {
    const { current, hourly } = data;
    const { wave_height, wave_period } = current;
    
    surfForecastSection.style.display = "block";
    waveHeightLabel.textContent = `${wave_height.toFixed(1)}m`;
    wavePeriodLabel.textContent = `${Math.round(wave_period)}s`;

    // Tide Logic
    if (hourly && hourly.sea_level_height_msl) {
        const heights = hourly.sea_level_height_msl;
        const now = new Date();
        const hourIndex = now.getHours();
        const currentHeight = heights[hourIndex];
        const prevHeight = hourIndex > 0 ? heights[hourIndex - 1] : currentHeight;
        const nextHeight = hourIndex < heights.length - 1 ? heights[hourIndex + 1] : currentHeight;

        let tideTxt = "...";
        
        // Find local min/max in the 24h window to calibrate "high/low"
        const maxH = Math.max(...heights);
        const minH = Math.min(...heights);
        const range = maxH - minH;
        
        if (currentHeight > maxH - (range * 0.2)) {
            tideTxt = "Cheia 満";
        } else if (currentHeight < minH + (range * 0.2)) {
            tideTxt = "Seca ⎽";
        } else if (nextHeight > currentHeight) {
            tideTxt = "Enchendo ↑";
        } else {
            tideTxt = "Esvaziando ↓";
        }
        
        tideStatusLabel.textContent = tideTxt;
    }

    let status = "Flat";
    let color = "#A2A2BE";

    if (wave_height >= 2.0) {
        status = "Épico! Altas ondas 🏄‍♂️";
        color = "#FF5722";
    } else if (wave_height >= 1.0) {
        status = "Bom para Surf";
        color = "#4CAF50";
    } else if (wave_height >= 0.5) {
        status = "Dá pra brincar";
        color = "#2196F3";
    }

    surfStatusLabel.textContent = status;
    surfStatusLabel.style.color = color;
    surfStatusLabel.style.background = `${color}1A`; // 10% opacity
}

function displayWeather(data, customLocation) {
  let {
    dt,
    name,
    coord: { lat, lon },
    weather: [{ description, icon }],
    main: { temp, feels_like, humidity },
    wind: { speed },
    sys: { sunrise, sunset, country },
  } = data;

  currentDate.textContent = formatDate(dt);
  
  // Use geocoding name (City, State - Country) if available, otherwise fallback
  cityName.textContent = customLocation || `${name}, ${country}`;

  weatherIcon.src = `./assets/SVG/${icon}.svg`;

  weatherDescription.textContent = description;
  currentTemperature.textContent = `${Math.round(temp)}ºC`;
  windSpeed.textContent = `${Math.round(speed * 3.6)}km/h`;
  feelsLikeTemperature.textContent = `${Math.round(feels_like)}ºC`;
  currentHumidity.textContent = `${humidity}%`;
  sunriseTime.textContent = formatTime(sunrise);
  sunsetTime.textContent = formatTime(sunset);

  // Get surf data
  getSurfForecast(lat, lon);
}

function formatDate(epochTime) {
  let date = new Date(epochTime * 1000);
  let formattedDate = date.toLocaleDateString("pt-BR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  return formattedDate;
}

function formatTime(epochTime) {
  let date = new Date(epochTime * 1000);
  let hours = date.getHours().toString().padStart(2, "0");
  let minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
