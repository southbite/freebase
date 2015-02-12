module.exports = {
	process:function(req, res, next){
		var _this = this;

	    // Let non-subscribe messages through
	    //if (message.channel !== '/meta/subscribe')
	    //  return callback(message);

	     //console.log('DATA MIDDLEWARE');

	    if (req.message.path != '/auth'){

	    	try{
		        _this.freebase.services.data.process(req.message, function(e, result){

		        	if (!e){
		        		//console.log('setting req.result');
		        		//console.log(result);
		        		req.result = result;
		        	}
		            next(e);

		        });

		    }catch(e){
		    	 next(e);
		    }

	    }else
	    	 next();

	    
	    /*
	    try{

	        _this.services.data.process({action:req.message.action, path:req.message.path, data:req.message.data}, function(e, result){

	        	if (!e)
	            	req.message.result = result;

	            next(e);

	        });

	    }catch(e){
	    	 next(e);
	    }
	    */
	}
}