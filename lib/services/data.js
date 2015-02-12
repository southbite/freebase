var _s = require('underscore.string');
var utc = require('moment').utc();

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

            try{
                var cursor = null;

                 if (message.params.child_id){
                     cursor = _this.db.collection(collection).find({path:message.path, "data._id": message.params.child_id}, {_id: 0, 'data.$': 1});
                 }  
                 else if (message.path.indexOf('*') >= 1){//we only do starts with searches
                    if (message.params.path_only){
                        cursor = _this.db.collection(collection).find({path:{ $regex: message.path }}, { path: 1 }).sort( { path: 1 } );
                    }else{
                        cursor = _this.db.collection(collection).find({path:{ $regex: message.path }}).sort( { path: 1 } );
                    }
                 }
                 else{
                    cursor = _this.db.collection(collection).find({path:message.path});
                 } 

                 callback(null, cursor);

            }catch(e){
                callback(e);
            }

        }
        else if (message.action == 'POST'){
            //this is how we search for things - so more complex queries

            try{

                var cursor = null;

                //console.log('IN POST');
                
                  //console.log(message.data.fields);
                   //console.log(message.data.sort);
                   //console.log(message.data.limit);

                var criteria = message.data.criteria;
                var fields = message.data.fields;
                var sort = message.data.sort;

                if(!fields)
                   fields = {};
               

                if(!criteria)
                    criteria = {};
               
                 //console.log('in post criteria');
                 //console.log(criteria);
                 //console.log(fields);
                //console.log(sort);
              

                cursor = _this.db.collection(collection).find({$and:[{path:{ $regex: message.path }},criteria]}, fields);

                if (message.data.sort)
                    cursor = cursor.sort(message.data.sort);

                if (message.data.limit)
                    cursor = cursor.limit(message.data.limit);

                callback(null, cursor);

            }catch(e){
                callback(e);
            }
        }
        else if (message.action == 'PUT'){

            var timestamp = utc.valueOf();

            var regularPUT = function(){
                if (message.data instanceof Array)
                message.data.map(function(item, index, array){

                    if (item._id == null)
                        item = {data:item, _id: require('shortid').generate(), modified:timestamp};
                   
                    array.splice(index, 1, item);
                       
                });

                var setData = {data:message.data, modified:timestamp};

                if (message.params && message.params.tag)
                    setData.tag = message.params.tag;

                _this.db.collection(collection).update({path:message.path}, {$set: setData}, {upsert:true}, function(err, updatedCount) {
                    if (!err){
                         _this.db.collection(collection).find({path:message.path}).toArray(function(err, findresults) {

                            if (!err){

                                 //callback(err, results[0]);
                                 if (findresults[0].tag){

                                    var tagData = {
                                        snapshot:findresults[0],
                                        path:message.path + '/tags/' + require('shortid').generate()
                                    }

                                    _this.db.collection(collection).insert(tagData, null, function(err, insertresults){

                                        if (err)
                                            callback('tagging failed: ' + err.message?err.message:err.toString(), findresults[0]);
                                        else
                                            callback(null, findresults[0]);

                                    });

                                 }else
                                    callback(err, findresults[0]);
                            }
                            else
                                callback(err);

                         });
                    }else
                        callback(err);

                });
            }

            if (message.params.set_type == 'child'){
                //adds a child to a collection that sits at the given path
                 var posted = {data:message.data, _id: require('shortid').generate(), modified:timestamp};

                _this.db.collection(collection).update({path:message.path}, {$push: {data:posted}}, {upsert:true}, function(err, updatedCount) {

                   if (!err)
                    callback(err, posted);
                   else
                    callback(err);
                });

            }else if (message.params.set_type == 'sibling'){
                //appends an item with a path that matches the message path - but made unique by a shortid at the end of the path
                if (!_s.endsWith(message.path, '/')) message.path += '/';
                message.path += require('shortid').generate();
                regularPUT();

            }else{
                regularPUT();
            }
        }
        else if (message.action == 'DELETE'){

            //console.log('deleting');

            if (message.params.child_id){
              
                 _this.db.collection(collection).update({path:message.path}, { $pull: { data: {'_id':message.params.child_id}}}, function(err, updated){
                    callback(err, {data:message.params.child_id, removed:updated});
                 });     

            }else{

                var criteria = {path:message.path};

                if (message.path.indexOf('*') > -1)
                    criteria = {path:{ $regex: message.path }};
               
                _this.db.collection(collection).remove(criteria, function(err, removed){
                    callback(err, {data:message.path, removed:removed});
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