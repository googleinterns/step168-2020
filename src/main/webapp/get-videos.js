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
        const videoListToPlay = [];
        const nextPage = response.result.nextPageToken;
        const videoItemsFromSearch = response.result.items;
        videoItemsFromSearch.forEach((item) => {
          videoListToPlay.push(item.id.videoId);
        });
        player.playVideos(videoListToPlay, nextPage);
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
  const forList = {
    'part': ['snippet'],
    'location': document.getElementById('latitude').value + ',' +
        document.getElementById('longitude').value,
    // the location radius is approximately 1.5 times the width the cursor
    // covers which changes based on zoom as represented by the equation
    // below YouTube API doesnt support a radius greater than 1000 km
    'locationRadius': radius,
    'q': searchContent,
    'videoEmbeddable': 'true',
    'maxResults': 50,
    'type': ['video'],
  };
  return gapi.client.youtube.search.list(forList).then(
      function(response) {
        // Handle the results here (response.result has the parsed body).
        const videoListToPlay = [];
        const nextPage = response.result.nextPageToken;
        const videoItemsFromSearch = response.result.items;
        if (videoItemsFromSearch.length === 0) {
          if (radius === '1000km') {
            alert('No location based videos found' +
                  'searching for videos related to search');
            return gapi.client.youtube.search
                .list({
                  'part': ['snippet'],
                  'q': searchContent,
                  'videoEmbeddable': 'true',
                  'maxResults': 50,
                  'type': ['video'],
                })
                .then(
                    function(response) {
                      videoItemsFromSearch.forEach((item) => {
                        videoListToPlay.push(item.id.videoId);
                      });
                      player.playVideos(videoListToPlay, nextPage);
                    },
                    function(err) {
                      alert(
                          'Internal Video Retrival Error:' +
                          'please try again or a different search');
                      console.error('Execute error', err);
                    });
          } else {
            radius = Math.min(parseInt(radius) * 10, 1000) + 'km';
            executeSearch(searchContent, radius);
          }
        } else {
          videoItemsFromSearch.forEach((item) => {
            videoListToPlay.push(item.id.videoId);
          });
          player.playVideos(videoListToPlay, nextPage);
        }
      },
      function(err) {
        alert(
            'Internal Video Retrival Error:' +
            'please try again or a different search');
        console.error('Execute error', err);
      });
}
