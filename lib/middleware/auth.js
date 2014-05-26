module.exports = {
	process:function(req, res, next){
		var _this = this;

		//console.log('AUTH MIDDLEWARE');
		//console.log(req.message);

		if (req.message.path == '/auth'){

			////console.log('doing login');
			////console.log(req.message.data);

			_this.freebase.services.auth.login(req.message.data, function(e, token){
				if (e){
					//console.log('auth broke');
					//console.log(e);
					next(e);
				}
				else{

					//console.log('auth worked');
					//console.log(token);
					req.result = token;
					next();
				}
					
			});

		}else{

			if (req.headers['session_token'] == null)
				next('Missing session token');
			else{

				_this.freebase.services.auth.decodeToken({token:req.headers['session_token']}, function(e, decoded){

					if (e) return next(e);

					req.session_data = decoded;
					next();

				});
			}
		}
			

		
	}
}