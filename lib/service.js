var faye = require('faye'),
    cluster = require('cluster'),
    async = require('async'),
    http      = require('http'),
    connect = require('connect'),
    redis = require('faye-redis'),
    utils = require('./utils');
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
       
        var freebase = {services:{}, config:config};
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
        freebase.utils = utils;

        var loadService = function(serviceName, service, done){

          var serviceInstance;

          if (!service.instance){
            try{

              if (!service.path)
                service.path = './services/' + serviceName;

              serviceInstance = require(service.path);

            }catch(e){
              utils.log('Failed to instantiate service: ' + serviceName, 'error');
              utils.log(e, 'error');
            }
          }else
            serviceInstance = service.instance;

          
          serviceInstance.freebase = freebase;

          freebase.services[serviceName] = serviceInstance;

          if (serviceInstance['initialize']){

            if (!service.config)
              service.config = {};

            serviceInstance.initialize(service.config, function(e){
              done(e);
            });

          }else{
            done();
          }
        }

        //console.log('CONFIG SERVICES');
        //console.log(config.services);

        async.eachSeries(Object.keys(config.services), function(serviceName, callback) {

          var service = config.services[serviceName];
          loadService(serviceName, service, callback);

        }, 
        function(err){
            if (err){

              utils.log('Failed to initialize services', 'error');
              utils.log(err, 'error');

              process.exit(1);
            }
        });

        var loadMiddleware = function(middleware_name){
            var middleware = require('./middleware/' + middleware_name);
            
            middleware.freebase = freebase;
            app.use(middleware.process.bind(middleware));

            if (middleware['process_error'])
              app.use(middleware.process_error.bind(middleware));
        };

        var bodyParser = require('body-parser')
        app.use(bodyParser.json())
        //app.use(connect.json());

        loadMiddleware('client');
        loadMiddleware('prepare');
        loadMiddleware('auth');
        loadMiddleware('data');
        loadMiddleware('respond');

        var addExtension = function(requirepath, done){

          var extension = require(requirepath);
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
              utils.log('picked up subscription on channel: ' + channel, 'trace');
           }
          
        });


        bayeux.on('publish', function(clientId, channel, data) {
          if (channel.substring(0, 5) != '/meta'){
              utils.log('publish happened: ' + channel, 'trace');
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
         
          if (!config.size)
            config.size = require('os').cpus().length;

          if (config.size > 1)
            initialized = 1;

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
            utils.log('worker ' + worker.process.pid + ' died', 'error');
            //cluster.fork();
          });

          cluster.fork(); //fork the first one

          bayeux.on('subscribe', function(clientId, channel) {

             if (channel.substring(0, 5) != '/meta'){
              utils.log('picked up subscription on channel: ' + channel, 'trace');
              utils.log('clientId: ' + clientId, 'trace');
             }
            
          }.bind(this));

          bayeux.getClient().subscribe('/sys@/worker_initialized', function(message) {
            initialized ++;

            utils.log('worker initialized: ' + message.pid, 'trace');

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
        ////console.log(e);
        done(e);
    }
  },
  client: require('./client')
}




