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

/* globals VideoPlayer, searchForVideos */

// Get API key from hidden file and use it to get the map
const mykey = keys.MAPS_API_KEY;
document.getElementById('mapUrl').src = mykey;

let player;

// When the page loads, call createMap
window.onload = function() {
  createMap();
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
  fetch('/report').then((response) => response.json()).then((reports) => {
    reports.forEach((report) => {
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
          if (location.long_name.trim().valueOf().includes(
              report.territory.trim().valueOf()) ||
              report.territory.trim().valueOf().includes(
              location.long_name.trim().valueOf())) {
            potentialReport = report;
            displayCurrentStats(
                location.long_name.trim().valueOf(), potentialReport.active,
                potentialReport.confirmed, potentialReport.deaths,
                potentialReport.recovered);
            foundFlag = true;
            return;
          }
        });
      });
      // If no match was found, take the report closest to the user request
      if (foundFlag == false) {
        const bigDistance = 1000;
        let minimumDistance = bigDistance;
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
  });
}

// Initialize global data
let globalActive = 0;
let globalConfirmed = 0;
let globalDeaths = 0;
let globalRecovered = 0;
function displayCurrentStats(location, active, confirmed, deaths, recovered) {
  // Display global data
  document.getElementById('location').innerHTML = location;
  document.getElementById('displayActive').innerHTML = `Active: ${active}`;
  document.getElementById('displayConfirmed').innerHTML =
      `Confirmed: ${confirmed}`;
  document.getElementById('displayDeaths').innerHTML = `Deaths: ${deaths}`;
  document.getElementById('displayRecovered').innerHTML =
      `Recovered: ${recovered}`;
}

// Create a map zoomed in on Googleplex
function createMap() {
  const map = new google.maps.Map(
      document.getElementById('map'),
      {center: {lat: 39.496, lng: -99.031}, zoom: 5});
  // Gets active case data and displays as heat map
  fetch('/report').then((response) => response.json()).then((reports) => {
    const heatmapData = [];
    reports.forEach((report) => {
      heatmapData.push({
        location: new google.maps.LatLng(report.lat, report.lng),
        weight: report.active,
      });
      // Calculate worldwide data
      globalActive += report.active;
      globalConfirmed += report.confirmed;
      globalDeaths += report.deaths;
      globalRecovered += report.recovered;
    });
    heatmap = new google.maps.visualization.HeatmapLayer(
        {data: heatmapData, dissipating: false, map: map});
    // Display worldwide data initially
    displayCurrentStats(
        'Worldwide', globalActive, globalConfirmed, globalDeaths,
        globalRecovered);
  });

  const geocoder = new google.maps.Geocoder();
  document.getElementById('search-submit').addEventListener('click', () => {
    getCoordsFromSearch(geocoder, map);
    displayLocationDataFromSearch(geocoder);
  });
  document.getElementById('my-location').addEventListener('click', () => {
    gotoUserLocation(map);
  });
  map.addListener('click', function(mapsMouseEvent) {
    displayLatitudeLongitude(mapsMouseEvent.latLng.toJSON());
    displayLocationData(mapsMouseEvent.latLng.toJSON());
  });
  document.getElementById('videos').addEventListener('click', () => {
    searchForVideos(map);
  });
  document.onkeypress = function(keyPressed) {
    const keyCodeForEnter = 13;
    if (keyPressed.keyCode === keyCodeForEnter) {
      searchForVideos(map);
    }
  };
}

// Recenter map to location searched and update current coordinates
function getCoordsFromSearch(geocoder, map) {
  const address = document.getElementById('search-text').value;
  geocoder.geocode({address: address}, (results, status) => {
    if (status === 'OK') {
      map.setCenter(results[0].geometry.location);
      displayLatitudeLongitude(results[0].geometry.location.toJSON());
    } else {
      alert('Geocode was not successful for the following reason: ' + status);
    }
  });
}

function displayLocationDataFromSearch(geocoder) {
  const address = document.getElementById('search-text').value;
  geocoder.geocode({address: address}, (results, status) => {
    if (status === 'OK') {
      displayLocationData(results[0].geometry.location.toJSON());
    } else {
      alert('Geocode was not successful for the following reason: ' + status);
    }
  });
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
