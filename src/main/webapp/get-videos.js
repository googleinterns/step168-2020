/* exported searchForVideos */
/* globals gapi, player */
function searchForVideos() {
  gapi.client.setApiKey(keys.YOUTUBE_API_KEY);
  if (document.getElementById('latitude').value === '') {
    alert('No location found: Search or click somewhere on the map');
  } else {
    return gapi.client
        .load('https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest')
        .then(
            function() {
              executeSearch();
              console.log('load was successful');
            },
            function(err) {
              console.error('Error loading GAPI client for API', err);
            });
  }
}
// Make sure the client is loaded and sign-in is complete before calling this
// method.
function executeSearch() {
  return gapi.client.youtube.search
      .list({
        'part': ['snippet'],
        'location': document.getElementById('latitude').value + ',' +
            document.getElementById('longitude').value,
        'locationRadius': '50km',
        'q': 'COVID-19',
        'type': ['video'],
      })
      .then(
          function(response) {
            // Handle the results here (response.result has the parsed body).
            const parsedVideoList = response.result;
            // console.log('Response', parsedVideoList.items); use for debugging
            const videoList = [];
            parsedVideoList.items.forEach((item) => {
              videoList.push(item.id.videoId);
            });
            player.playVideos(videoList);
          },
          function(err) {
            console.error('Execute error', err);
          });
}
