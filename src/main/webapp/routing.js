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

/* exported calculateAndDisplayRoute */
/* globals casesData map */

const routeLines = [];

function calculateAndDisplayRoute(directionsService, mapObject) {
  directionsService.route(
      {
        origin: {query: document.getElementById('start').value},
        destination: {query: document.getElementById('end').value},
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
      },
      (response, status) => {
        console.log(response);
        for (let i = 0; i < routeLines.length; i++) {
          routeLines[i].setMap(null);
        }
        if (status === 'OK') {
          for (let i = 0; i < response.routes.length; i++) {
            if (i >= routeLines.length) {
              routeLines.push(new google.maps.DirectionsRenderer(
                  {map: mapObject, directions: response, routeIndex: i}));
            } else {
              routeLines[i].setMap(mapObject);
              routeLines[i].setDirections(response);
              routeLines[i].setRouteIndex(i);
            }
            const counted = [];
            let active = 0;
            const points = response.routes[i].overview_path;
            for (let j = 0; j < points.length; j += 1) {
              const latLng =
                  new google.maps.LatLng(points[j].lat(), points[j].lng());
              const marker = new google.maps.Marker(
                  {position: latLng, title: 'Hello World!'});
              marker.setMap(map);
              const closest = findClosest(points[j].lat(), points[j].lng());
              let duplicate = false;
              for (let k = 0; k < counted.length; k++) {
                if (closest == counted[k]) {
                  duplicate = true;
                  break;
                }
              }
              if (duplicate) {
                console.debug('Duplicate', closest);
              } else {
                active += closest.active;
                counted.push(closest);
              }
            }
            console.log(`"Route ${i} has ${active} cases"`);
            console.log(counted);
          }
        } else {
          window.alert('Directions request failed due to ' + status);
        }
      });
}

// function getData() {
//   fetch('/report').then((response) => response.json()).then((reports) => {
//     casesData = reports;
//   });
// }

// function marker() {
//   for (let i = 0; i < casesData.length; i++) {
//     const myLatlng = new google.maps.LatLng(casesData[i].lat,
//     casesData[i].lng); const marker = new google.maps.Marker({
//       position: myLatlng,
//       title: casesData[i].lat.toString() + ' : ' +
//       casesData[i].lng.toString(),
//     });
//     marker.setMap(map);
//   }
// }

function findClosest(lat, lng) {
  let closest = {};
  let closestValue = 1000;
  for (let i = 0; i < casesData.length; i++) {
    const diff =
        Math.abs(casesData[i].lat - lat) + Math.abs(casesData[i].lng - lng);
    if (diff < closestValue) {
      closest = casesData[i];
      closestValue = diff;
    }
  }
  return closest;
}
