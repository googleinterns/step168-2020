// Copyright 2020 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* globals VideoPlayer, searchForVideos
   addDirectionsListeners calculateAndDisplayRoute */
/* exported casesData */
/* eslint-env jquery */

// Get API key from hidden file and use it to get the map
const mykey = keys.MAPS_API_KEY;
document.getElementById('mapUrl').src = mykey;

let player;
let casesData;
let map;
let geocoder;
let bound;
let overlay;
let curLocationMarker;
let lastSearchClicked = 'none';
let navOpen = false;
let placesAutoComplete;

// When the page loads, call createMap
window.onload = function() {
  createMap();
  addDirectionsListeners();

  google.charts.load('current', {
    callback: function() {
      drawChart;
      drawGraph;
    },
    packages: ['corechart', 'line'],
  });
};
window.addEventListener('resize', function() {
  resizePieChart();
  resizeLineGraph();
});

// Update currently displayed coordinates
function displayLatitudeLongitude(value) {
  document.getElementById('latitude').value = value['lat'];
  document.getElementById('longitude').value = value['lng'];
}

// Update displayed COVID stats based on coordinates
function displayLocationData(value) {
  const potentialReports = [];
  const RADIUS = 5;
  // Look for closest reports
  casesData.forEach((report) => {
    if (Math.abs(report.lat - value['lat']) < RADIUS &&
        Math.abs(report.lng - value['lng']) < RADIUS) {
      potentialReports.push(report);
    }
  });

  // If there are no nearby reports, dispay global data
  if (potentialReports.length == 0) {
    displayCurrentStats(
        'Worldwide', globalActive, globalConfirmed, globalDeaths,
        globalRecovered, 0.0, 0.0);
    return;
  }
  // If there are nearby reports, lookup address using geocoder
  const lookupURL =
      'https://maps.googleapis.com/maps/api/geocode/json?latlng=' +
      value['lat'] + ',' + value['lng'] + '&key=' +
      mykey.substring(44, 83);  // Indices represent the actual API key
  let potentialReport = potentialReports[0];
  let foundFlag = false;
  // Compare location names with territory names from potential reports
  fetch(lookupURL).then((response) => response.json()).then((data) => {
    data.results[0].address_components.forEach((location) => {
      potentialReports.forEach((report) => {
        //        console.log(report);
        // If there is a match, display that territory's statistics
        const lName = location.long_name.trim().valueOf();
        const rName = report.territory.trim().valueOf();
        if ((lName.includes(rName) || rName.includes(lName)) &&
            foundFlag == false) {
          potentialReport = report;
          displayCurrentStats(
              lName, potentialReport.active, potentialReport.confirmed,
              potentialReport.deaths, potentialReport.recovered,
              potentialReport.lat, potentialReport.lng);
          foundFlag = true;
          return;
        }
      });
    });
    // If no match was found, take the report closest to the user request
    if (foundFlag == false) {
      const BIGDISTANCE = 1000;
      let minimumDistance = BIGDISTANCE;
      potentialReports.forEach((report) => {
        const reportDistance = Math.abs(report.lat - value['lat']) +
            Math.abs(report.lng - value['lng']);
        if (reportDistance < minimumDistance) {
          minimumDistance = reportDistance;
          potentialReport = report;
        }
      });
      displayCurrentStats(
          potentialReport.territory, potentialReport.active,
          potentialReport.confirmed, potentialReport.deaths,
          potentialReport.recovered, potentialReport.lat, potentialReport.lng);
    }
  });
}

// Initialize global data
let globalActive = 0;
let globalConfirmed = 0;
let globalDeaths = 0;
let globalRecovered = 0;

let initialDisplay = true;
// Display COVID data in html
function displayCurrentStats(
    location, active, confirmed, deaths, recovered, lat, lng) {
  document.getElementById('location').innerHTML = location;
  document.getElementById('displayActive').innerHTML = `Active: ${active}`;
  document.getElementById('displayConfirmed').innerHTML =
      `Confirmed: ${confirmed}`;
  document.getElementById('displayDeaths').innerHTML = `Deaths: ${deaths}`;
  document.getElementById('displayRecovered').innerHTML =
      `Recovered: ${recovered}`;

  if (initialDisplay) {
    initStatsDisplay(map);
    document.getElementById('statsMode').classList.toggle('selected');
    document.getElementById('pieDiv').classList.add('inactive');
    document.getElementById('graphDiv').classList.add('inactive');
    initialDisplay = false;
  }

  document.getElementById('pieLocation').innerHTML = location;
  drawChart(active, deaths, recovered);
  drawGraph(lat, lng);
}

