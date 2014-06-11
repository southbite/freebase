var browserify = require('browserify');

module.exports = {
	cached:null,
	process:function(req, res, next){
		var _this = this;

		var path = require('path');
		
		//console.log('CLIENT MIDDLEWARE');
		//console.log(path.resolve(__dirname, '../client.js'));

		if (req.url == '/browser_client'){

			try{

				res.setHeader("Content-Type", "application/javascript"); //Solution!

				if (_this.cached == null){
					var js = '';
					var bundle_stream = browserify([path.resolve(__dirname, '../client.js')]).bundle({});

					//console.log(bundle_stream);

					bundle_stream.on('data', function(data){
						js += data;
					});

					bundle_stream.on('end', function(){
						_this.cached = js;
						res.end(_this.cached);
					});
				}
				else{
					
            		res.end(_this.cached);
				}
					

			}catch(e){
				//console.log('ERROR IN GET BROWSER CLIENT');
				//console.log(e);
				next(e);
			}
		}else
			next()
					
	}
}