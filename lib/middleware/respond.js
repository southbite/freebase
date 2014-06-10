module.exports = {
	publish:function(req, done){

		var _this = this;
		var path_publication = _this.freebase.services.faye.publish('/' + req.message.action + '@' + req.message.path, req.result);

		path_publication.then(function() {

		  var catchall_publication = _this.freebase.services.faye.publish('/ALL@all', {data:req.result, path:req.message.path, action:req.message.action});

		  catchall_publication.then(function() {
			  done();
			}, function(error) {
			  done(error);
		   });

		}, function(error) {
		  done(error);
		});

	},
	respond:function(req, res, err){

		var status = 'ok';
		
		if (err){
			status = 'error';
			req.result = err;
		}

		if (!err){

			if (['PUT','POST','DELETE'].indexOf(req.method) > -1){

				this.publish(req, function(e){
				res.writeHead(200, {"Content-Type":"application/json",
			 						  "Access-Control-Allow-Origin": req.headers['host'],
			 						  "Access-Control-Allow-Headers": "X-Requested-With",
			 						  "Access-Control-Allow-Methods": "GET,PUT,DELETE,POST"});

				var published_status = 'ok';

				if (e)
					published_status = e;

				//console.log('ENDING RESPONSE');
				//console.log(JSON.stringify({status:status, data:req.result, published:published_status}));

				res.end(JSON.stringify({status:status, data:req.result, published:published_status}));

			});

			}else{
				res.writeHead(200, {"Content-Type":"application/json",
			 						  "Access-Control-Allow-Origin": req.headers['host'],
			 						  "Access-Control-Allow-Headers": "X-Requested-With",
			 						  "Access-Control-Allow-Methods": "GET,PUT,DELETE,POST"});

				res.end(JSON.stringify({status:status, data:req.result, published:false}));
			}
			
		}else{

			res.end(JSON.stringify({status:status, data:req.result, published:false}));
		}
			
		

	},
	process:function(req, res, next){

		//console.log('RESPOND MIDDLEWARE');
		this.respond(req, res, null);
	},
	process_error:function(err, req, res, next){

		//console.log('RESPOND MIDDLEWARE');
		this.respond(req, res, err);
	}
}