// Create pie chart
let pieChart;
let pieData;
let pieOptions;
function drawChart(active, deaths, recovered) {
  pieData = google.visualization.arrayToDataTable([
    ['Data Type', 'Cases'],
    ['Active', active],
    ['Deaths', deaths],
    ['Recovered', recovered],
  ]);
  pieOptions = {
    'backgroundColor': 'transparent',
    'chartArea': {'width': '100%', 'height': '80%'},
    'legend': {'position': 'bottom'},
  };
  pieChart =
      new google.visualization.PieChart(document.getElementById('pieChart'));
  pieChart.draw(pieData, pieOptions);
}

function resizePieChart() {
  pieChart.draw(pieData, pieOptions);
}

function resizeLineGraph() {
  lineChart.draw(lineData, google.charts.Line.convertOptions(lineOptions));
}

// Create line graph
let lineChart;
let lineData;
let lineOptions;
function drawGraph(lat, lng) {
  fetch(`/timereport?lat=${lat}&lng=${lng}`)
      .then((response) => response.json())
      .then((timeReport) => {
        document.getElementById('graphLocation').innerHTML =
            timeReport.location;
        lineData = new google.visualization.DataTable();
        lineData.addColumn('string', 'Date');
        lineData.addColumn('number', 'Confirmed Cases');
        for (let i = 0; i < timeReport.cases.length; ++i) {
          lineData.addRow([timeReport.dates[i], timeReport.cases[i]]);
        }
        lineOptions = {
          'backgroundColor': 'transparent',
          'chartArea': {
            'backgroundColor': 'transparent',
          },
          'legend': {position: 'none'},
          'titlePosition': 'none',
          'vAxis': {'title': 'Confirmed Cases'},
        };
        lineChart =
            new google.charts.Line(document.getElementById('lineGraph'));
        lineChart.draw(
            lineData, google.charts.Line.convertOptions(lineOptions));
      });
}

// Initialize global heat maps
const globalConfirmedHeatmapData = [];
const globalActiveHeatmapData = [];
const globalDeathsHeatmapData = [];
const globalRecoveredHeatmapData = [];
const globalPopulationHeatmapData = [];
const globalRecentHeatmapData = [];

