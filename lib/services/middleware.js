module.exports = {
	middleware:[],
	use:function(middleware){
		this.middleware.push(middleware);
	},
	process:function(req, res, done){
		try{
			
		}catch(e){
			done(e);
		}

	}
}