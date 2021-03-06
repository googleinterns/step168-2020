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

/* exported calculateAndDisplayRoute addDirectionsListeners hideRouteMarkers
 * showRouteMarkers getRouteLink shortenLinkThenEmail createEmail */
/* globals casesData map geocoder */

const NUM_WAYPOINTS = 10;
let directionsService;
let chosenRoute = 0;
let routeLines = [];
let routeMarkers = [];
let routeStart = '';
let routeEnd = '';
let travelMode = '';

/**
 * Set functions that run when directions inputs are changed
 */
function addDirectionsListeners() {
  const directionsRenderer = new google.maps.DirectionsRenderer();
  directionsService = new google.maps.DirectionsService();
  directionsRenderer.setMap(map);
  document.getElementById('directions-search').addEventListener('click', () => {
    calculateAndDisplayRoute();
  });
  document.getElementById('show-alternate-routes')
      .addEventListener('click', () => {
        toggleAlternateRoutes();
      });
  document.getElementById('show-expanded-routes')
      .addEventListener('click', () => {
        toggleExpandedRouteInfo();
      });
  document.getElementById('driving').classList.add('selected');
  travelMode = 'DRIVING';
  document.getElementById('driving').addEventListener('click', () => {
    let sameMode = false;
    if (document.getElementById('driving').classList.contains('selected')) {
      sameMode = true;
    }
    document.getElementById('walking').classList.remove('selected');
    document.getElementById('biking').classList.remove('selected');
    document.getElementById('driving').classList.add('selected');
    travelMode = 'DRIVING';
    const rS = document.getElementById('start').value;
    const rE = document.getElementById('end').value;
    if (rS != '' && rE != '' && sameMode == false) {
      calculateAndDisplayRoute(directionsService, map);
    }
  });
  document.getElementById('walking').addEventListener('click', () => {
    let sameMode = false;
    if (document.getElementById('walking').classList.contains('selected')) {
      sameMode = true;
    }
    document.getElementById('driving').classList.remove('selected');
    document.getElementById('biking').classList.remove('selected');
    document.getElementById('walking').classList.add('selected');
    travelMode = 'WALKING';
    const rS = document.getElementById('start').value;
    const rE = document.getElementById('end').value;
    if (rS != '' && rE != '' && sameMode == false) {
      calculateAndDisplayRoute(directionsService, map);
    }
  });
  document.getElementById('biking').addEventListener('click', () => {
    let sameMode = false;
    if (document.getElementById('biking').classList.contains('selected')) {
      sameMode = true;
    }
    document.getElementById('walking').classList.remove('selected');
    document.getElementById('driving').classList.remove('selected');
    document.getElementById('biking').classList.add('selected');
    travelMode = 'BICYCLING';
    const rS = document.getElementById('start').value;
    const rE = document.getElementById('end').value;
    if (rS != '' && rE != '' && sameMode == false) {
      calculateAndDisplayRoute(directionsService, map);
    }
  });
  document.getElementById('open-map-link').addEventListener('click', () => {
    window.open(encodeURI(getRouteLink()), '_blank');
  });
  document.getElementById('open-map-email').addEventListener('click', () => {
    shortenLinkThenEmail();
  });
  document.getElementById('route-selector').addEventListener('input', () => {
    changeSelectedRoute(document.getElementById('route-selector').value);
  });
  document.getElementById('clear-route').addEventListener('click', () => {
    document.getElementById('start').value = '';
    document.getElementById('end').value = '';
    resetRoute();
  });
  new google.maps.places.Autocomplete(document.getElementById('start'));
  new google.maps.places.Autocomplete(document.getElementById('end'));
}

/**
 * Get route from Directions API
 * Calulate cases for each route
 * Display route with fewest cases
 */
