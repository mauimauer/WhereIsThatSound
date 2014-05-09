function hashCode(str){
	var hash = 0;
	if (str.length == 0) return hash;
	for (i = 0; i < str.length; i++) {
		char = str.charCodeAt(i);
		hash = ((hash<<5)-hash)+char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
}

function inIframe () {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

function createOverlay() {
	$("body").append($("<div id='wtsOverlay'></div>"));
}

var EXT_ID = "wts";

var videos = {};
var height = 0;

function onTopMessage(evt, message) {
	if(message.event == "playing") {

		var win = evt.source;
	    var frames = window.document.getElementsByTagName('iframe');
	    var frame;
	    var found = false;

		var viewportHeight = $(window).height();
		var docHeight = $(document).height();

	    for (var i=0, len=frames.length; i<len; i++) {
	        frame = frames[i];
	        if (frame.contentWindow == win && docHeight > viewportHeight) {
	            
	            var docHeight = $(document).height();
	            var offset = $(frame).offset();
	            
	            var posPercent = (offset.top/docHeight)*100;

	            $("#wtsOverlay").append($('<div class="wts popover left" id="wts_'+ message.id+'" style="top: '+posPercent+'%;"><div class="arrow"></div><div class="popover_content"><img width="32px" src="'+chrome.extension.getURL("volume.png")+'"></div></div>'));
	            $("#wts_"+message.id).click(function() {
	            	var elem = $(videos[message.id]);
					$('html,body').animate({
			                scrollTop: elem.offset().top - (elem.height()/3)
			            }, 1000, 'swing');
	            });
	            videos[message.id] = frame;
	        }
	    }
	} else if(message.event == "paused") {
		delete videos[message.id];
		$("#wts_"+message.id).remove();
	}
}

function recalibrate() {
	var docHeight = $(document).height();
	for (var id in videos) {
		var frame = videos[id];
	    var offset = $(frame).offset();
	    var posPercent = (offset.top/docHeight)*100;
	    $("#wts_"+id).css({ top: posPercent+"%" });
	}
}

function onIFrameMessage(message) {
}

function initScrollListener() {
	$(window).scroll(function(e) {
		var viewportHeight = $(window).height();
		var docHeight = $(document).height();
		var scrollTop = $(window).scrollTop();

		var me = scrollTop > viewportHeight ? scrollTop + viewportHeight : scrollTop

		//console.log((me/docHeight)*100);
	});


	$(document).bind('DOMSubtreeModified', function() {
	    if($(document).height() != height) {
	    	height = $(document).height();
	    	//addVideoListener();
	        recalibrate();
	    }
	});
}

$(function() {
	height = $(document).height();
	addEventListener("message", function(evt) {
		var data = evt.data;
		if (typeof data === "string" && data.indexOf(EXT_ID + "::") == 0) {
			var o = JSON.parse(data.substr(EXT_ID.length + 2))
			if(o.recipient == "top" && !inIframe()) {
				onTopMessage(evt, o);
			} else if(o.recipient == "iframe" && inIframe()) {
				onIFrameMessage(evt, o);
			} else if(o.recipient == "top" && inIframe) {
				window.parent.postMessage(data, "*");
			}
		}
	});

	if(!inIframe()) {
		createOverlay();
		initScrollListener();
	}

	addVideoListener();
});

var playListener = function(){
		var win;
		if(inIframe()) {
			win = window.parent;
		} else {
			win = window;
		}
		win.postMessage(EXT_ID+"::"+JSON.stringify({
			recipient: "top",
			sender: "iframe",
			id: hashCode(window.location.href),
			event: "playing"
		}), "*");
	};

	var pauseListener = function(){
		var win;
		if(inIframe()) {
			win = window.parent;
		} else {
			win = window;
		}
		win.postMessage(EXT_ID+"::"+JSON.stringify({
			recipient: "top",
			sender: "iframe",
			id: hashCode(window.location.href),
			event: "paused"
		}), "*");
	};

function addVideoListener() {
	$("video").each(function(idx) {
		var elem = $(this);
		elem.bind("play", playListener);
		elem.bind("pause", pauseListener);
	});
}