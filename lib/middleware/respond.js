var JSONStream = require('JSONStream');

module.exports = {
	publish:function(req, done){

		var _this = this;
		var path_publication = _this.freebase.services.faye.publish('/' + req.message.action + '@' + req.message.path, req.result);

		path_publication.then(function() {

		  var catchall_publication = _this.freebase.services.faye.publish('/ALL@all', {payload:req.result, path:req.message.path, action:req.message.action, params:req.message.params});

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
		var _this = this;

		if (err){
			status = 'error';
			req.result = err;
		}

		res.writeHead(200, {"Content-Type":"application/json",
							"Charset":"utf-8",
 						  	"Access-Control-Allow-Origin": "*",
 						  	"Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, session_token",
 						  	"Access-Control-Allow-Methods": "GET,PUT,DELETE,POST"});

		if (!err){

			if (['PUT','DELETE'].indexOf(req.method) > -1){

				_this.publish(req, function(e){
				
					var published_status = 'ok';

					if (e)
						published_status = e;
					
					res.end(JSON.stringify({status:status, payload:req.result, published:published_status}));

				});

			}else if (['GET','POST'].indexOf(req.method) > -1){

				if (req.message.path != '/auth')
					_this.streamResults(req, res, status, false);
				else
					res.end(JSON.stringify({status:status, payload:req.result, published:false}));
			}
			
		}else{
			res.end(JSON.stringify({status:status, payload:req.result, published:false}));
		}
			
	},
	streamResults:function(req, res, status, published){

		try{

			if (status == 'ok' && req.result){
				
				res.write('{"status":"ok", "published":"' + published.toString() + '", "payload":[');

				var length = 0;

				req.result.each(function(err, item) {
				 	//console.log('in next obj');
				 	//console.log(item);

				 	process.nextTick(function(){
						//console.log('in next tick');

							if (!err){

					 		if (item == null)
					 			res.end(']}');
					 		else{
					 			length++;
					 			var chunck = JSON.stringify(item);	

					 			if (length > 1)
					 				chunck = ',' + chunck;
					 			
					 			res.write(chunck);
					 		}
					 	}else{
					 		res.end('BROKEN PIPE: ' + err);
					 	}
					});
				 });

			}
			else
				res.end(JSON.stringify({status:status, payload:req.result, published:false}));


		}catch(e){
			res.end(JSON.stringify({status:'error', payload:e.toString(), published:false}));
		}

	},
	process:function(req, res, next){

		////console.log('RESPOND MIDDLEWARE');
		this.respond(req, res, null);
	},
	process_error:function(err, req, res, next){

		////console.log('RESPOND MIDDLEWARE');
		this.respond(req, res, err);
	}
}