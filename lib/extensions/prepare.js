module.exports = {
	process_event: function(message, callback) {
    var _this = this;

    try{

       _this.freebase.utils.log('message preparing', 'trace', 'prepare');
       _this.freebase.utils.log(message, 'trace', 'prepare');

        if (message.channel.substring(0, 5) == '/meta')
             return callback(message);

         if (!message.data.response)
            message.data.response = {};

        message.clean_channel = message.channel.split('@')[1];
        message.action = message.channel.split('@')[0].split('_')[1];

        _this.freebase.utils.log('message prepared', 'trace', 'prepare');
        _this.freebase.utils.log(message, 'trace', 'prepare');

    }catch(e){
        message.error = 'malformed channel or message: ' + e;
         _this.freebase.utils.log(message, 'trace', 'prepare');
    }

    callback(message);
  }
}