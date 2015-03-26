module.exports = {
	process_event: function(message, callback) {
        var _this = this;

        if (message.channel !== '/meta/subscribe')
            return callback(message);

        if (!message.session_token){
             message.error = 'Unauthorized subscription: no session_token';
             callback(message);
        }
        else{

            //console.log('IN AUTH EXT');
            //console.log(message);

            _this.freebase.services.auth.decodeToken({token:message.session_token}, function(e, decoded){

                //console.log('IN AUTH EXT');
                //console.log(e);
                //console.log(decoded);

                if (e)
                    message.error = 'Unauthorized subscription: ' + e;
                else
                    message.session_data = decoded;

                callback(message);
            });
        }
    }
}