function calculateAndDisplayRoute() {
  routeStart = document.getElementById('start').value;
  routeEnd = document.getElementById('end').value;

  directionsService.route(
      {
        origin: {query: routeStart},
        destination: {query: routeEnd},
        travelMode: google.maps.TravelMode[travelMode],
        provideRouteAlternatives: true,
      },
      (response, status) => {
        console.debug(response);
        resetRoute();
        if (status === 'OK') {
          const active = [];
          const distance = [];
          const time = [];
          for (let i = 0; i < response.routes.length; i++) {
            const values = processRoute(map, response, i);
            active.push(values[0]);
            distance.push(values[1]);
            time.push(values[2]);
          }
          const activeDiff = percentDifference(active);
          const distanceDiff = percentDifference(distance);
          const timeDiff = percentDifference(time);
          const score = [];
          for (let i = 0; i < activeDiff.length; i++) {
            score.push(activeDiff[i] + distanceDiff[i] + timeDiff[i]);
          }
          console.log('Route Scores:', score);
          chosenRoute = score.indexOf(Math.min(...score));
          changeSelectedRoute(chosenRoute);

          document.getElementById('show-alternate-routes')
              .classList.remove('selected');
          document.getElementById('show-expanded-routes')
              .classList.remove('selected');
          hideAlternateRoutes();
          hideRouteInfo();
        } else {
          window.alert('Directions request failed due to ' + status);
        }
      });
}

/**
 * Clear route from map
 */
function resetRoute() {
  for (let i = 0; i < routeLines.length; i++) {
    routeLines[i].route.setMap(null);
    routeLines[i].polyline.setMap(null);
  }
  routeLines = [];
  for (let i = 0; i < routeMarkers.length; i++) {
    routeMarkers[i].setMap(null);
  }
  routeMarkers = [];
  resetRouteTable();
}

/**
 * Calculates number of active cases close to route
 *
 * Each directions response gives a list of points along the route
 * This function loop through those points and finds the closest cases data
 * point which is added to the routes total (excluding duplicates) This function
 * also creates markers that show which points are used but the markers are
 * hidden by default
 */
function processRoute(mapObject, response, i) {
  const route = response.routes[i];
  const counted = [];
  const points = route.overview_path;
  routeLines.push({
    route: new google.maps.DirectionsRenderer({
      map: mapObject,
      directions: response,
      routeIndex: i,
      options: {
        polylineOptions: {
          strokeColor: 'grey',
          strokeOpacity: 1,
          strokeWeight: 3,
          zIndex: 1,
        },
        infoWindow: new google.maps.InfoWindow(),
        suppressInfoWindows: false,
      },
    }),
    polyline: new google.maps.Polyline({
      strokeOpacity: 0,
      strokeWeight: 20,
      path: points,
      zIndex: 5,
    }),
    active: 0,
    waypoints: [],
    infoWindow: new google.maps.InfoWindow(),
  });
  google.maps.event.addListener(routeLines[i].polyline, 'click', () => {
    if (i != chosenRoute) {
      changeSelectedRoute(i);
    }
  });
  const waypointInterval = Math.floor(points.length / NUM_WAYPOINTS) - 1;
  for (let j = 0; j < points.length; j += 1) {
    const lat = points[j].lat();
    const lng = points[j].lng();
    const latLng = new google.maps.LatLng(lat, lng);
    const marker = new google.maps.Marker({
      position: latLng,
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      },
      visible: false,
    });
    marker.setMap(map);
    routeMarkers.push(marker);
    if (j % waypointInterval === 0) {
      routeLines[i].waypoints.push({
        'lat': lat,
        'lng': lng,
      });
    }
    const closest = findClosest(points[j].lat(), points[j].lng());
    let duplicate = false;
    for (let k = 0; k < counted.length; k++) {
      if (closest === counted[k]) {
        duplicate = true;
        break;
      }
    }
    if (!duplicate) {
      routeLines[i].active += closest.active;
      counted.push(closest);
    }
    if (j === Math.floor(points.length / 2)) {
      routeLines[i].infoWindow.setContent(i.toString());
      routeLines[i].infoWindow.setPosition(latLng);
      // routeLines[i].infoWindow.open(map);
    }
  }
  addTableRow(
      routeLines[i].active, route.legs[0].distance.text,
      route.legs[0].duration.text);
  console.log(`"Route ${i} has ${routeLines[i].active} cases"`);
  return [
    routeLines[i].active,
    route.legs[0].distance.value,
    route.legs[0].duration.value,
  ];
}

