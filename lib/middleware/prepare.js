module.exports = {
	process:function(req, res, next){
		//{action:req.message.action, path:req.message.clean_channel, data:req.message.data}

		try{

			var url = require('url').parse(req.url, true);

			console.log(url);

			req.message = {
				action:req.method,
				path:url.pathname,
				params:url.query?url.query:{},
				headers:req.headers,
				data:req.body
			};

			if (url.query && url.query.child_id){
				console.log('PREPARE MIDDLEWARE MESSAGE');

				console.log(req.message);

				console.log('PREPARE MIDDLEWARE');
			}

			

			next();

		}catch(e){
			next(e);
		}

	}
}