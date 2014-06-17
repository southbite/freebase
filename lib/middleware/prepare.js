module.exports = {
	process:function(req, res, next){
		try{

			var url = require('url').parse(req.url, true);

			req.message = {
				action:req.method,
				path:url.pathname,
				params:url.query?url.query:{},
				headers:req.headers,
				data:req.body.encapsulated
			};

			next();

		}catch(e){
			next(e);
		}

	}
}