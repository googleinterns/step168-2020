/* exported searchForVideos, nextPageSearch */
/* globals gapi, player */
function searchForVideos(map, searched) {
  const radius = Math.min(2600 * Math.pow(.5, map.getZoom()), 1000) + 'km';
  gapi.client.setApiKey(keys.YOUTUBE_API_KEY);
  if (document.getElementById('latitude').value === '') {
    alert('No location found: Search or click somewhere on the map');
  } else {
    return gapi.client
        .load('https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest')
        .then(
            function() {
              executeSearch(searched, radius);
            },
            function(err) {
              alert(
                  'Internal Video Retrival Error: ' +
                  'please try again or a different search');
              console.error('Error loading GAPI client for API', err);
            });
  }
}
function nextPageSearch(pageToken) {
  const forList = {'pageToken': pageToken};
  return gapi.client.youtube.search.list(forList).then(
      function(response) {
        const results = response.result;
        parseResults(results);
      },
      function(err) {
        alert(
            'Internal Video Retrival Error:' +
            'please try again or a different search');
        console.error('Execute error', err);
      });
}
// Make sure the client is loaded and sign-in is complete before calling this
// method.
function executeSearch(searchContent, radius) {
  const roundingConst = 1000000;
  const lat =
      Math.round(document.getElementById('latitude').value * roundingConst) /
      roundingConst;
  const long =
      Math.round(document.getElementById('longitude').value * roundingConst) /
      roundingConst;
  const forList = {
    'part': ['snippet'],
    'location': lat + ',' + long,
    // the location radius is approximately 1.5 times the width the cursor
    // covers which changes based on zoom as represented by the equation
    // below YouTube API doesnt support a radius greater than 1000 km
    'locationRadius': radius,
    'q': searchContent,
    'order': 'date',
    'videoEmbeddable': 'true',
    'maxResults': 50,
    'type': ['video'],
  };
  return gapi.client.youtube.search.list(forList).then(
      function(response) {
        const results = response.result;
        // Handle the results here (response.result has the parsed body).
        const pageInfo = results.pageInfo;
        if (pageInfo.totalResults < pageInfo.resultsPerPage) {
          if (radius === '1000km') {
            alert(
                'No location based videos found, ' +
                'searching for videos related to just search');
            noLocationSearch(searchContent);
          } else {
            radius = Math.min(parseFloat(radius) * 4, 1000) + 'km';
            executeSearch(searchContent, radius);
          }
        } else {
          parseResults(results);
        }
      },
      function(err) {
        alert(
            'Internal Video Retrival Error:' +
            'please try again or a different search');
        console.error('Execute error', err);
      });
}

function parseResults(results) {
  const videoListToPlay = [];
  const nextPage = results.nextPageToken;
  const videoItemsFromSearch = results.items;
  videoItemsFromSearch.forEach((item) => {
    videoListToPlay.push(item.id.videoId);
  });
  player.playVideos(videoListToPlay, nextPage);
}

function noLocationSearch(searchContent) {
  const forList = {
    'part': ['snippet'],
    'q': searchContent,
    'videoEmbeddable': 'true',
    'maxResults': 50,
    'type': ['video'],
  };
  return gapi.client.youtube.search.list(forList).then(
      function(response) {
        const results = response.result;
        parseResults(results);
      },
      function(err) {
        alert(
            'Internal Video Retrival Error:' +
            'please try again or a different search');
        console.error('Execute error', err);
      });
}