// Create a map zoomed in on Googleplex
function createMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 39.496, lng: -99.031},
    zoom: 5,
    mapTypeControl: false,
    fullscreenControl: false,
  });
  bound = new google.maps.Polygon({
    strokeColor: '#0000FF',
    strokeOpacity: 1,
    strokeWeight: 2,
    fillColor: '#0000FF',
    fillOpacity: 0.15,
    clickable: false,
  });
  initMyLocationControl(map);
  initTopBar(map);
  initRelativeHeat();
  // Gets case data and creates heat maps
  fetch('/report').then((response) => response.json()).then((reports) => {
    casesData = reports;
    reports.forEach((report) => {
      globalConfirmedHeatmapData.push({
        location: new google.maps.LatLng(report.lat, report.lng),
        weight: report.confirmed,
      });
      if (report.active > -1) {
        globalActiveHeatmapData.push({
          location: new google.maps.LatLng(report.lat, report.lng),
          weight: report.active,
        });
      }
      globalDeathsHeatmapData.push({
        location: new google.maps.LatLng(report.lat, report.lng),
        weight: report.deaths,
      });
      globalRecoveredHeatmapData.push({
        location: new google.maps.LatLng(report.lat, report.lng),
        weight: report.recovered,
      });
      globalPopulationHeatmapData.push({
        location: new google.maps.LatLng(report.lat, report.lng),
        weight: report.perCap,
      });
      // Calculate worldwide data
      globalActive += report.active;
      globalConfirmed += report.confirmed;
      globalDeaths += report.deaths;
      globalRecovered += report.recovered;
    });
    // Initially display confirmed cases heat map
    heatmap = new google.maps.visualization.HeatmapLayer({
      data: globalConfirmedHeatmapData,
      dissipating: false,
      map: null,
      radius: 2.5,
    });
    // Display worldwide data initially
    displayCurrentStats(
        'Worldwide', globalActive, globalConfirmed, globalDeaths,
        globalRecovered, 0.0, 0.0);
  });
  // Populate recent heatmap data
  fetch(`/timereport?lat=1000.0&lng=1000.0`)
      .then((response) => response.json())
      .then((recentReports) => {
        recentReports.forEach((recentReport) => {
          globalRecentHeatmapData.push({
            location:
                new google.maps.LatLng(recentReport.lat, recentReport.lng),
            weight: recentReport.confirmed,
          });
        });
      });

  geocoder = new google.maps.Geocoder();
  document.getElementById('search-submit').addEventListener('click', () => {
    getCoordsFromSearch();
    displayLocationDataFromSearch();
  });
  placesAutoComplete = new google.maps.places.Autocomplete(
      document.getElementById('search-text'));
  placesAutoComplete.addListener('place_changed', () => {
    getCoordsFromSearch(geocoder, map);
  });
  document.getElementById('search-clear').addEventListener('click', () => {
    document.getElementById('search-text').value = '';
    bound.setPaths([]);
  });
  document.getElementById('search-text').addEventListener('click', () => {
    lastSearchClicked = 'location';
  });
  document.getElementById('search-content').addEventListener('click', () => {
    lastSearchClicked = 'video';
  });
  document.getElementById('start').addEventListener('click', () => {
    lastSearchClicked = 'route-start';
  });
  document.getElementById('end').addEventListener('click', () => {
    lastSearchClicked = 'route-end';
  });
  map.addListener('click', function(mapsMouseEvent) {
    const curLocation = mapsMouseEvent.latLng.toJSON();
    displayLatitudeLongitude(curLocation);
    displayLocationData(curLocation);
    placeMarker(map, curLocation);
    lastSearchClicked = 'map';
  });
  const CENTERSZOOM = 10;
  map.addListener('idle', function() {
    const relHeat = document.getElementById('relative-heat');
    if (relHeat.classList.contains('selected')) {
      changeRelativeHeat();
    }
    if (map.getZoom() >= CENTERSZOOM) {
      showTestCenters();
    }
  });
  map.addListener('zoom_changed', function() {
    if (map.getZoom() < CENTERSZOOM) {
      hideTestCenters();
    }
  });
  const directionsService = new google.maps.DirectionsService();
  const directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);
  document.getElementById('directions-search').addEventListener('click', () => {
    calculateAndDisplayRoute(directionsService, map);
  });
  document.getElementById('toggle-heat').addEventListener('click', () => {
    toggleHeatMap();
    changeHeat();
  });
  document.getElementById('stats').addEventListener('click', () => {
    toggleStats();
  });
  document.getElementById('statsMode').addEventListener('click', () => {
    if (!document.getElementById('statsMode').classList.contains('selected')) {
      document.getElementById('pieChartMode').classList.remove('selected');
      document.getElementById('graphMode').classList.remove('selected');
      document.getElementById('statsMode').classList.add('selected');
      document.getElementById('pieDiv').classList.add('inactive');
      document.getElementById('graphDiv').classList.add('inactive');
      document.getElementById('covidStats').classList.remove('inactive');
    }
  });
  document.getElementById('pieChartMode').addEventListener('click', () => {
    const pcm = document.getElementById('pieChartMode').classList;
    if (!pcm.contains('selected')) {
      document.getElementById('statsMode').classList.remove('selected');
      document.getElementById('graphMode').classList.remove('selected');
      document.getElementById('pieChartMode').classList.add('selected');
      document.getElementById('covidStats').classList.add('inactive');
      document.getElementById('graphDiv').classList.add('inactive');
      document.getElementById('pieDiv').classList.remove('inactive');
    }
  });
  document.getElementById('graphMode').addEventListener('click', () => {
    if (!document.getElementById('graphMode').classList.contains('selected')) {
      document.getElementById('pieChartMode').classList.remove('selected');
      document.getElementById('statsMode').classList.remove('selected');
      document.getElementById('graphMode').classList.add('selected');
      document.getElementById('pieDiv').classList.add('inactive');
      document.getElementById('covidStats').classList.add('inactive');
      document.getElementById('graphDiv').classList.remove('inactive');
    }
  });
  document.getElementById('openOverlay').addEventListener('click', () => {
    openNav();
  });
  document.getElementById('closebtn').addEventListener('click', () => {
    closeNav();
  });
  document.getElementById('dim').addEventListener('click', () => {
    closeNav();
  });
  document.getElementById('relative-heat').addEventListener('click', () => {
    document.getElementById('relative-heat').classList.toggle('selected');
    changeHeat();
  });
  document.getElementById('heatSlider').addEventListener('input', () => {
    updateHeatSize();
  });
  document.getElementById('heatMapType').addEventListener('change', () => {
    changeHeat();
  });
  document.getElementById('videos').addEventListener('click', () => {
    const searched = document.getElementById('search-content').value;
    if (searched === '') {
      searchForVideos(map, 'COVID-19 News');
    } else {
      searchForVideos(map, searched);
    }
  });
  document.onkeypress = function(keyPressed) {
    const keyCodeForEnter = 13;
    if (keyPressed.keyCode === keyCodeForEnter) {
      if (document.activeElement.tagName === 'BUTTON') {
        return;
      }
      if (!navOpen) {
        if (lastSearchClicked === 'map') {
          findWhatToSearch();
        } else if (lastSearchClicked === 'location') {
          getCoordsFromSearch();
          displayLocationDataFromSearch();
        } else if (lastSearchClicked === 'video') {
          findWhatToSearch();
        }
      } else {
        if (lastSearchClicked === 'route-end' ||
            lastSearchClicked === 'route-start') {
          calculateAndDisplayRoute();
        }
      }
    }
  };
  initOverlay();
}

