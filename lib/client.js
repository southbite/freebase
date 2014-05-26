var faye = require('faye');
var request = require('request');

module.exports = {
	newClient:function(config, done){

		try{

			if (!config.secret)
				throw 'config missing secret';

			if (!config.host)
				throw 'config missing host';

			if (!config.port)
				throw 'config missing port';

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

					console.log(url);
					console.log(method);
					console.log(headers);
					console.log(data);
					

					require('request')({uri:url,
					 method:method,
					 headers:headers?headers:{},
					 json:data
					}, 
					function(e, r, b){

						if (e)
							done(e);
						else
							done(null, b);

					});
				}
  			}

			var client = {
				config:config,
				events:{},
				request_helper:request_helper,
				checkPath:function(path){
					if (path.match(/[.\\:@]$/))
						throw 'Bad path, cannot contain characters .\\:@';
				},
				getHeaders:function(){

					var returnHeaders = {};

					if (this.token){
						//console.log('SETTING HEADERS');
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
					
					console.log('GOT EFFING CRITERIA');
					console.log(criteria);
					console.log(require('querystring').stringify(criteria));

					if (criteria != null)
						api_url += "?" + require('querystring').stringify(criteria);
					
					//////console.log('got request url: ' + api_url);
					
					return api_url;
					
				},
				getChannel:function(path, action){

					var _this = this;
					_this.checkPath(path);

					return '/' + action + '@' + path;

				},
				child:function(path, id, handler){
					var _this = this;

					//function(url, method, headers, data, done)

					_this.request_helper.performRequest(_this.getURL(path, {child_id:id}), 'GET', _this.getHeaders(), null, handler);
				},
				get:function(path, handler){
					var _this = this;

					//function(url, method, headers, data, done)

					_this.request_helper.performRequest(_this.getURL(path, null), 'GET', _this.getHeaders(), null, handler);
				},
				put:function(path, data, handler){
					var _this = this;

					//////console.log('PUT HAPPENING');
					//////console.log(_this);

					_this.request_helper.performRequest(_this.getURL(path, null), 'PUT', _this.getHeaders(), data, handler);
				},
				'delete':function(path, handler){
					var _this = this;

					_this.request_helper.performRequest(_this.getURL(path, null), 'DELETE', _this.getHeaders(), null, handler);
				},
				post:function(path, data, handler){
					var _this = this;

					_this.request_helper.performRequest(_this.getURL(path, null), 'POST', _this.getHeaders(), data, handler);
				},
				publish:function(path, action, data){
					var _this = this;
					path = _this.getChannel(path, action);

					//////console.log('publishing to channel: ' + path);

					var publication = _this.faye.publish(path, data);

					publication.then(function() {
					  //////console.log('published to channel: ' + path);
					}, function(error) {
					  throw 'There was a problem publishing: ' + error.message;
					});
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

					if (!_this.events[path]){
						_this.events[path] = [];

						//console.log('faye subscribing to event on: ' + path);

						var subscription = _this.faye.subscribe(path, function(message){
							//////console.log('handling event on: ' + path);
							_this.handle_event(path, message);
						});

						subscription.then(function(e) {
							if (e){
								done(new Error(e));
							}else{
								//console.log('subscribed to events on: ' + path);
								_this.events[path].push({handler:handler, count:count});
								done();
							}
						});
					}else{

						_this.events[path].push({handler:handler, count:count});
						done();
					}

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

					////////console.log('unsubscribed to event on: ' + path);
				}
			};

			
			
			request_helper.performRequest(config.url + '/auth', 'POST', null, {secret:config.secret}, function(e, result){

				//console.log('LOGON RESULT');
				//////console.log(result.error);
				//console.log(result);

				//console.log(config.url);

				var session_token = result.data;

				if (!e){

					var outgoing_extension = {
						session_token:session_token,
	  					outgoing: function(message, callback) {
	  						message.session_token = this.session_token;
	  						callback(message);
	  					}
	  				}

	  				client.token = session_token;
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