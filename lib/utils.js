module.exports = {
	settings:{},
	//level is error,warning,info,verbose
	initialize:function(settings){
		var log4js = require('log4js');
		var _this = this;

		if (!settings)
			settings = {logger:{
							"appenders": [
							      { "type": "console"},
					              {
					                "type": "file",
					                "absolute": true,
					                "filename": __dirname + "/activity.log",
					                "maxLogSize": 20480,
					                "backups": 10
					              }
					            ]
						},
						log_level:['trace','debug','info','warn','error','fatal']};

		_this.settings = settings;
		log4js.configure(_this.settings.logger);

		_this.logger = log4js.getLogger();
	},
	log:function(message, level){

		var _this = this;

		try{

			if (!level)
				level = 'info';

			if (!message)
				throw 'Blank message';

			if (_this.settings.log_level.indexOf(level) > -1){
				_this.logger[level](message);
			}

		}catch(e){
			console.log('logger failed');
			console.log(message);
			console.log(level);
			console.log(e);
		}
	
	}
}