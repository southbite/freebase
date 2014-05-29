module.exports = {
	settings:{},
	//level is error,warning,info,verbose
	log:function(message, level, done){
		
		if (!level)
			level = 'info';

		if (this.settings.log_level && this.settings.log_level.split('|').indexOf(level) == -1){
			if (done)
				return done();
		}else{
				message = level + '\t' +  new Date().toString() + '\t' + message;

				//the log4js integration can happen later
				console.log(message);

				if (done)
					done();
		}
	
	}
}