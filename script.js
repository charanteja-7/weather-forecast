  const container = document.querySelector('.container');
  const searchBar = document.querySelector('#search-bar');
  const notfound = document.querySelector('.not-found');
  const weather = document.querySelector('.weather');
  const leftContainer = document.querySelector('.left-container');
  const rightContainer = document.querySelector('.right-container');
  let weatherIcon = document.querySelector('.weather img');

  searchBar.addEventListener('keydown',(event)=>{
      if(event.key === 'Enter'){
          displayWeather();
      }    
  });

  async function displayWeather() {
    const city = await document.getElementById("search-bar").value;
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=ba20aeed33b73e4ce454f4af8f988ba8&units=metric`;
    const response = await fetch(apiUrl);
    var data = await response.json();
    weatherReport(data);
    clearForecastContainers();
    //activate the content
    if(data.cod == 404){
      weather.classList.remove('active');
      notfound.classList.add('active');
      container.style.width='340px';
      container.style.height='450px';
      leftContainer.classList.remove('active');
      leftContainer.style.display = 'none';
      searchBar.value = '';
      }
    else{
      const currentDateElement = document.getElementById('currentDate');
    const currentTimeElement = document.getElementById('currentTime');

    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    currentDateElement.innerHTML = currentDate;

    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
    currentTimeElement.innerHTML = currentTime;

    
    notfound.classList.remove('active');
    leftContainer.classList.add('active');
      weather.classList.add('active');
      container.style.width='60%';
      container.style.height='550px';
      leftContainer.style.display = 'grid';
      searchBar.value = '';
    }

    let weatherCondtion = data.weather[0].main.toLowerCase();
    weatherIcon.src = `images/${weatherCondtion}.png`;
    document.querySelector('.city').innerHTML=data.name+','+data.sys.country;
    document.querySelector('.temperature').innerHTML=Math.round(data.main.temp)+'°C';
    document.querySelector('.humidity .value').innerHTML=data.main.humidity+'%';
    document.querySelector('.visibility .value').innerHTML=data.visibility+'m';
    document.querySelector('.windspeed .value').innerHTML=Math.round(data.wind.speed)+'m/s';document.querySelector('.pressure .value').innerHTML=data.main.pressure+'hPa';
    document.querySelector('.feelslike .value').innerHTML=data.main.feels_like+'°C';
    if(data.main.sea_level == undefined){
      document.querySelector('.sealevel .value').innerHTML='- -'; 
    }else{
      document.querySelector('.sealevel .value').innerHTML=data.main.sea_level+'m';
    } 
  }



function weatherReport(data){
  let apiurl = `https://api.openweathermap.org/data/2.5/forecast?q=${data.name}&appid=044277adf940989c9c59eb8fb3f84707&units=metric`;

  fetch(apiurl).then(res=>{
    return res.json();
  }).then((forecast)=>{
    console.log(forecast);
     hourForecast(forecast);
     dayForecast(forecast)
  })
}

function hourForecast(forecast){
  let hour = ['.hourly.first', '.hourly.second', '.hourly.third', '.hourly.fourth'];

  for(let i = 1; i < 5; i++){
    var date = new Date(forecast.list[i-1].dt*1000);
    let time = document.createElement('p');
    let image = document.createElement('img');
    let h3 = document.createElement('h3');
    time.innerHTML = (date.toLocaleTimeString(undefined, { hour: 'numeric', minute: 'numeric',hour12: true  }));
    h3.innerHTML=Math.round(forecast.list[i].main.temp)+'°C';
    let weatherCondtion = forecast.list[i].weather[0].main.toLowerCase();
    image.src=`images/${weatherCondtion}.png`;
    document.querySelector(`${hour[i-1]}`).appendChild(time);
    document.querySelector(`${hour[i-1]}`).appendChild(image);
    document.querySelector(`${hour[i-1]}`).appendChild(h3);
  } 
}
function dayForecast(forecast){
  
    const uniqueDays = [];
    const fiveDaysForecast = forecast.list.filter(data => {
      const forecastDate = new Date(data.dt_txt).getDate();
      if (!uniqueDays.includes(forecastDate)) {
        uniqueDays.push(forecastDate);
        return true; 
      }
      return false; 
     });
     let hour = ['.daily.first','.daily.second', '.daily.third', '.daily.fourth'];

    for(let i = 1; i <5; i++){
      let time = document.createElement('p');
      let image = document.createElement('img');
      let h3 = document.createElement('h3');
      time.innerHTML =time.innerHTML = new Date(fiveDaysForecast[i].dt_txt).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' });
      h3.innerHTML=Math.round(fiveDaysForecast[i].main.temp)+'°C';
      let weatherCondtion = fiveDaysForecast[i].weather[0].main.toLowerCase();
      image.src=`images/${weatherCondtion}.png`;
      document.querySelector(`${hour[i-1]}`).appendChild(time);
      document.querySelector(`${hour[i-1]}`).appendChild(image);
      document.querySelector(`${hour[i-1]}`).appendChild(h3);
    } 

}
function clearForecastContainers() {
  let hourlyContainers = ['.hourly.first', '.hourly.second', '.hourly.third', '.hourly.fourth'];
  let dailyContainers = ['.daily.first', '.daily.second', '.daily.third', '.daily.fourth'];

  // Clear hourly forecast containers
  hourlyContainers.forEach(container => {
    document.querySelector(container).innerHTML = '';
  });

  // Clear daily forecast containers
  dailyContainers.forEach(container => {
    document.querySelector(container).innerHTML = '';
  });
}