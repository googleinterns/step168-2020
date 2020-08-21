/* exported searchForVideos */
/* globals gapi, player */
function searchForVideos(map, searched) {
  gapi.client.setApiKey(keys.YOUTUBE_API_KEY);
  if (document.getElementById('latitude').value === '') {
    alert('No location found: Search or click somewhere on the map');
  } else {
    return gapi.client
        .load('https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest')
        .then(
            function() {
              executeSearch(map, searched);
            },
            function(err) {
              alert(
                  'Internal Video Retrival Error: ' +
                  'please try again or a different search');
              console.error('Error loading GAPI client for API', err);
            });
  }
}
// Make sure the client is loaded and sign-in is complete before calling this
// method.
function executeSearch(map, searchContent) {
  var radius = Math.min(2600 * Math.pow(.5, map.getZoom()), 1000) + 'km';
  return gapi.client.youtube.search
      .list({
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
      })
      .then(
          function(response) {
            // Handle the results here (response.result has the parsed body).
            const videoListToPlay = [];
            const videoItemsFromSearch = response.result.items;
            if (videoItemsFromSearch.length === 0) {
              if (radius === '1000km') {
                alert('No location based videos found, searching for videos related to search');
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
                        player.playVideos(videoListToPlay);
                      },
                      function(err) {
                        alert(
                          'Internal Video Retrival Error:' +
                          'please try again or a different search');
                          console.error('Execute error', err);
                        });
              } else {
                radius = parseInt(radius) * 2 + 'km';
                executeSearch(map, searchContent);
              }
                // alert(
                //   'There are no related videos in this area. ' +
                //   'Please try a new area.');
            } else {
              videoItemsFromSearch.forEach((item) => {
                videoListToPlay.push(item.id.videoId);
              });
              player.playVideos(videoListToPlay);
            }
          },
          function(err) {
            alert(
                'Internal Video Retrival Error:' +
                'please try again or a different search');
            console.error('Execute error', err);
          });
}
