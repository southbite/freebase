module.exports = {
	process:function(req, res, next){
		try{

			var url = require('url').parse(req.url, true);

			if (req.body.encapsulated == null){

				if (req.body.basetype == 'array')
					req.body.encapsulated = [];
				else
					req.body.encapsulated = {};

			}

			var data = req.body.encapsulated;

			if (req.body.client == 'jquery'){ //solved the issue whereby $ makes all property types strings...
				data = JSON.parse(decodeURIComponent(req.body.encapsulated));
			}

			req.message = {
				action:req.method,
				path:url.pathname,
				params:url.query?url.query:{},
				headers:req.headers,
				data:data
			};

			//console.log('req.message');
			//console.log(req.message);

			next();

		}catch(e){
			next(e);
		}

	}
}