// creates overlay of map
function initOverlay() {
  overlay = new google.maps.OverlayView();
  overlay.draw = function() {};
  overlay.setMap(map);
}

// searches 'COVID-19' if user doesn't specify search
function findWhatToSearch() {
  const searched = document.getElementById('search-content').value;
  if (searched === '') {
    searchForVideos(map, 'COVID-19 News');
  } else {
    searchForVideos(map, searched);
  }
}

// Put my location icon in bottom left corner
function initMyLocationControl(map) {
  document.getElementById('myLocation').addEventListener('click', () => {
    gotoUserLocation(map);
  });
  map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(
      document.querySelector('.my-location'));
}

// Put navigation in top left corner
function initTopBar(map) {
  map.controls[google.maps.ControlPosition.LEFT_TOP].push(
      document.querySelector('.topnav'));
}

// Put stats in top right corner
function initStatsDisplay(map) {
  map.controls[google.maps.ControlPosition.RIGHT_TOP].push(
      document.querySelector('.covidStats'));
}

function initRelativeHeat() {
  document.getElementById('relative-heat').classList.toggle('selected');
}

// Display menu and dim map
function openNav() {
  navOpen = true;
  document.getElementById('myNav').style.width = '350px';
  document.getElementById('dim').classList.toggle('fade');
}

// Close menu and fade out dim
function closeNav() {
  if (navOpen) {
    navOpen = false;
    document.getElementById('myNav').style.width = '0%';
    document.getElementById('dim').classList.toggle('fade');
  }
}

// Init each menu tab, opening up when clicked
const coll = document.getElementsByClassName('expand');
let i;
let firstOpen = true;
for (i = 0; i < coll.length; i++) {
  coll[i].addEventListener('click', function() {
    this.classList.toggle('active');
    const content = this.nextElementSibling;
    if (content.style.maxHeight) {
      content.style.maxHeight = null;
    } else {
      content.style.maxHeight = content.scrollHeight + 'px';
      if (this.id == 'route' && firstOpen) {
        /* eslint-disable no-undef */
        setCurrentLocation();
        /* eslint-enable no-undef */
        firstOpen = false;
      } else if (this.id == 'hmap') {
        displaySlider();
      }
    }
  });
}

// Display slider value
function displaySlider() {
  document.getElementById('sliderValue').innerHTML =
      document.getElementById('heatSlider').value;
}

// Update heat map based on slider
function updateHeatSize() {
  document.getElementById('sliderValue').innerHTML =
      document.getElementById('heatSlider').value;
  heatmap.setOptions({
    data: heatmap.getData(),
    dissipating: false,
    map: heatmap.getMap(),
    radius: document.getElementById('heatSlider').value,
  });
}

