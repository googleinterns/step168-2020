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

// Get API key from hidden file and use it to get the map
var mykey = keys.MAPS_API_KEY;
document.getElementById('mapUrl').src = mykey;

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
      {center: {lat: 37.422, lng: -122.084}, zoom: 16});
  // Gets active case data and displays as heat map   
  fetch('/report').then(response => response.json()).then((reports) => {
    var heatmapData = [];
    reports.forEach((report) => {
      heatmapData.push({
        location: new google.maps.LatLng(report.lat, report.lng),
        weight: report.active
      });
    });
    heatmap = new google.maps.visualization.HeatmapLayer(
        {data: heatmapData, dissipating: false, map: map});
  });

  const geocoder = new google.maps.Geocoder();
  document.getElementById('search-submit').addEventListener('click', () => {
    getCoordsFromSearch(geocoder, map);
  });
  map.addListener('click', function(mapsMouseEvent) {
    displayLatitudeLongitude(mapsMouseEvent.latLng.toJSON());
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
