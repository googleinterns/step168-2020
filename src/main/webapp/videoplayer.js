/* exported VideoPlayer */

class VideoPlayer {
  /**
   * Create YT.Player in 'video' div and set size to window size
   * Add click event listeners to video player buttons
   */
  constructor() {
    this.TEST_LIST = ['9RTaIpVuTqE', 'QC8iQqtG0hg', 'QohH89Eu5iM'];
    this.videoIds = [];
    this.currentVideo = 0;
    this.player = new YT.Player('video', {
      height: window.innerHeight,
      width: window.innerWidth,
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
  playVideo() {
    if (this.currentVideo >= this.videoIds.length || this.currentVideo < 0) {
      this.hideVideo();
      return;
    }
    this.player.loadVideoById(this.videoIds[this.currentVideo]);
    document.getElementById('video-overlay').style.display = 'block';
  }

  /**
   * Play the next video
   */
  nextVideo() {
    this.currentVideo += 1;
    this.playVideo();
  }

  /**
   * Play the previous video
   */
  previousVideo() {
    this.currentVideo -= 1;
    this.playVideo();
  }

  /**
   * Saves an array of video ids and starts playing the first one
   * @param {array} videoIds
   */
  playVideos(videoIds) {  // eslint-disable-line no-unused-vars
    this.currentVideo = 0;
    this.videoIds = videoIds;
    this.playVideo();
  }

  /**
   * Stop video and hide
   */
  hideVideo() {
    this.currentVideo = 0;
    this.player.stopVideo();
    document.getElementById('video-overlay').style.display = 'none';
  }

  /**
   * Set video width and height to current window size
   */
  resizeVideo() {
    this.player.setSize(window.innerWidth, window.innerHeight);
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
