var faye = require('faye'),
    cluster = require('cluster'),
    async = require('async'),
    http      = require('http'),
    connect = require('connect'),
    utils = require('./utils'),
    redis = require('faye-redis');;
    //numCPUs = require('os').cpus().length, interesting...
    //router = require('./router');

module.exports = {
  initialize:function(config, done){

    var faye_engine = null;
      
    try{

      var port = config.port?config.port:8000;
      var mount = config.mount?config.mount:'/sys@';

      utils.initialize(config.utils);

      var initializeWorker = function(){
        var freebase = {services:{}};
        var app = connect();
        
        var faye_engine = null;
        if (config.mode == 'cluster'){
          faye_engine = {
            type:   redis,
            host:   config.redis_host?config.redis_host:'localhost',
            namespace:config.redis_namespace?config.redis_namespace:'freebase'
          }
        }

        var bayeux = new faye.NodeAdapter({
          mount: '/events',
          timeout: config.timeout?config.timeout:25,
          engine: faye_engine
        });

        freebase.services.faye = bayeux.getClient();

        var loadService = function(service_name, done){
          var service = require('./services/' + service_name);
          service.utils = utils;
          service.freebase = freebase;
          freebase.services[service_name] = service;

          if (service['initialize']){
            if (!config.services[service_name])
            config.services[service_name] = {};

            service.initialize(config.services[service_name], function(e){
              done(e);
            });
          }else{
            done();
          }
        }

        async.series([
            function(callback){
                 loadService('auth', callback);
            },
            function(callback){
                 loadService('data', callback);
            }
        ],
          // optional callback
        function(err, results){
            if (err){
              utils.log('Failed to initialize services');
              process.exit(1);
            }
        });

        var loadMiddleware = function(middleware_name){
            var middleware = require('./middleware/' + middleware_name);
            middleware.utils = utils;
            middleware.freebase = freebase;

            app.use(middleware.process.bind(middleware));

            if (middleware['process_error'])
              app.use(middleware.process_error.bind(middleware));
        };

          
        app.use(require('body-parser')());

        loadMiddleware('client');
        loadMiddleware('prepare');
        loadMiddleware('auth');
        loadMiddleware('data');
        loadMiddleware('respond');

        var addExtension = function(requirepath, done){

          var extension = require(requirepath);
          extension.utils = require('./utils');
          extension.freebase = freebase;

          extension.incoming = function(message, callback){

            //if (message.channel.substring(0, 5) == '/meta')
            //  return callback(message);

            this.process_event(message, function(message){
                callback(message);
            });
          }.bind(extension);

           if (extension['initialize']){
            extension.initialize(function(e){
              if (!e)
                bayeux.addExtension(extension);

              done(e);
            });
           }
           else{
              bayeux.addExtension(extension);
              done();
           }
        }

        async.series([
            function(callback){
                 addExtension('./extensions/prepare', callback);
            },
            function(callback){
                 addExtension('./extensions/auth', callback);
            }
        ],
        function(err, results){
            if (err){
              utils.log('Failed to initialize extensions');
              process.exit(1);
            }
              
        });

        bayeux.on('subscribe', function(clientId, channel) {

           if (channel.substring(0, 5) != '/meta'){
            utils.log('picked up subscription on channel: ' + channel, 'info');
           }
          
        });


        bayeux.on('publish', function(clientId, channel, data) {
          if (channel.substring(0, 5) != '/meta'){
              utils.log('publish happened: ' + channel, 'info');
           }
        });

        var server = http.createServer(app);
        
        bayeux.attach(server);
        server.listen(port);
        
        if (config.mode == 'cluster'){
          var client = new faye.Client('http://localhost:' + (port + 1).toString() + mount);

          client.publish('/sys@/worker_initialized', {
            pid: process.pid
          });
        }
      }

      if (config.mode == 'cluster' && cluster.isMaster) {

          var initialized = 0;
          var server = http.createServer();

          var bayeux = new faye.NodeAdapter({
            mount:    '/sys@',
            timeout:  config.timeout?config.timeout:25,
            engine: {
              type: redis,
              host: config.redis_host?config.redis_host:'localhost',
              namespace: config.redis_namespace?config.redis_namespace:'freebase'
            }
          });

          server.listen(port + 1);//server listening on comms channel
          bayeux.attach(server);
          
          cluster.on('exit', function(worker, code, signal) {
            utils.log('worker ' + worker.process.pid + ' died');
            //cluster.fork();
          });

          cluster.fork(); //fork the first one

          bayeux.on('subscribe', function(clientId, channel) {

             if (channel.substring(0, 5) != '/meta'){
              utils.log('picked up subscription on channel: ' + channel);
              utils.log('clientId: ' + clientId);
             }
            
          });

          bayeux.getClient().subscribe('/sys@/worker_initialized', function(message) {
            initialized ++;

            utils.log('worker initialized: ' + message.pid);

            if (initialized >= config.size)
              done();
            else
              cluster.fork();

          });

        } else {
          initializeWorker();

          if (config.mode != 'cluster')
            done();
        }

    }catch(e){
        utils.log(e, 'error');
        done(e);
    }
  },
  client: require('./client')
}