// places marker on map of clicked/searched location
function placeMarker(map, curLocation) {
  if (typeof curLocationMarker === 'undefined') {
    curLocationMarker =
        new google.maps.Marker({position: curLocation, map: map});
  } else {
    curLocationMarker.setPosition(curLocation);
  }
}

// Switch heat on and off
function toggleHeatMap() {
  if (heatmap.getMap() == null) {
    heatmap.setMap(map);
    bound.setOptions({'fillOpacity': 0.00});
  } else {
    heatmap.setMap(null);
    bound.setOptions({'fillOpacity': 0.15});
  }
  document.getElementById('toggle-heat').classList.toggle('selected');
}

// Toggle selected status and stats visability when menu button clicked
function toggleStats() {
  document.getElementById('stats').classList.toggle('unselected');
  document.getElementById('allStats').classList.toggle('inactive');
}

// Display type of data user selects
function changeHeat() {
  // If relative heat is on, show relative
  if (document.getElementById('relative-heat').classList.contains('selected')) {
    changeRelativeHeat();
    return;
  }
  // Otherwise show global heat
  const userChoice = document.getElementById('heatMapType').value;
  if (userChoice == 'confirmed') {
    heatmap.setData(globalConfirmedHeatmapData);
  } else if (userChoice == 'active') {
    heatmap.setData(globalActiveHeatmapData);
  } else if (userChoice == 'deaths') {
    heatmap.setData(globalDeathsHeatmapData);
  } else if (userChoice == 'recovered') {
    heatmap.setData(globalRecoveredHeatmapData);
  } else if (userChoice == 'population') {
    heatmap.setData(globalPopulationHeatmapData);
  } else if (userChoice == 'recent') {
    heatmap.setData(globalRecentHeatmapData);
  }
}

// Display heat relative to locations on screen
function changeRelativeHeat() {
  if (typeof heatmap === 'undefined') {
    return;
  }
  const userChoice = document.getElementById('heatMapType').value;
  // Get the coordinates that are on the screen
  const bounds = map.getBounds();
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();

  // Only add data that is contained within the coordinates on the screen
  if (userChoice == 'confirmed') {
    const relativeConfirmedCases = [];
    globalConfirmedHeatmapData.forEach((report) => {
      const loc = report.location;
      if (loc.lat() > southWest.lat() && loc.lat() < northEast.lat() &&
          loc.lng() > southWest.lng() && loc.lng() < northEast.lng()) {
        relativeConfirmedCases.push({
          location: new google.maps.LatLng(loc.lat(), loc.lng()),
          weight: report.weight,
        });
      }
    });
    heatmap.setData(relativeConfirmedCases);
  } else if (userChoice == 'active') {
    const relativeActiveCases = [];
    globalActiveHeatmapData.forEach((report) => {
      const loc = report.location;
      if (loc.lat() > southWest.lat() && loc.lat() < northEast.lat() &&
          loc.lng() > southWest.lng() && loc.lng() < northEast.lng()) {
        relativeActiveCases.push({
          location: new google.maps.LatLng(loc.lat(), loc.lng()),
          weight: report.weight,
        });
      }
    });
    heatmap.setData(relativeActiveCases);
  } else if (userChoice == 'deaths') {
    const relativeDeaths = [];
    globalDeathsHeatmapData.forEach((report) => {
      const loc = report.location;
      if (loc.lat() > southWest.lat() && loc.lat() < northEast.lat() &&
          loc.lng() > southWest.lng() && loc.lng() < northEast.lng()) {
        relativeDeaths.push({
          location: new google.maps.LatLng(loc.lat(), loc.lng()),
          weight: report.weight,
        });
      }
    });
    heatmap.setData(relativeDeaths);
  } else if (userChoice == 'recovered') {
    const relativeRecoveredCases = [];
    globalRecoveredHeatmapData.forEach((report) => {
      const loc = report.location;
      if (loc.lat() > southWest.lat() && loc.lat() < northEast.lat() &&
          loc.lng() > southWest.lng() && loc.lng() < northEast.lng()) {
        relativeRecoveredCases.push({
          location: new google.maps.LatLng(loc.lat(), loc.lng()),
          weight: report.weight,
        });
      }
    });
    heatmap.setData(relativeRecoveredCases);
  } else if (userChoice == 'population') {
    const relativePerCapCases = [];
    globalPopulationHeatmapData.forEach((report) => {
      const loc = report.location;
      if (loc.lat() > southWest.lat() && loc.lat() < northEast.lat() &&
          loc.lng() > southWest.lng() && loc.lng() < northEast.lng()) {
        relativePerCapCases.push({
          location: new google.maps.LatLng(loc.lat(), loc.lng()),
          weight: report.weight,
        });
      }
    });
    heatmap.setData(relativePerCapCases);
  } else if (userChoice == 'recent') {
    const relativeRecentCases = [];
    globalRecentHeatmapData.forEach((report) => {
      const loc = report.location;
      if (loc.lat() > southWest.lat() && loc.lat() < northEast.lat() &&
          loc.lng() > southWest.lng() && loc.lng() < northEast.lng()) {
        relativeRecentCases.push({
          location: new google.maps.LatLng(loc.lat(), loc.lng()),
          weight: report.weight,
        });
      }
    });
    heatmap.setData(relativeRecentCases);
  }
}

