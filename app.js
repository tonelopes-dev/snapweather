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
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&units=metric&lang=pt_br&appid=${api_key}`
    );
    const data = await response.json();

    if (data.cod === "404") {
      alert("Cidade não encontrada. Tente novamente.");
      return;
    }

    localStorage.setItem("lastCity", cityName);
    displayWeather(data);
  } catch (error) {
    console.error("Erro ao buscar clima por cidade:", error);
  }
}

async function getSurfForecast(lat, lon) {
  try {
    const response = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height,wave_period`
    );
    const data = await response.json();

    if (data.current) {
        displaySurfForecast(data.current);
    } else {
        surfForecastSection.style.display = "none";
    }
  } catch (error) {
    console.error("Erro ao buscar dados de surf:", error);
    surfForecastSection.style.display = "none";
  }
}

function displaySurfForecast(current) {
    const { wave_height, wave_period } = current;
    
    // Check if it's likely a coastal area (some wave data exists)
    if (wave_height === undefined || wave_height === null) {
        surfForecastSection.style.display = "none";
        return;
    }

    surfForecastSection.style.display = "block";
    waveHeightLabel.textContent = `${wave_height.toFixed(1)}m`;
    wavePeriodLabel.textContent = `${Math.round(wave_period)}s`;

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

function displayWeather(data) {
  let {
    dt,
    name,
    coord: { lat, lon },
    weather: [{ description, icon }],
    main: { temp, feels_like, humidity },
    wind: { speed },
    sys: { sunrise, sunset },
  } = data;

  currentDate.textContent = formatDate(dt);
  cityName.textContent = name;

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
