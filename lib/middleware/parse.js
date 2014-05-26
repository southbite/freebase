module.exports = {
	process:function(req, res, next){
		  req.rawBody = '';
		  //req.setEncoding('utf8');

		  req.on('data', function(chunk) { 
		    req.rawBody += chunk;
		  });

		  req.on('end', function() {

		  	//console.log('rawbody');
		  	//console.log(JSON.parse(req.rawBody));

		  	req.body = JSON.parse(req.rawBody);

		    next();
		  });
	}
}