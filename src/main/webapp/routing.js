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

/* exported calculateAndDisplayRoute hideRouteMarkers showRouteMarkers
 * toggleAlternateRoutes toggleExpandedRouteInfo */
/* globals casesData map */

let chosenRoute = 0;
let routeLines = [];
let routeMarkers = [];

/**
 * Get route from Directions API
 * Calulate cases for each route
 * Display route with fewest cases
 */
function calculateAndDisplayRoute(directionsService, mapObject) {
  directionsService.route(
      {
        origin: {query: document.getElementById('start').value},
        destination: {query: document.getElementById('end').value},
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
      },
      (response, status) => {
        console.debug(response);
        for (let i = 0; i < routeLines.length; i++) {
          routeLines[i].route.setMap(null);
        }
        routeLines = [];
        for (let i = 0; i < routeMarkers.length; i++) {
          routeMarkers[i].setMap(null);
        }
        routeMarkers = [];
        if (status === 'OK') {
          resetRouteTable();
          for (let i = 0; i < response.routes.length; i++) {
            processRoute(mapObject, response, i);
          }
          let minCases = null;
          for (let i = 0; i < routeLines.length; i++) {
            if (minCases === null || routeLines[i].active < minCases) {
              minCases = routeLines[i].active;
              chosenRoute = i;
            }
          }
          console.log('Route with least cases is', chosenRoute);
          hideAlternateRoutes();
          document.getElementById('route-active-count').textContent = minCases;
        } else {
          window.alert('Directions request failed due to ' + status);
        }
      });
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
  routeLines.push({
    route: new google.maps.DirectionsRenderer(
        {map: mapObject, directions: response, routeIndex: i}),
    active: 0,
  });
  const route = response.routes[i];
  const counted = [];
  const points = route.overview_path;
  for (let j = 0; j < points.length; j += 1) {
    const latLng = new google.maps.LatLng(points[j].lat(), points[j].lng());
    const marker = new google.maps.Marker({
      position: latLng,
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      },
      visible: false,
    });
    marker.setMap(map);
    routeMarkers.push(marker);
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
      const closeLatLng = new google.maps.LatLng(closest.lat, closest.lng);
      const marker = new google.maps.Marker({
        position: closeLatLng,
        visible: false,
      });
      marker.setMap(mapObject);
      routeMarkers.push(marker);
    }
  }
  addTableRow(
      'TEMP', routeLines[i].active, route.legs[0].distance.text,
      route.legs[0].duration.text);
  console.log(`"Route ${i} has ${routeLines[i].active} cases"`);
}

function resetRouteTable() {
  const table =
      document.getElementById('route-info').getElementsByTagName('tbody')[0];
  for (let i = 0; i < table.rows.length; i++) {
    table.deleteRow(0);
  }
}

function addTableRow(color, cases, distance, time) {
  const table =
      document.getElementById('route-info').getElementsByTagName('tbody')[0];
  const row = table.insertRow();
  for (let i = 0; i < 4; i++) {
    row.insertCell();
  }
  row.cells[0].textContent = color;
  row.cells[1].textContent = cases;
  row.cells[2].textContent = distance;
  row.cells[3].textContent = time;
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
    }
  }
}

/**
 * Make alternate routes visible
 */
function showAlternateRoutes() {
  for (let i = 0; i < routeLines.length; i++) {
    routeLines[i].route.setMap(map);
  }
}

function toggleAlternateRoutes() {
  if (document.getElementById('show-alternate-routes').checked) {
    showAlternateRoutes();
  } else {
    hideAlternateRoutes();
  }
}

function showRouteInfo() {
  document.getElementById('expanded-routing').style.display = 'block';
}

function hideRouteInfo() {
  document.getElementById('expanded-routing').style.display = 'none';
}

function toggleExpandedRouteInfo() {
  if (document.getElementById('show-expanded-routes').checked) {
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