let markers = [];
let activeWindow = null;
// Show test centers visable on the map
function showTestCenters() {
  // Hide previously shown and get map bounds
  hideTestCenters();
  const bounds = map.getBounds();
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();
  const st = southWest.lat();
  const sg = southWest.lng();
  const nt = northEast.lat();
  const ng = northEast.lng();

  // Get all centers within screen view
  fetch(`/testcenters?swlat=${st}&swlng=${sg}&nelat=${nt}&nelng=${ng}`)
      .then((response) => response.json())
      .then((centers) => {
        centers.forEach((center) => {
          const contentString = `<h2>${center.name}</h2>` +
              `<p>Address: ${center.addr}</p>` +
              `<p>Hours: ${center.hours}</p>` +
              `<p>Phone: ${center.phone}</p>` +
              `<button type="button" class="markerRoute"` +
              `onClick="routeToCenter` +
              `(\'${center.addr}\'` +  // eslint-disable-line no-useless-escape
              `)">` +
              `Directions</button>` +
              `<style>.markerRoute{background:#4285f4;color:white;` +
              `border:none;outline:none;cursor:pointer;border-radius:4px;}` +
              `.markerRoute:hover{background:#0F9D58;}</style>`;
          const infowindow =
              new google.maps.InfoWindow({content: contentString});
          const marker = new google.maps.Marker({
            position: new google.maps.LatLng(center.lat, center.lng),
            map: map,
            icon:
                'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png',
          });
          // Close previously open info and open new one
          marker.addListener('click', function() {
            if (activeWindow != null) {
              activeWindow.close();
            }
            infowindow.open(map, marker);
            activeWindow = infowindow;
          });
          markers.push(marker);
        });
      });
}

// Hide all test centers from the map
function hideTestCenters() {
  for (let i = 0; i < markers.length; i++) {
    markers[i].setMap(null);
  }
  markers = [];
}

// Open routing and input center address
function routeToCenter(addr) {  // eslint-disable-line no-unused-vars
  document.getElementById('openOverlay').click();
  if (!document.getElementById('route').classList.contains('active')) {
    document.getElementById('route').click();
  }
  document.getElementById('end').value = addr;
}

// Recenter map to location searched and update current coordinates
function getCoordsFromSearch() {
  const address = document.getElementById('search-text').value;
  if (address !== '') {
    geocoder.geocode({address: address}, (results, status) => {
      if (status === 'OK') {
        const foundLocation = results[0].geometry.location;
        map.fitBounds(results[0].geometry.viewport);
        displayLatitudeLongitude(foundLocation.toJSON());
        placeMarker(map, foundLocation.toJSON());
        setBoundaries(address, results);
        findWhatToSearch();
      } else {
        alert('Geocode was not successful for the following reason: ' + status);
      }
    });
  }
}

/**
 * Draws Boundaries of searched location on the map if it exists
 */
