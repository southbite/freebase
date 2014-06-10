module.exports = {
    initialize:function(config, done){
        var _this = this;
        var MongoClient = require('mongodb').MongoClient

        if (!config.host)
            config.host = '127.0.0.1';

        if (!config.port)
            config.port = '27017';

        if (!config.db)
            config.db = 'freebase';

        MongoClient.connect('mongodb://' + config.host + ':' + config.port + '/' + config.db, function(err, db) {
            if(err) done(err);
            else{
               _this.db = db; 
               done();
            }
        });
    },
	process:function(message, callback) {

	var _this = this;

     var nodes = message.path.split('/');
     var collection = 'freebase';
     var subdocument = nodes.join('.');

    try{

    	if (message.action == 'GET'){

         var got_results = function(err, results, callback){
             if (results.length == 1)
                results = results[0].data;

               callback(err, results);
         }

         if (message.params.child_id)
             _this.db.collection(collection).find({path:message.path, "data._id": message.params.child_id}, {_id: 0, 'data.$': 1}).toArray(function(err, results) {
                got_results(err, results, callback);
            });
         else
            _this.db.collection(collection).find({path:message.path}).toArray(function(err, results) {
                got_results(err, results, callback);
            });
	    }
        else if (message.action == 'PUT'){
	    	
            _this.db.collection(collection).update({path:message.path}, {$set: {data:message.data}}, {upsert:true}, function(err, updatedCount) {

                if (!err){
                     _this.db.collection(collection).find({path:message.path}).toArray(function(err, results) {

                        if (!err)
                            callback(err, results[0]);
                        else
                             callback(err);

                     });
                }else
                    callback(err);

            });
        }
        else if (message.action == 'POST'){

            var posted = {data:message.data, _id: require('shortid').generate()};

	    	_this.db.collection(collection).update({path:message.path}, {$push: {data:posted}}, {upsert:true}, function(err, updatedCount) {

               if (!err)
                callback(err, posted);
               else
                callback(err);
            });
	    }
        else if (message.action == 'DELETE'){
            if (message.params.child_id){
              
                 _this.db.collection(collection).update({path:message.path}, { $pull: { data: {'_id':message.params.child_id}}}, function(err, updated){
                    callback(err, {data:message.params.child_id, removed:updated});

                 });            
            }else{
                _this.db.collection(collection).remove({path:message.path}, function(err, removed){
                    callback(err, {data:message.params.child_id, removed:removed});
                });
            }
	    }else{
            throw 'Bad action: ' + message.action;
        }
	    	

    }catch(e){
    	callback(e);
    }
  }
}