/**
 * Clear epanded route info table
 */
function resetRouteTable() {
  const table =
      document.getElementById('route-info').getElementsByTagName('tbody')[0];
  const length = table.rows.length;
  const selector = document.getElementById('route-selector');
  for (let i = 0; i < length; i++) {
    table.deleteRow(0);
    selector.remove(0);
  }
}

/**
 * Add row to expanded table with route color, cases, distance, and time
 */
function addTableRow(cases, distance, time) {
  const table =
      document.getElementById('route-info').getElementsByTagName('tbody')[0];
  const row = table.insertRow();
  const selector = document.getElementById('route-selector');
  const option = document.createElement('option');
  option.value = table.rows.length - 1;
  option.textContent = table.rows.length;
  selector.appendChild(option);
  for (let i = 0; i < 5; i++) {
    row.insertCell();
  }
  row.cells[0].textContent = table.rows.length;
  row.cells[1].textContent = cases;
  row.cells[2].textContent = distance;
  row.cells[3].textContent = time;
}

/**
 * Changes chosen route and shows alternate routes
 */
function changeSelectedRoute(route) {
  chosenRoute = route;
  for (let i = 0; i < routeLines.length; i++) {
    const options = {
      strokeColor: 'grey',
      strokeWeight: 3,
      zIndex: 1,
    };
    if (i == chosenRoute) {
      options.strokeColor = 'blue';
      options.strokeOpacity = 1;
      options.strokeWeight = 7;
      options.zIndex = 3;
    }
    routeLines[i].route.setOptions({
      polylineOptions: options,
    });
    const aR = document.getElementById('show-alternate-routes');
    if (!aR.classList.contains('selected')) {
      document.getElementById('show-alternate-routes')
          .classList.toggle('selected');
    }
    showAlternateRoutes();
  }
  document.getElementById('route-selector').value = route;
  document.getElementById('route-active-count').textContent =
      routeLines[route].active;
}

/**
 * Return value / min value for each value in values
 */
function percentDifference(values) {
  const minVal = Math.min(...values);
  const percents = [];
  for (let i = 0; i < values.length; i++) {
    percents.push((values[i] / minVal));
  }
  return percents;
}

/**
 * Make route markers hidden
 */
function hideRouteMarkers() {
  for (let i = 0; i < routeMarkers.length; i++) {
    routeMarkers[i].setVisible(false);
  }
}

/**
 * Make route markers visible
 */
function showRouteMarkers() {
  showAlternateRoutes();
  for (let i = 0; i < routeMarkers.length; i++) {
    routeMarkers[i].setVisible(true);
  }
}

/**
 * Make alternate routes hidden
 */
function hideAlternateRoutes() {
  for (let i = 0; i < routeLines.length; i++) {
    if (i != chosenRoute) {
      routeLines[i].route.setMap(null);
      routeLines[i].polyline.setMap(null);
    }
  }
}

/**
 * Make alternate routes visible
 */
function showAlternateRoutes() {
  for (let i = 0; i < routeLines.length; i++) {
    routeLines[i].route.setMap(map);
    routeLines[i].polyline.setMap(map);
  }
}

/**
 * Switch alternate routes on and off
 */
function toggleAlternateRoutes() {
  showRouteInfo();
  for (let i = 0; i < routeLines.length; i++) {
    if (i != chosenRoute) {
      if (routeLines[i].route.getMap() == null) {
        routeLines[i].route.setMap(map);
        routeLines[i].polyline.setMap(map);
      } else {
        routeLines[i].route.setMap(null);
        routeLines[i].polyline.setMap(null);
      }
    }
  }
  document.getElementById('show-alternate-routes').classList.toggle('selected');
}

