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
            _this.freebase.services.auth.decodeToken({token:message.session_token}, function(e, decoded){

                if (e)
                    message.error = 'Unauthorized subscription: ' + e;
                else
                    message.session_data = decoded;

                callback(message);
            });
        }
    }
}