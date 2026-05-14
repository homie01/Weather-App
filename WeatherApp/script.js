const errorElement = document.querySelector('.error');
const errorMessage = document.querySelector('.error p');
const group = document.querySelectorAll('.group');
const city = document.querySelector('#search-box');
const forecastTitle = document.querySelector('.right h1');
const weekContainer = document.querySelector('.week-container');
const defaultCityName = 'Chelmsford';

const weatherCodeMap = {
  0: { condition: 'clear sky', icon: '01' },
  1: { condition: 'mainly clear', icon: '02' },
  2: { condition: 'partly cloudy', icon: '03' },
  3: { condition: 'overcast', icon: '04' },
  45: { condition: 'fog', icon: '50' },
  48: { condition: 'rime fog', icon: '50' },
  51: { condition: 'light drizzle', icon: '09' },
  53: { condition: 'moderate drizzle', icon: '09' },
  55: { condition: 'dense drizzle', icon: '09' },
  56: { condition: 'light freezing drizzle', icon: '09' },
  57: { condition: 'dense freezing drizzle', icon: '09' },
  61: { condition: 'slight rain', icon: '10' },
  63: { condition: 'moderate rain', icon: '10' },
  65: { condition: 'heavy rain', icon: '10' },
  66: { condition: 'light freezing rain', icon: '13' },
  67: { condition: 'heavy freezing rain', icon: '13' },
  71: { condition: 'slight snow', icon: '13' },
  73: { condition: 'moderate snow', icon: '13' },
  75: { condition: 'heavy snow', icon: '13' },
  77: { condition: 'snow grains', icon: '13' },
  80: { condition: 'slight rain showers', icon: '09' },
  81: { condition: 'moderate rain showers', icon: '09' },
  82: { condition: 'violent rain showers', icon: '09' },
  85: { condition: 'slight snow showers', icon: '13' },
  86: { condition: 'heavy snow showers', icon: '13' },
  95: { condition: 'thunderstorm', icon: '11' },
  96: { condition: 'thunderstorm with hail', icon: '11' },
  99: { condition: 'heavy thunderstorm with hail', icon: '11' },
};

function getWeatherInfo(code) {
  return (
    weatherCodeMap[code] || { condition: 'unknown conditions', icon: '03' }
  );
}

function setElementText(selector, value) {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = value;
  }
}

function populateWeatherData(weather) {
  setElementText('#condition', weather.condition);
  setElementText('#temperature', Math.round(weather.temp));
  setElementText('#date', weather.date);
  setElementText('#day', weather.day);
  setElementText('#city-name', weather.name);
  setElementText('#pressure', Math.round(weather.pressure));
  setElementText('#wind-speed', weather.windSpeed.toFixed(1));
  setElementText('#humidity', Math.round(weather.humidity));

  const weatherIcon = document.querySelector('#weather-icon');

  if (weatherIcon) {
    weatherIcon.src = `./${weather.icon}.svg`;
  }
}

function createForecastCard(day) {
  const card = document.createElement('div');
  card.className = 'forecast-card';

  const dayName = document.createElement('p');
  dayName.textContent = day.day;

  const icon = document.createElement('img');
  icon.src = `./${day.icon}.svg`;
  icon.alt = day.condition;

  const temp = document.createElement('h3');
  temp.textContent = `${Math.round(day.maxTemp)}°C`;

  const condition = document.createElement('span');
  condition.textContent = day.condition;

  card.append(dayName, icon, temp, condition);
  return card;
}

function populateForecastData(forecast, cityName) {
  if (!weekContainer || !forecastTitle) {
    return;
  }

  forecastTitle.textContent = `${cityName} Forecast`;
  weekContainer.replaceChildren(...forecast.map(createForecastCard));
}

function showWeatherContent() {
  errorElement.classList.add('hide');
  group.forEach((node) => node.classList.remove('hide'));
}

function showError(message) {
  console.error(message);
  errorMessage.textContent = message;
  errorElement.classList.remove('hide');
  group.forEach((node) => node.classList.add('hide'));

  if (forecastTitle) {
    forecastTitle.textContent = 'Weekly Forecast';
  }

  if (weekContainer) {
    weekContainer.replaceChildren();
  }
}

async function getLocation(searchCity) {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchCity)}&count=1&language=en&format=json`;
  const response = await fetch(geoUrl);

  if (!response.ok) {
    throw new Error('Unable to search for that city');
  }

  const data = await response.json();
  const location = data.results?.[0];

  if (!location) {
    throw new Error('Invalid city name');
  }

  return location;
}

async function getWeather(location) {
  const params = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude,
    current:
      'temperature_2m,relative_humidity_2m,is_day,weather_code,pressure_msl,wind_speed_10m',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '7',
    wind_speed_unit: 'ms',
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`,
  );

  if (!response.ok) {
    throw new Error('Unable to load weather right now');
  }

  return response.json();
}

function buildCurrentWeather(data, location) {
  const current = data.current;
  const weatherInfo = getWeatherInfo(current.weather_code);
  const iconSuffix = current.is_day === 1 ? 'd' : 'n';
  const currentDate = current.time ? new Date(current.time) : new Date();

  return {
    name: location.name,
    day: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
    date: currentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    condition: weatherInfo.condition,
    icon: `${weatherInfo.icon}${iconSuffix}`,
    temp: current.temperature_2m,
    pressure: current.pressure_msl,
    windSpeed: current.wind_speed_10m,
    humidity: current.relative_humidity_2m,
  };
}

function buildForecast(data) {
  const daily = data.daily;

  return daily.time.slice(0, 6).map((date, index) => {
    const weatherInfo = getWeatherInfo(daily.weather_code[index]);
    const dayDate = new Date(`${date}T12:00:00`);

    return {
      day: dayDate.toLocaleDateString('en-US', { weekday: 'short' }),
      condition: weatherInfo.condition,
      icon: `${weatherInfo.icon}d`,
      maxTemp: daily.temperature_2m_max[index],
      minTemp: daily.temperature_2m_min[index],
      rainChance: daily.precipitation_probability_max[index],
    };
  });
}

async function fetchData(cityName) {
  try {
    const searchCity = String(cityName || '').trim();

    if (!searchCity) {
      throw new Error('Please enter a city name');
    }

    if (forecastTitle) {
      forecastTitle.textContent = 'Loading Forecast...';
    }

    if (weekContainer) {
      weekContainer.replaceChildren();
    }

    const location = await getLocation(searchCity);
    const data = await getWeather(location);
    const weather = buildCurrentWeather(data, location);
    const forecast = buildForecast(data);

    showWeatherContent();
    populateWeatherData(weather);
    populateForecastData(forecast, location.name);
    localStorage.setItem('defaultWeatherData', JSON.stringify(weather));
  } catch (error) {
    showError(error.message);
  }
}

function searchWeather() {
  fetchData(city.value);
  city.value = '';
}

city.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    searchWeather();
  }
});

fetchData(defaultCityName);
