var SampleSetPlayer = (function () {
	
	function isFn(fn) { return typeof fn == 'function'; }
	function applyIfFn(fn,args) {return isFn(fn)&&(fn.apply(null,args)||true); }

	var XHR = (window.ActiveXObject ? 
		function () { return new ActiveXObject("Microsoft.XMLHTTP"); } :
		function () { return new XMLHttpRequest(); });

	var log = (window['console'] && console.log) ? 
		function (s) { console.log(s); } :
		function (s) { };

	function A(src) { return new Audio(src); }

	var extn = (function () { // computes extension to use in this browser
		var fmt2extn = {
			'audio/aac': 'm4a',
			'audio/mp4; codecs="mp4a.40.2"': 'm4a',
			'audio/mpeg': 'mp3',
			'audio/ogg; codecs="vorbis"': 'ogg'
		}, a = A();
		for(var p in fmt2extn) 
			if(a.canPlayType(p))
				return fmt2extn[p];
		throw "browser can't play any known types";
	})();

	var c = function (opts) {  // constructr/class of SampleSetPlayer
		if(!opts) return;
		this.poly = opts.poly || c.defaultPoly;
		this.load(opts.patch,opts.onload,opts.onerror);
	}

	c.defaultPoly = 8;
	c.path = 'SampleSets';

	c.prototype = {

		load: function (patch,onLoad,onError) {
			this.patch = patch;
			var req = XHR(), src = c.path + '/' + patch + '/meta.js',
				ths = this;

			req.onreadystatechange = function () {
				if(req.readyState != 4) return false;
				else if(req.status != 200) {
					if(!applyIfFn(onError)) throw "Req to "+src+" came back "+req.status;
				} else {
					ths.onLoadMeta(req,onLoad,onError); 
				}
			}
			req.open('GET',src,true);
			req.send();
		},

		onLoadMeta: function(req,onLoad,onError) {
			this.metadata = eval('(' + req.responseText + ')');
			var errorMsg = null;
			if(!this.metadata)
				errorMsg = "error loading metadata";
			else if(!this.metadata.formats)
				errorMsg = "no audio format listed for this patch";
			else if(!this.metadata.formats[extn]) 
				errorMsg = extn + " not supported in this patch";
			if(errorMsg && !applyIfFn(onError,[errorMsg])) 
				throw errorMsg;
			var ths = this;
			this.t = this.metadata.sampleDuration;
			this.low = this.metadata.low;
			this.high = this.metadata.high;
			this.voices = [ A() ];
			this.voices[0].addEventListener(
				'canplaythrough',
				function () { ths.onLoadAudio(onLoad); }
			);
			this.voices[0].src = c.path + '/' + this.patch + '/samples.' + extn;
			this.voiceNext = 0;
			this.volume(0.5);
		},

		onLoadAudio: function(onLoad) {
			for(var i=1; i<this.poly; i++) {
				this.voices[i] = A(this.voices[0].src);
			}
			applyIfFn(onLoad);
		},

		volume: function (x) {
			if(x) {
				for(var i=0,z=this.poly; i<z; i++) 
					this.voices[0].volume = x;
				this._vol = x;
			} else
				return this._vol;
		},

		trigger: function (n) {
			if(n < this.low && n > this.high) 
				return;
			var v = this.voices[this.voiceNext];
				
			v.pause();
			v.currentTime = ((n-this.low) * (this.t/1000)); // - 0.09;
			setTimeout(function () { v.pause(); }, this.t - 5);
			v.play();
			this.voiceNext = (this.voiceNext + 1) % this.poly;
		}
	}

	return c;
})()

