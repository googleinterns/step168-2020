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

/* globals VideoPlayer */

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
    });
    heatmap = new google.maps.visualization.HeatmapLayer(
        {data: heatmapData, dissipating: false, map: map});
  });

  const geocoder = new google.maps.Geocoder();
  document.getElementById('search-submit').addEventListener('click', () => {
    getCoordsFromSearch(geocoder, map);
  });
  document.getElementById('my-location').addEventListener('click', () => {
    gotoUserLocation(map);
  });
  map.addListener('click', function(mapsMouseEvent) {
    displayLatitudeLongitude(mapsMouseEvent.latLng.toJSON());
  });

  const directionsService = new google.maps.DirectionsService();
  const directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);

  document.getElementById('directions-search').addEventListener('click', () => {
    calculateAndDisplayRoute(directionsService, directionsRenderer);
  });
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
    map.setZoom(8);
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

function calculateAndDisplayRoute(directionsService, directionsRenderer) {
  directionsService.route(
      {
        origin: {query: document.getElementById('start').value},
        destination: {query: document.getElementById('end').value},
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
      },
      (response, status) => {
        console.log(response);
        if (status === 'OK') {
          directionsRenderer.setDirections(response);
        } else {
          window.alert('Directions request failed due to ' + status);
        }
      });
}
