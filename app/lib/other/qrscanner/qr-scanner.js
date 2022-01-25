/* eslint-disable space-before-function-paren */
/* eslint-disable angular/window-service */
/* eslint-disable padded-blocks */
/* eslint-disable angular/function-type */

// Originally from https://github.com/sembrestels/angular-qr-scanner
// Modified to support jsQR library
(function() {
  'use strict';

  angular.module('qrScanner', ["ng"]).directive('qrScanner', ['$interval', '$window', function($interval, $window) {
    return {
      restrict: 'E',
      scope: {
        ngSuccess: '&ngSuccess',
        ngError: '&ngError',
        ngVideoError: '&ngVideoError'
      },
      link: function(scope, element, attrs) {

        window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

        var height = attrs.height || 300;
        var width = attrs.width || 250;

        var video = $window.document.createElement('video');
        video.setAttribute('width', width);
        video.setAttribute('height', height);
        video.setAttribute('style', '-moz-transform:rotateY(-180deg);-webkit-transform:rotateY(-180deg);transform:rotateY(-180deg);');
        var canvas = $window.document.createElement('canvas');
        canvas.setAttribute('id', 'qr-canvas');
        canvas.setAttribute('width', width);
        canvas.setAttribute('height', height);
        canvas.setAttribute('style', 'display:none;');

        angular.element(element).append(video);
        angular.element(element).append(canvas);
        var context = canvas.getContext('2d');
        var stopScan;

        var scan = function() {
          if ($window.localMediaStream) {
            context.drawImage(video, 0, 0, 307, 250);
            try {
              // jsQR specific code start
              const imgData = context.getImageData(0, 0, 300, 400);
              const result = jsQR(imgData.data, 300, 400);
              if (result) {
               scope.ngSuccess({data: result.data});
              }
              // jsQR specific code end

              //qrcode.decode();
            } catch(e) {
              scope.ngError({error: e});
            }
          }
        }

        // Call the getUserMedia method with our callback functions
        if (navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia({video: {facingMode: "environment"}}).then(function successCallBack(stream) {
            video.srcObject = stream;
            $window.localMediaStream = stream;

            scope.video = video;
            video.play();
            stopScan = $interval(scan, 500);
          }).catch(function error(e) {
            scope.ngVideoError({error: e});
          });
        } else {
          scope.ngVideoError({error: 'Native web camera streaming (getUserMedia) not supported in this browser.'});
        }

        // qrcode.callback = function(data) {
        //   scope.ngSuccess({data: data});
        // };

        element.bind('$destroy', function() {
          if ($window.localMediaStream) {
            $window.localMediaStream.getVideoTracks()[0].stop();
          }
          if (stopScan) {
            $interval.cancel(stopScan);
          }
        });
      }
    };
  }]);
})();
