var _s = require('underscore.string');
var utc = require('moment').utc();
var traverse = require('traverse');
var ObjectID = require('mongodb').ObjectID;

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

        if (!config.collection)
            config.collection = 'freebase';

        MongoClient.connect('mongodb://' + config.host + ':' + config.port + '/' + config.db, function(err, db) {
            if(err) done(err);
            else{
               _this.config = config;
               _this.db = db; 
               done();
            }
        });
    },
    getArrayByPath:function(path, callback){
        var _this = this;

        _this.db.collection(_this.config.collection).find({path:path}).toArray(function(err, findresults) {

            if (err)
                return callback(err);

            return callback(null, findresults);

        });
    },
    saveTag:function(path, tag, data, callback){
         var _this = this;

         console.log('doing tag insert');
         console.log(path);
         console.log(tag);


         var insertTag = function(){

            console.log('tag inserting...');
            

            var tagData = {
                snapshot:data,
                path:path + '/tags/' + require('shortid').generate()
            }

            console.log(tagData);

            _this.db.collection(_this.config.collection).insert(tagData, null, function(err){

                if (err)
                    callback(err);
                else
                    callback(null, data);

            });
         }

         if (!data){

            _this.db.collection(_this.config.collection).find({"path":path}).toArray(function(err, findresults) {

                console.log('got tag data...');
                console.log(err);
                console.log('findresults.length');
                console.log(findresults.length);
                console.log(findresults[0]);

                console.log(callback);
                console.log(insertTag);

                if (err)
                    return callback(err);

                if (findresults.length == 1)
                {
                    console.log('about to tag insert...');
                    data = findresults[0];
                    insertTag();
                }   
                else
                    return callback('Attempt to tag something that doesn\'t exist in the first place');

               

            });

         }else
             insertTag();
    },
    parseBSON: function(criteria){

        console.log('traversing criteria');
        console.log(criteria);

        traverse(criteria).forEach(function (value) {
            if (value && value.bsonid) this.update(new ObjectID(value.bsonid));
        });

        console.log('done traversing criteria');
        console.log(criteria);

        return criteria;

    },
    process:function(message, callback) {

    var _this = this;

    var nodes = message.path.split('/');
    var subdocument = nodes.join('.');

    try{

        if (message.action == 'GET'){

            try{
                var cursor = null;

                 if (message.params.child_id){
                     cursor = _this.db.collection(_this.config.collection).find({path:message.path, "data._id": message.params.child_id}, {_id: 0, 'data.$': 1});
                 }  
                 else if (message.path.indexOf('*') >= 1){//we only do starts with searches
                    if (message.params.path_only){
                        cursor = _this.db.collection(_this.config.collection).find({path:{ $regex: message.path }}, { path: 1 }).sort( { path: 1 } );
                    }else{
                        cursor = _this.db.collection(_this.config.collection).find({path:{ $regex: message.path }}).sort( { path: 1 } );
                    }
                 }
                 else{
                    cursor = _this.db.collection(_this.config.collection).find({path:message.path});
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

                var criteria = _this.parseBSON(message.data.criteria);
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
              

                cursor = _this.db.collection(_this.config.collection).find({$and:[{path:{ $regex: message.path }},criteria]}, fields);

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
                var params = message.params?message.params:{};

                if (params.tag)
                    setData.tag = params.tag;

                var dataWasMerged = false;

                var upsert = function(){

                    _this.db.collection(_this.config.collection).update({path:message.path}, {$set: setData}, {upsert:true}, function(err, updatedCount) {
                        if (!err){

                            if (dataWasMerged && !params.tag)
                                return callback(null, setData); //this is because we already have the path and id

                            if (!dataWasMerged && params.tag){ // we dont have a prefetched object, but we want to tag

                                console.log('!dataWasMerged && params.tag come one!!!');
                                console.log(message.path);
                                console.log(params.tag);

                                _this.saveTag(message.path, params.tag, null, function(e, tagged){

                                    if (e)
                                        return callback(e);

                                    return callback(null, tagged);
                                });
                            }

                            if (dataWasMerged && params.tag){ // we have a prefetched object, and we want to tag it

                                _this.saveTag(message.path, params.tag, setData, function(e, tagged){

                                    if (e)
                                        return callback(e);

                                    return callback(null, tagged);
                                });
                            }
                            
                            if (!dataWasMerged && !params.tag){ // no prefetched object, and we dont need to tag - we need to fetch the object

                                _this.getArrayByPath(message.path, function(e, results){

                                    if (!err){
                                        callback(err, results[0]);
                                    }
                                    else
                                        callback(err);

                                });
                            }

                        }else
                            callback(err);

                    }.bind(_this));
                }


                if (params.merge){

                     _this.getArrayByPath(message.path, function(e, results){

                        if (e)
                            return callback(e);

                        if (results.length == 0)
                            return upsert();//no data to merge, all good

                        var previous = results[0].data;
                        
                        console.log('PREVIOUS DATA');
                        console.log(previous);

                        for (var propertyName in previous)
                            if (!setData.data[propertyName])
                                setData.data[propertyName] = previous[propertyName];
                        
                        dataWasMerged = true;

                        console.log('DATA WAS MERGED');
                        console.log(setData);

                        upsert();

                     });

                }else
                    upsert();

            }

            if (message.params.set_type == 'child'){
                //adds a child to a collection that sits at the given path
                 var posted = {data:message.data, _id: require('shortid').generate(), modified:timestamp};

                _this.db.collection(_this.config.collection).update({path:message.path}, {$push: {data:posted}}, {upsert:true}, function(err, updatedCount) {

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
              
                 _this.db.collection(_this.config.collection).update({path:message.path}, { $pull: { data: {'_id':message.params.child_id}}}, function(err, updated){
                    callback(err, {data:message.params.child_id, removed:updated});
                 });     

            }else{

                var criteria = {path:message.path};

                if (message.path.indexOf('*') > -1)
                    criteria = {path:{ $regex: message.path }};
               
                _this.db.collection(_this.config.collection).remove(criteria, function(err, removed){
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