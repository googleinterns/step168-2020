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
              // console.log('load was successful');
            },
            function(err) {
              alert('Internal Video Retrival Error: please try again or a different search');
              console.error('Error loading GAPI client for API', err);
            });
  }
}
// Make sure the client is loaded and sign-in is complete before calling this
// method.
function executeSearch(map, searchContent) {
  return gapi.client.youtube.search
      .list({
        'part': ['snippet'],
        'location': document.getElementById('latitude').value + ',' +
            document.getElementById('longitude').value,
        // the location radius is approximately the width the cursor covers which
        // changes based on zoom as represented by the equation below
        // YouTube API doesnt support a radius greater than 1000 km
        'locationRadius': Math.min (1720 * Math.pow(.5, map.getZoom()), 1000) + 'km',
        'q': searchContent,
        'maxResults': 50,
        'type': ['video'],
      })
      .then(
          function(response) {
            // Handle the results here (response.result has the parsed body).
            const videoListToPlay = [];
            const videoItemsFromSearch = response.result.items;
            if (videoItemsFromSearch.length === 0) {
              alert(
                  'There are no COVID-19 related videos in this area. ' +
                  'Please try a new area.');
            } else {
              videoItemsFromSearch.forEach((item) => {
                videoListToPlay.push(item.id.videoId);
              });
              player.playVideos(videoListToPlay);
            }
          },
          function(err) {
            alert('Internal Video Retrival Error: please try again or a different search')
            console.error('Execute error', err);
          });
}
