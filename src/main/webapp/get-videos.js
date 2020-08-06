/* exported searchForVideos */
/* globals gapi, player */
function searchForVideos(map) {
  gapi.client.setApiKey(keys.YOUTUBE_API_KEY);
  if (document.getElementById('latitude').value === '') {
    alert('No location found: Search or click somewhere on the map');
  } else {
    return gapi.client
        .load('https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest')
        .then(
            function() {
              executeSearch(map);
              console.log('load was successful');
            },
            function(err) {
              console.error('Error loading GAPI client for API', err);
            });
  }
}
// Make sure the client is loaded and sign-in is complete before calling this
// method.
function executeSearch(map, searchContent) {
  console.log(searchContent);
  return gapi.client.youtube.search
      .list({
        'part': ['snippet'],
        'location': document.getElementById('latitude').value + ',' +
            document.getElementById('longitude').value,
        // the location radius is size of the legend provided in Google Maps
        // which changes based on the zoom of the map (i.e. at zoom === 5,
        // the legends shows how far 200 miles is)
        'locationRadius': 6400 * Math.pow(.5, map.getZoom()) + 'mi',
        'q': searchContent,
        "maxResults": 50,
        'type': ['video'],
      })
      .then(
          function(response) {
            console.log('response', response.result);
            // Handle the results here (response.result has the parsed body).
            const videoListToPlay = [];
            const videoItemsFromSearch = response.result.items;
            if (videoItemsFromSearch.length === 0) {
              alert(
                  'There are no COVID-19 related videos in this area.' +
                  'Please try a new area.');
            } else {
              videoItemsFromSearch.forEach((item) => {
                videoListToPlay.push(item.id.videoId);
              });
              player.playVideos(videoListToPlay);
            }
          },
          function(err) {
            console.error('Execute error', err);
          });
}
