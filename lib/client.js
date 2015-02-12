var faye = require('faye');

module.exports = {
	newClient:function(config, done){

		try{

			if (!config.secret)
				throw 'config missing secret';

			if (!config.host)
				throw 'config missing host';

			if (!config.port)
				throw 'config missing port';

//BEGIN SERVER-SIDE ADAPTER - DO NOT REMOVE THIS COMMENT

			

			var http_adapter = {
				perform_request:function(params, done){

					var basetype = 'object';
					if (params.json instanceof Array)
						basetype = 'array'

					params.json = {encapsulated:params.json, basetype:basetype, client:'node'};
					require('request')(params, done);
				}
			}

//END SERVER-SIDE ADAPTER

/*BEGIN CLIENT-SIDE ADAPTER - DO NOT REMOVE THIS COMMENT

			if (!$)
				throw 'JQUERY NOT FOUND FOR CLIENT-SIDE ADAPTER';

	
			

			var http_adapter = {
				perform_request:function(params, done){

					var basetype = 'object';
					if (params.json instanceof Array)
						basetype = 'array'

					$.ajax({
					  type: params.method,
					  url: params.uri,
					  data: {encapsulated:encodeURIComponent(JSON.stringify(params.json)), basetype:basetype, client:'jquery'},
					  headers: params.headers
					})
				  	.error(function( message, status, error ) {
				    	done(error);
				  	})
				  	.success(function( data, status, message ) {
				    	done(null, null, data);
				  	});
				}
			}

*///END CLIENT-SIDE ADAPTER

			config.url = 'http://' + config.host + ':' + config.port


  			var request_helper = {
  				parseJSON:function(b){
					try
					{
						if (typeof(b) == 'object')
							return b;
						
						if (b != null && b != undefined)
						{
							return JSON.parse(b);
						}
						else 
							throw 'b is null';
					}
					catch(e)
					{
						return b;
					}
				},
				performRequest:function(url, method, headers, data, done){

					var _this = this;

					http_adapter.perform_request({uri:url,
					 method:method,
					 headers:headers?headers:{},
					 json:data
					}, 
					function(e, r, b){

						if (e)
							done(e);
						else
							done(null, _this.parseJSON(b));

					});
				}
  			}

			var client = {
				config:config,
				events:{},
				request_helper:request_helper,
				checkPath:function(path){
					if (path.match(/^[a-zA-Z0-9//_*/-]+$/) == null)
						throw 'Bad path, can only contain alphanumeric chracters, forward slashes, underscores, a single wildcard * and minus signs ie: /this/is/an/example/of/1/with/an/_*-12hello';
				},
				getHeaders:function(){

					var returnHeaders = {};

					if (this.token){
						////console.log('SETTING HEADERS');
						returnHeaders['session_token'] = this.token;
					}
						

					return returnHeaders;
				},
				getURL:function(path, criteria){

					var _this = this;
					_this.checkPath(path);

					if (path.substring(0,1) != '/')
						path = '/' + path; 

					var api_url = _this.config.url + path;
					
					if (criteria != null)
						api_url += "?" + require('querystring').stringify(criteria);
					
					//console.log('got request url: ' + api_url);
					
					return api_url;
					
				},
				getChannel:function(path, action){

					var _this = this;
					_this.checkPath(path);

					return '/' + action + '@' + path;

				},
				search:function(path, parameters, handler){
					var _this = this;
					//criteria, fields, sort, limit
					if (path.indexOf('*') == -1)
						path += '*';

					var searchParams = {criteria:{}, fields:false, sort:false, limit:false};

					if (parameters.criteria)
						searchParams.criteria = parameters.criteria;

					if (parameters.fields)
						searchParams.fields = parameters.fields;

					if (parameters.sort)
						searchParams.sort = parameters.sort;

					if (parameters.limit)
						searchParams.limit = parameters.limit;

					console.log('searching...');
					console.log(searchParams);

					_this.request_helper.performRequest(_this.getURL(path, null), 'POST', _this.getHeaders(), searchParams, handler);

				},/*
				getTree:function(path, options, handler){
					var _this = this;

					if (path.substring(path.length - 1), 1) != '*')
						path = path + '*';

					_this.getPaths(path, function(e, paths){

						if (e)
							return handler(e);

						var tree = {};

						paths.map(function(path){
							var currentBranch = {};
							var branches = path.split('/');
							
							branches.map(function(twig, index){

								if (!currentBranch[twig])
									currentBranch[twig] = {};



							});

						});
					});

				},*/
				get:function(path, options, handler){
					var _this = this;

					_this.request_helper.performRequest(_this.getURL(path, options), 'GET', _this.getHeaders(), null, handler);
				},
				getChild:function(path, childId, handler){
					var _this = this;

					_this.get(path, {child_id:childId}, handler);
				},
				getPaths:function(path, handler){
					var _this = this;

					_this.get(path, {path_only:true}, handler);
				},
				set:function(path, data, options, handler){
					var _this = this;
					
					_this.request_helper.performRequest(_this.getURL(path, options), 'PUT', _this.getHeaders(), data, handler);
				},
				setChild:function(path, data, handler){
					var _this = this;

					_this.set(path, data, {set_type:'child'}, handler);
				},
				setSibling:function(path, data, handler){
					var _this = this;

					_this.set(path, data, {set_type:'sibling'}, handler);
				},
				remove:function(path, options, handler){
					var _this = this;
					
					_this.request_helper.performRequest(_this.getURL(path, options), 'DELETE', _this.getHeaders(), null, handler);
				},
				removeChild:function(path, childId, handler){
					var _this = this;
					
					_this.remove(path, {child_id:childId}, handler);
				},
				handle_event:function(path, message){

					var _this = this;

					_this.events[path].map(function(delegate, index, arr){

						if (!delegate.runcount)
							delegate.runcount = 0;

						delegate.runcount++;
  
						if (delegate.count > 0 && delegate.count == delegate.runcount)
							arr.splice(index);

						delegate.handler.call(_this, message.error, message);
					});
				},
				on:function(path, event_name, count, handler, done){

					var _this = this;

					event_name = event_name.toUpperCase();

					path = _this.getChannel(path, event_name);

					//console.log('path!!!');
					//console.log(path);

					if (!_this.events[path]){
						_this.events[path] = [];


						var subscription = _this.faye.subscribe(path, function(message){
							_this.handle_event(path, message);
						});

						subscription.then(function(e) {

							console.log('then???');
							console.log(path);

							if (e){
								done(new Error(e));
							}else{
								_this.events[path].push({handler:handler, count:count});
								done();
							}
						});

					}else{

						_this.events[path].push({handler:handler, count:count});
						done();
					}

				},
				onAll:function(handler, done){

					var _this = this;

					_this.on('all', 'all', 0, handler, done);

				},
				off:function(path, event_name, handler){

					var _this = this;
					path = _this.getPath(path, event_name);

					if (_this.events[path] && _this.events[path].length > 0){
						_this.events[path].map(function(delegate, index, arr){
							if (delegate.handler === handler){
								arr.splice(index);
								if (arr.length == 0)
									delete _this.events[path];
							}
								
						});				
					}
				}
			};

			
			
			request_helper.performRequest(config.url + '/auth', 'POST', null, {secret:config.secret}, function(e, result){
				

				if (!e){

					var session_token = result.payload;

					var outgoing_extension = {
						session_token:session_token,
	  					outgoing: function(message, callback) {
	  						message.session_token = this.session_token;
	  						callback(message);
	  					}
	  				}

	  				client.token = session_token;
	  				console.log('cfg url');
	  				console.log(config.url + '/events');
	  				client.faye	= new faye.Client(config.url + '/events');
					client.faye.addExtension(outgoing_extension);

	  				done(null, client);

				}else
					done(e);

				
  			});

		}catch(e){
			done(new Error(e));
		}
	}
}