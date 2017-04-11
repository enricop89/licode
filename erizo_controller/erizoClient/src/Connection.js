/*global L, window, chrome, navigator*/
'use strict';
var Erizo = Erizo || {};

Erizo.sessionId = 103;

Erizo.Connection = function (spec) {
    var that = {};

    spec.sessionId = (Erizo.sessionId += 1);

    // Check which WebRTC Stack is installed.
    that.browser = Erizo.getBrowser();
    if (that.browser === 'fake') {
        L.Logger.warning('Publish/subscribe video/audio streams not supported in erizofc yet');
        that = Erizo.FcStack(spec);
    } else if (that.browser === 'mozilla') {
        L.Logger.debug('Firefox Stack');
        that = Erizo.FirefoxStack(spec);
    } else if (that.browser === 'bowser'){
        L.Logger.debug('Bowser Stack');
        that = Erizo.BowserStack(spec);
    } else if (that.browser === 'chrome-stable') {
        L.Logger.debug('Chrome Stable Stack');
        that = Erizo.ChromeStableStack(spec);
    } else {
        L.Logger.error('No stack available for this browser');
        throw 'WebRTC stack not available';
    }
    if (!that.updateSpec){
        that.updateSpec = function(newSpec, callback){
            L.Logger.error('Update Configuration not implemented in this browser');
            if (callback)
                callback ('unimplemented');
        };
    }

    return that;
};

Erizo.getBrowser = function () {
    var browser = 'none';

    if (typeof module!=='undefined' && module.exports){
        browser = 'fake';
    }else if (window.navigator.userAgent.match('Firefox') !== null) {
        // Firefox
        browser = 'mozilla';
    } else if (window.navigator.userAgent.match('Bowser') !== null){
        browser = 'bowser';
    } else if (window.navigator.userAgent.match('Chrome') !== null) {
        if (window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./)[1] >= 26) {
            browser = 'chrome-stable';
        }
    } else if (window.navigator.userAgent.match('Safari') !== null) {
        browser = 'bowser';
    } else if (window.navigator.userAgent.match('AppleWebKit') !== null) {
        browser = 'bowser';
    }
    return browser;
};


Erizo.GetUserMedia = function (config, callback, error) {
    navigator.getMedia = navigator.mediaDevices.getUserMedia;
    if (config.screen) {
        L.Logger.debug('Screen access requested');
        switch (Erizo.getBrowser()) {
            case 'mozilla':
                L.Logger.debug('Screen sharing in Firefox');
                var screenCfg = {};
                if (config.video.mandatory !== undefined) {
                    screenCfg.video = config.video;
                    screenCfg.video.mediaSource = 'window' || 'screen';
                } else {
                    screenCfg = {
                        audio: config.audio,
                        video: {mediaSource: 'window' || 'screen'}
                    };
                }
                return new Promise(function(resolve){
                    resolve(navigator.mediaDevices.getUserMedia(screenCfg));
                });

            case 'chrome-stable':
                L.Logger.debug('Screen sharing in Chrome');
                // Default extensionId - this extension is only usable in our server,
                // please make your own extension based on the code in
                // erizo_controller/erizoClient/extras/chrome-extension
                var extensionId = 'okeephmleflklcdebijnponpabbmmgeo';
                if (config.extensionId){
                    L.Logger.debug('extensionId supplied, using ' + config.extensionId);
                    extensionId = config.extensionId;
                }
                L.Logger.debug('Screen access on chrome stable, looking for extension');
                try {
                    return new Promise(function (resolve, reject) {
                        chrome.runtime.sendMessage(extensionId, {getStream: true}, function (response){
                            var theConfig = {};
                            if (response === undefined){
                                L.Logger.error('Access to screen denied');
                                var theError = {code:'Access to screen denied'};
                                reject(theError);
                            }
                            var theId = response.streamId;
                            if(config.video !== undefined){
                                theConfig.video = {};
                                theConfig.video.mandatory = {};
                                if (config.video.width.min) {
                                    theConfig.video.mandatory.minWidth = config.video.width.min;
                                }
                                if (config.video.height.min) {
                                    theConfig.video.mandatory.minHeight = config.video.height.min;
                                }
                                if (config.video.width.max) {
                                    theConfig.video.mandatory.maxWidth = config.video.width.max;
                                }
                                if (config.video.height.max) {
                                    theConfig.video.mandatory.maxHeight = config.video.height.max;
                                }
                                theConfig.video.mandatory.chromeMediaSource = 'desktop';
                                theConfig.video.mandatory.chromeMediaSourceId = theId;

                            }else{
                                theConfig = {video: {mandatory: {chromeMediaSource: 'desktop',
                                    chromeMediaSourceId: theId }}};
                            }
                            resolve(navigator.mediaDevices.getUserMedia(theConfig));
                        });
                    });
                } catch(e) {
                    L.Logger.debug('Screensharing plugin is not accessible ');
                    var theError = {code:'no_plugin_present'};
                    return Promise.reject(theError);
                }
                break;

            default:
                L.Logger.error('This browser does not support ScreenSharing');
        }
    } else {
        if (typeof module !== 'undefined' && module.exports) {
            L.Logger.error('Video/audio streams not supported in erizofc yet');
        } else {
            return navigator.mediaDevices.getUserMedia(config);
        }
    }
};
