var freebase = require('./lib/index');
var service = freebase.service;

var port = 8000;

service.initialize({size:5, 
					port:8000, 
					services:{
						auth:{authTokenSecret:'a256a2fd43bf441483c5177fc85fd9d3',
						systemSecret:'freebase-secret'},
						utils:{log_level:'info|error|warning'}
			}}, 
		function(e){
			if (!e)
				console.log('Initialized freebase service on port ' + port);
			else
				console.log('Failed to initialize freebase service: ' + e);
});