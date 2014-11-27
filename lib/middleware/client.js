var browserify = require('browserify'),
byline = require('byline');

module.exports = {
	cached:null,
	replace_serverside_code:function(js){

	},
	process:function(req, res, next){
		var _this = this;

		var path = require('path');
		var stream = require('stream')
		var liner = new stream.Transform( { objectMode: true } );

		liner._transform = function (chunk, encoding, done) {
		     var data = chunk.toString()
		     if (this._lastLineData) data = this._lastLineData + data 
		 
		     var lines = data.split('\n') 
		     this._lastLineData = lines.splice(lines.length-1,1)[0] 
		 
		     lines.forEach(this.push.bind(this));

		     done();
		}

		liner._flush = function (done) {
		     if (this._lastLineData) this.push(this._lastLineData)
		     this._lastLineData = null
		     done()
		}

		////console.log('CLIENT MIDDLEWARE');
		////console.log(path.resolve(__dirname, '../client.js'));

		if (req.url == '/browser_client'){

			try{

				res.setHeader("Content-Type", "application/javascript"); //Solution!

				if (_this.cached == null){
					var js = '';


					//we ignore te request module, as the client side uses $.ajax
					var bundle_stream = browserify([path.resolve(__dirname, '../client.js')]).ignore('request').bundle({standalone:'FreebaseBrowserClient'});

					bundle_stream.pipe(liner)
					liner.on('readable', function () {
					     var line
					     while (line = liner.read()) {
					          // do something with line
					       
							if (line == '//BEGIN SERVER-SIDE ADAPTER - DO NOT REMOVE THIS COMMENT')
								line = '/*';
							else if (line == '//END SERVER-SIDE ADAPTER')
								line = '*/';
							else if (line == '/*BEGIN CLIENT-SIDE ADAPTER - DO NOT REMOVE THIS COMMENT' || line == '*///END CLIENT-SIDE ADAPTER')
								line = '';

							js += line + '\n';
					     }
					})

					bundle_stream.on('end', function(){

						_this.cached = js;
						res.end(_this.cached);
					});
				}
				else{
					
            		res.end(_this.cached);
				}
					

			}catch(e){
				////console.log('ERROR IN GET BROWSER CLIENT');
				////console.log(e);
				next(e);
			}
		}else
			next()
					
	}
}