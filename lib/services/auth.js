module.exports  = {
        internals:{
            jwt:require('jwt-simple'),
            moment:require('moment')(),
            crypto:require('crypto'),
            shortid:require('shortid'),

        },
        initialize:function(config, done){
            try{

                if (!config.tokenttl)
                    config.tokenttl = 0;

                if (!config.authTokenSecret)
                   return done('Missing authTokenSecret parameter');

                if (!config.systemSecret)
                    return done('Missing systemSecret parameter');

                this.config = config;
                done();
                
            }catch(e){
                done(e);
            }
        },
        encodeToken:function(session_data, done){
            try
            {
                var _this = this;
                var expiryTime = 0;

                if (_this.config.tokenttl > 0)
                    expiryTime = _this.internals.moment.unix() + (_this.config.tokenttl * 60);
               
                var token = _this.internals.jwt.encode({session_data: session_data,
                                                        ttl:_this.config.tokenttl, 
                                                        expires: expiryTime}, _this.config.authTokenSecret);
                
                
                done(null, token);
            }
            catch(e)
            {
                done(e);
            }
        },
        decodeToken:function(params, done){
            
            try
            {
                var _this = this;
                
                //console.log('in decode token');
                //console.log(params);

                var token = params.token;
            
                if (!token)
                    throw 'Authentication failed: No authentication token was found in the request headers';
                
                var decoded = _this.internals.jwt.decode(token, _this.config.authTokenSecret);
                
                 //console.log(decoded);

                //we allow for a minute, in case the backend code takes a while to sync
                if (decoded.expires > 0 && decoded.expires + 60 < _this.internals.moment.unix())
                    throw 'Authentication failed: Authentication token has expired';

                
                done(null, decoded)
            }
            catch(e)
            {
                done(e);
            }
        },
        /*
        encryptSecret:function(params, done){
            var _this = this;
            _this.internals.bcrypt.genSalt(10, function(err, salt) {
                if (!err)
                    _this.internals.bcrypt.hash(params.secret, salt, function(err, hash) {
                        if (!err)
                            done(null, hash);
                        else
                            done(err);
                    });
                else
                    done(err);
            });
        },
        compareSecret:function(params, done){
            var _this = this;
            
            _this.internals.bcrypt.compare(params.secret, params.hash, function(err, res) {
                done(err, res);
            });
        },
        */
        login:function(params, done){
            //login attempt is happening
            
          var _this = this;

          if (!params.session_data)
            params.session_data = {};

          params.session_data.session_id = _this.internals.shortid.generate();

          //console.log('IN LOGIN');
          //console.log(params);
          //console.log(params.secret);
          //console.log(_this.config.systemSecret);

          if (params.secret == _this.config.systemSecret){
            

              _this.encodeToken(params.session_data, function(e, token){
                                                done(e, token);
                                        });
          }else{
                done('Invalid credentials');
          }
           
        }
}