function setBoundaries(query, googleMapsResponse) {
  let url = 'https://nominatim.openstreetmap.org/search?q=';
  url += encodeURI(query);
  url += '&format=json&polygon_geojson=1';
  bound.setPaths([]);
  const types = googleMapsResponse[0].types;
  fetch(url).then((response) => response.json()).then((data) => {
    let num = 0;
    while (num < data.length) {
      const googleMaps = googleMapsResponse[0].geometry;
      const openStreetMap = data[num].boundingbox;
      if (data[num].geojson.type === 'Point') {
        num += 1;
        continue;
      }
      if (boundsSimilar(googleMaps, openStreetMap)) {
        break;
      }
      num += 1;
    }
    if (num === data.length) {
      if (!types.includes('country')) {
        if (!types.includes('administrative_area_level_1')) {  // state (in US)
          return;
        }
      }
      num = 0;
    }
    if (!('geojson' in data[num])) {
      return;
    }
    const coords = data[num].geojson.coordinates;
    const latlngs = [];
    for (let i = 0; i < coords.length; i++) {
      latlngs.push([]);
      let path = coords[i];
      if (data[num].geojson.type === 'MultiPolygon') {
        path = coords[i][0];
      }
      for (let k = 0; k < path.length; k++) {
        latlngs[i].push({
          'lat': parseFloat(path[k][1]),
          'lng': parseFloat(path[k][0]),
        });
      }
    }
    bound.setPaths(latlngs);
    bound.setMap(map);
  });
}

/**
 * Compares google maps bounds with openstreetmap bounds
 */
function boundsSimilar(googleMapsResponse, openStreetMap) {
  let googleMapsBounds;
  if (Object.prototype.hasOwnProperty.call(googleMapsResponse, 'bounds')) {
    googleMapsBounds = googleMapsResponse.bounds;
  } else {
    googleMapsBounds = googleMapsResponse.viewport;
  }
  const MAX_DIFFERENCE = 0.25;
  const googleMaps = [
    googleMapsBounds.Va.i,
    googleMapsBounds.Va.j,
    googleMapsBounds.Za.i,
    googleMapsBounds.Za.j,
  ];
  let matches = 0;
  for (let i = 0; i < openStreetMap.length; i++) {
    const value = parseFloat(openStreetMap[i]);
    for (let j = 0; j < googleMaps.length; j++) {
      const diff = Math.abs(value - googleMaps[j]);
      if (diff <= MAX_DIFFERENCE) {
        matches += 1;
        break;
      }
    }
  }
  return matches === openStreetMap.length;
}

// Update displayed COVID stats based on address
function displayLocationDataFromSearch() {
  const address = document.getElementById('search-text').value;
  if (address !== '') {
    geocoder.geocode({address: address}, (results, status) => {
      if (status === 'OK') {
        displayLocationData(results[0].geometry.location.toJSON());
      } else {
        alert('Geocode was not successful for the following reason: ' + status);
      }
    });
  }
}

/**
 * Create a Youtube player when api is loaded
 */
function onYouTubeIframeAPIReady() {  // eslint-disable-line no-unused-vars
  player = new VideoPlayer();
  player.resizeVideo();
}

function gotoUserLocation(map) {
  const geoOptions = {
    timeout: 10 * 1000,         // 10 seconds
    maximumAge: 5 * 60 * 1000,  // last 5 minutes
  };

  const geoSuccess = function(position) {
    const location = new google.maps.LatLng(
        position.coords.latitude, position.coords.longitude);
    map.setCenter(location);
    const zoomLargeEnoughToShowMultipleCities = 8;
    map.setZoom(zoomLargeEnoughToShowMultipleCities);
    displayLocationData(location.toJSON());
    displayLatitudeLongitude(location.toJSON());
  };
  const geoError = function(error) {
    console.log('Error occurred. Error code: ' + error.code);
    // error.code can be:
    //   0: unknown error
    //   1: permission denied
    //   2: position unavailable (error response from location provider)
    //   3: timed out
  };

  navigator.geolocation.getCurrentPosition(geoSuccess, geoError, geoOptions);
}

// makes videoplayer draggable
$('#video-background').draggable({
  cursor: 'move',
  iframeFix: true,
  scroll: false,
  containment: 'window',
});

// makes videoplayer resizable
$('.resizable').resizable({
  autoHide: true,
  start: function(event, ui) {
    ui.element.append($('<div/>', {
      id: 'iframe-overlay',
      css: {
        'position': 'absolute',
        'top': '0',
        'right': '0',
        'bottom': '0',
        'left': '0',
        'z-index': '10',
      },
    }));
  },
  stop: function(event, ui) {
    $('#iframe-overlay', ui.element).remove();
  },
  resize: function(event, ui) {
    $('iframe', ui.element).width(ui.size.width).height(ui.size.height);
  },
});
