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

// When the page loads, call createMap
window.onload = function() {
  createMap();
  addDirectionsListeners();
};

// Update currently displayed coordinates
function displayLatitudeLongitude(value) {
  document.getElementById('latitude').value = value['lat'];
  document.getElementById('longitude').value = value['lng'];
}

// Update displayed COVID stats based on coordinates
function displayLocationData(value) {
  const potentialReports = [];
  const RADIUS = 1.5;
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
        globalRecovered);
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
        // If there is a match, display that territory's statistics
        const lName = location.long_name.trim().valueOf();
        const rName = report.territory.trim().valueOf();
        if (lName.includes(rName) || rName.includes(lName)) {
          potentialReport = report;
          displayCurrentStats(
              lName, potentialReport.active, potentialReport.confirmed,
              potentialReport.deaths, potentialReport.recovered);
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
          potentialReport.recovered);
    }
  });
}

// Initialize global data
let globalActive = 0;
let globalConfirmed = 0;
let globalDeaths = 0;
let globalRecovered = 0;
// Display COVID data in html
function displayCurrentStats(location, active, confirmed, deaths, recovered) {
  document.getElementById('location').innerHTML = location;
  document.getElementById('displayActive').innerHTML = `Active: ${active}`;
  document.getElementById('displayConfirmed').innerHTML =
      `Confirmed: ${confirmed}`;
  document.getElementById('displayDeaths').innerHTML = `Deaths: ${deaths}`;
  document.getElementById('displayRecovered').innerHTML =
      `Recovered: ${recovered}`;
}

// Initialize global heat maps
const globalConfirmedHeatmapData = [];
const globalActiveHeatmapData = [];
const globalDeathsHeatmapData = [];
const globalRecoveredHeatmapData = [];
const globalPopulationHeatmapData = [];


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
  initStatsDisplay(map);
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
        globalRecovered);
  });

  geocoder = new google.maps.Geocoder();
  document.getElementById('search-submit').addEventListener('click', () => {
    getCoordsFromSearch();
    displayLocationDataFromSearch();
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
  map.addListener('idle', function() {
    const relHeat = document.getElementById('relative-heat');
    if (relHeat.classList.contains('selected')) {
      changeRelativeHeat();
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
  document.getElementById('openOverlay').addEventListener('click', () => {
    openNav();
  });
  document.getElementById('closebtn').addEventListener('click', () => {
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
      if (!navOpen) {
        if (lastSearchClicked === 'map') {
          findWhatToSearch();
        } else if (lastSearchClicked === 'location') {
          getCoordsFromSearch();
          displayLocationDataFromSearch();
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
  navOpen = false;
  document.getElementById('myNav').style.width = '0%';
  document.getElementById('dim').classList.toggle('fade');
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
  document.getElementById('covidStats').classList.toggle('inactive');
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
  }
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
