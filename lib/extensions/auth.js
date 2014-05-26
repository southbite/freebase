module.exports = {
	process_event: function(message, callback) {
        var _this = this;

        //console.log('in auth process');
        //console.log(message);

        callback(message);

        // Let non-subscribe messages through
        //if (message.channel !== '/meta/subscribe')
        //  return callback(message);
        /*
         _this.utils.log('auth happened');

        try{

            _this.services.auth.process({action:message.action, path:message.clean_channel, token:message.data.___token}, function(e, result){

                if (e)
                    message.error = e;
                
                 callback(message);

            });

        }catch(e){
            message.error = e;
            callback(message);
        }

        */
  }
}