/**
 * Make table with distance, time, and active cases of each route visible
 */
function showRouteInfo() {
  document.getElementById('expanded-routing').style.display = 'block';
  document.getElementById('routeContent').style.maxHeight =
      document.getElementById('routeContent').scrollHeight + 'px';
  document.getElementById('show-expanded-routes').classList.add('selected');
}

/**
 * Make table with distance, time, and active cases of each route hidden
 */
function hideRouteInfo() {
  document.getElementById('expanded-routing').style.display = 'none';
  document.getElementById('show-expanded-routes').classList.remove('selected');
}

/**
 * Show expanded route info if hidden and hide if not
 */
function toggleExpandedRouteInfo() {
  const eR = document.getElementById('show-expanded-routes');
  if (!eR.classList.contains('selected')) {
    showRouteInfo();
  } else {
    hideRouteInfo();
  }
}

/**
 * Return the case with latitude and longotude closest to given
 */
function findClosest(lat, lng) {
  let closest = {};
  let closestValue = null;
  for (let i = 0; i < casesData.length; i++) {
    const diff =
        Math.abs(casesData[i].lat - lat) + Math.abs(casesData[i].lng - lng);
    if (closestValue === null || diff < closestValue) {
      closest = casesData[i];
      closestValue = diff;
    }
  }
  return closest;
}

/**
 * Generate link to open google maps with selected route
 */
function getRouteLink() {
  let link = 'https://www.google.com/maps/dir/?api=1';
  link += '&origin=' + routeStart;
  link += '&destination=' + routeEnd;
  link += '&travelmode=' + travelMode.toLowerCase();
  link += '&waypoints=';
  const waypoints = routeLines[chosenRoute].waypoints;
  for (let i = 0; i < waypoints.length; i++) {
    if (i > 0) {
      link += '|';
    }
    link += waypoints[i].lat + ',' + waypoints[i].lng;
  }
  console.log('Link', encodeURI(link));
  return link;
}

function shortenLinkThenEmail() {
  const link = encodeURIComponent(getRouteLink());
  fetch(`/linkshorten?url=${link}`)
      .then((response) => response.text())
      .then((id) => {
        createEmail(`${location.origin}/link?id=${id}`);
      });
}

function createEmail(shortLink) {
  const LINE_BREAK = '%0D%0A';
  let body = 'Click on the link below to open in Google Maps:';
  body += LINE_BREAK + LINE_BREAK;
  body += encodeURI(shortLink);
  body += LINE_BREAK + LINE_BREAK;
  body += 'Direct link:';
  body += LINE_BREAK + LINE_BREAK;
  body += encodeURIComponent(encodeURI(getRouteLink()));
  window.open('mailto:?subject=Videomap Route&body=' + body);
}

/* eslint-disable no-unused-vars */
/**
 * Set route start to current location
 */
function setCurrentLocation() {
  const geoOptions = {
    timeout: 10 * 1000,         // 10 seconds
    maximumAge: 5 * 60 * 1000,  // last 5 minutes
  };

  const geoSuccess = function(position) {
    const latlng = {
      'lat': position.coords.latitude,
      'lng': position.coords.longitude,
    };
    geocoder.geocode({location: latlng}, (results, status) => {
      if (status === 'OK') {
        console.log(results);
        document.getElementById('start').value = results[0].formatted_address;
      } else {
        alert('Geocode was not successful for the following reason: ' + status);
      }
    });
  };
  const geoError = function(error) {
    console.log('Error occurred. Error code: ' + error.code);
  };

  navigator.geolocation.getCurrentPosition(geoSuccess, geoError, geoOptions);
}
/* eslint-enable no-unused-vars */
