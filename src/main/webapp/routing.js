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
 * showRouteMarkers */
/* globals casesData map */

let chosenRoute = 0;
let routeLines = [];
let routeMarkers = [];
const routeColors =
    ['blue', 'red', 'cyan', 'magenta', 'purple', 'yellow', 'orange'];

function addDirectionsListeners() {
  document.getElementById('show-expanded-routes')
      .addEventListener('click', () => {
        toggleExpandedRouteInfo();
      });
  document.getElementById('route-selector').addEventListener('input', () => {
    changeSelectedRoute(document.getElementById('route-selector').value);
  });
  document.getElementById('alternateRoutes').addEventListener('click', () => {
    toggleAlternateRoutes();
  });
}

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
        resetRouteTable();
        if (status === 'OK') {
          const active = [];
          const distance = [];
          const time = [];
          for (let i = 0; i < response.routes.length; i++) {
            const values = processRoute(mapObject, response, i);
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

          document.getElementById('alternateRoutes')
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
    route: new google.maps.DirectionsRenderer({
      map: mapObject,
      directions: response,
      routeIndex: i,
      options: {
        polylineOptions: {
          strokeColor: routeColors[i],
          strokeOpacity: 1,
          strokeWeight: 3,
        },
      },
    }),
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
      routeColors[i], routeLines[i].active, route.legs[0].distance.text,
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
function addTableRow(color, cases, distance, time) {
  const table =
      document.getElementById('route-info').getElementsByTagName('tbody')[0];
  const row = table.insertRow();
  const selector = document.getElementById('route-selector');
  const option = document.createElement('option');
  option.value = table.rows.length - 1;
  option.textContent = color;
  selector.appendChild(option);
  for (let i = 0; i < 5; i++) {
    row.insertCell();
  }
  row.cells[0].textContent = color;
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
      strokeColor: routeColors[i],
      strokeOpacity: 0.6,
      strokeWeight: 3,
    };
    if (i == chosenRoute) {
      options.strokeOpacity = 1;
      options.strokeWeight = 7;
    }
    routeLines[i].route.setOptions({
      polylineOptions: options,
    });
    const aR = document.getElementById('alternateRoutes');
    if (!aR.classList.contains('selected')) {
      document.getElementById('alternateRoutes').classList.toggle('selected');
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

/**
 * Switch alternate routes on and off
 */
function toggleAlternateRoutes() {
  for (let i = 0; i < routeLines.length; i++) {
    if (i != chosenRoute) {
      if (routeLines[i].route.getMap() == null) {
        routeLines[i].route.setMap(map);
      } else {
        routeLines[i].route.setMap(null);
      }
    }
  }
  document.getElementById('alternateRoutes').classList.toggle('selected');
}

/**
 * Make table with distance, time, and active cases of each route visible
 */
function showRouteInfo() {
  document.getElementById('expanded-routing').style.display = 'block';
  document.getElementById('routeContent').style.maxHeight =
      document.getElementById('routeContent').scrollHeight + 'px';
}

/**
 * Make table with distance, time, and active cases of each route hidden
 */
function hideRouteInfo() {
  document.getElementById('expanded-routing').style.display = 'none';
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
  document.getElementById('show-expanded-routes').classList.toggle('selected');
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
