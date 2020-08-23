/* globals overlay, curLocationMarker, nextPageSearch */
/* exported VideoPlayer */
/* eslint-env jquery */

class VideoPlayer {
  /**
   * Create YT.Player in 'video' div and set size to window size
   * Add click event listeners to video player buttons
   */
  constructor() {
    // video values come from the 'video-background' in style.css
    this.videoTop = '20%';
    this.videoLeft = '50%';
    this.videoWidth = '40%';
    this.videoHeight = '60%';
    this.nextPage;
    '';
    this.TEST_LIST = ['9RTaIpVuTqE', 'QC8iQqtG0hg', 'QohH89Eu5iM'];
    this.videoIds = [];
    this.currentVideo = 0;
    this.player = new YT.Player('video', {
      height: window.innerHeight * .6,
      width: window.innerWidth * .4,
      events: {
        'onStateChange': (event) => {
          this.onVidsoStateChange(event);
        },
      },
    });
    window.addEventListener('resize', () => {
      this.resizeVideo();
    });
    document.getElementById('prev-video').addEventListener('click', () => {
      this.previousVideo();
    });
    document.getElementById('exit-video').addEventListener('click', () => {
      this.hideVideo();
    });
    document.getElementById('next-video').addEventListener('click', () => {
      this.nextVideo();
    });
  }

  /**
   * Bring video to front and start playing
   */
  playVideo(changedVideoStyle) {
    if (this.currentVideo < 0) {
      alert('There are no previous videos');
    } else if (this.currentVideo >= this.videoIds.length) {
      alert('Finding you more videos...');
      nextPageSearch();
    } else {
      this.player.loadVideoById(this.videoIds[this.currentVideo]);
      if (changedVideoStyle) {
        this.setUpForMaximizeAnimation();
        $('#video-background').animate({
          top: this.videoTop,
          left: this.videoLeft,
          width: this.videoWidth,
          height: this.videoHeight,
        });
      }
      document.getElementById('video-overlay').style.display = 'block';
      document.getElementById('video-background').style.display = 'block';
    }
  }

  // moves video starting position to current marker
  setUpForMaximizeAnimation() {
    if (typeof curLocationMarker !== 'undefined') {
      const proj = overlay.getProjection();
      const pos = curLocationMarker.getPosition();
      const p = proj.fromLatLngToContainerPixel(pos);
      const markerBubbleOffsetTop = -4;
      const markerBubbleOffsetLeft = -.5;
      // the distance between the marker position and the center of the bubble
      // of the marker
      const startLeft =
          p.x / window.innerWidth * 100 + markerBubbleOffsetLeft + '%';
      const startTop =
          p.y / window.innerHeight * 100 + markerBubbleOffsetTop + '%';
      $('#video-background').css('top', startTop);
      $('#video-background').css('left', startLeft);
      $('#video-background').css('width', '0%');
      $('#video-background').css('height', '0%');
    }
  }

  /**
   * Play the next video
   */
  nextVideo() {
    this.currentVideo += 1;
    this.saveCurVideo();
    const changedVideoStyle = false;
    // i.e. this method does not change visual attributes of video player
    this.playVideo(changedVideoStyle);
  }

  /**
   * Play the previous video
   */
  previousVideo() {
    this.currentVideo -= 1;
    this.saveCurVideo();
    const changedVideoStyle = false;
    // i.e. this method does not change visual attributes of video player
    this.playVideo(changedVideoStyle);
  }

  /**
   * Saves an array of video ids and starts playing the first one
   * @param {array} videoIds
   */
  playVideos(videoIds, nextPage) {  // eslint-disable-line no-unused-vars
    this.currentVideo = 0;
    this.nextPage = nextPage;
    this.videoIds = videoIds;
    const changedVideoStyle = true;
    // i.e. the video player needs to change visual attributes of video player
    this.playVideo(changedVideoStyle);
  }

  /**
   * Stop video and hide
   */
  hideVideo() {
    this.currentVideo = 0;
    this.player.stopVideo();

    this.saveCurVideo();

    const proj = overlay.getProjection();
    const pos = curLocationMarker.getPosition();
    const p = proj.fromLatLngToContainerPixel(pos);
    const markerBubbleOffsetTop = -4;
    const markerBubbleOffsetLeft = -.5;
    // the distance between the marker position and the center of the bubble of
    // the marker
    const endLeft =
        p.x / window.innerWidth * 100 + markerBubbleOffsetLeft + '%';
    const endTop = p.y / window.innerHeight * 100 + markerBubbleOffsetTop + '%';

    $('#video-background')
        .animate(
            {
              top: endTop,
              left: endLeft,
              width: '0px',
              height: 0,
            },
            function() {
              document.getElementById('video-overlay').style.display = 'none';
              document.getElementById('video-background').style.display =
                  'none';
            });
  }

  // saves current video location and size
  saveCurVideo() {
    const eleVideo =
        window.getComputedStyle(document.getElementById('video-background'));
    this.videoTop = parseFloat(eleVideo.getPropertyValue('top')) /
            window.innerHeight * 100 +
        '%';
    this.videoLeft = parseFloat(eleVideo.getPropertyValue('left')) /
            window.innerWidth * 100 +
        '%';
    this.videoWidth = parseFloat(eleVideo.getPropertyValue('width')) /
            window.innerWidth * 100 +
        '%';
    this.videoHeight = parseFloat(eleVideo.getPropertyValue('height')) /
            window.innerHeight * 100 +
        '%';
  }

  /**
   * Set video width and height to current window size
   */
  resizeVideo() {
    this.player.setSize(window.innerWidth * .4, window.innerHeight * .6);
  }

  /**
   * Hide video when it is done
   */
  onVidsoStateChange(event) {
    if (event.data == YT.PlayerState.ENDED) {
      this.nextVideo();
    }
  }
}
