var expect = require('expect.js');

var freebase = require('../lib/index')

var service = freebase.service;
var freebase_client = freebase.client;
var config  = require('./config');
var faye = require('faye');
var async = require('async');

describe('e2e test', function() {

	var testport = 8000;
	var test_secret = 'test_secret';

	/*
	This test demonstrates starting up the freebase service - with 5 worker processes
	the authentication service will use authTokenSecret to encrypt web tokens identifying
	the logon session. The utils setting will set the system to log non priority information
	*/

	it('should initialize the service', function(callback) {
		
		this.timeout(5000);

		try{

			service.initialize({size:1, port:testport, services:{
				auth:{authTokenSecret:'a256a2fd43bf441483c5177fc85fd9d3',
				systemSecret:test_secret},
				utils:null
			}}, function(e){
				callback(e);
			});

		}catch(e){
			callback(e);
		}
	});

	var publisherclient;
	var listenerclient;

	/*
	We are initializing 2 clients to test saving data against the database, one client will push data into the 
	database whilst another listens for changes.
	*/

	it('should initialize the clients', function(callback) {
		
		this.timeout(5000);

		try{

			freebase_client.newClient({host:'localhost', port:testport, secret:test_secret}, function(e, client){

				publisherclient = client;


				if (e)
					return callback(e);

				freebase_client.newClient({host:'localhost', port:testport, secret:test_secret}, function(e, client){

					listenerclient = client;

					callback(e);
				});


			});

		}catch(e){
			callback(e);
		}
	});




	it('should subscribe to the catch all notification', function(callback) {

		var caught = {};

		this.timeout(10000);
		
		listenerclient.onAll(function(e, message){

			if (!caught[message.action])
				caught[message.action] = 0;

			caught[message.action]++;
			
			if (caught['PUT'] == 2 && caught['DELETE'] == 2)
				callback();


		}, function(e){

			if (e)
				callback(e);
			else {

				publisherclient.set('/e2e_test1/testsubscribe/data/catch_all', {property1:'property1',property2:'property2',property3:'property3'}, null, function(e, put_result){

					//console.log(put_result);

					publisherclient.setChild('/e2e_test1/testsubscribe/data/catch_all_array', {property1:'property1',property2:'property2',property3:'property3'}, function(e, post_result){

						//console.log(post_result);

						publisherclient.remove('/e2e_test1/testsubscribe/data/catch_all', null, function(e, del_result){

							//console.log(del_result);

							publisherclient.removeChild('/e2e_test1/testsubscribe/data/catch_all_array', post_result.payload._id, function(e, del_ar_result){

								//console.log(del_ar_result);
						
							});
					
						});
					
					});

				});

			}

		});

	});

	//We are testing setting data at a specific path


	it('the publisher should set data ', function(callback) {
		
		this.timeout(2000);

		try{

			publisherclient.set('e2e_test1/testsubscribe/data', {property1:'property1',property2:'property2',property3:'property3'}, null, function(e, result){
			
				if (!e){
					publisherclient.get('e2e_test1/testsubscribe/data', null, function(e, results){

						callback(e);

					});
				}else
					callback(e);
			});

		}catch(e){
			callback(e);
		}
	});

	it('should set data, and then merge a new document into the data without overwriting old fields', function(callback) {
		
		this.timeout(2000);

		try{

			publisherclient.set('e2e_test1/testsubscribe/data/merge', {property1:'property1',property2:'property2',property3:'property3'}, null, function(e, result){
			
				if (!e){
					publisherclient.set('e2e_test1/testsubscribe/data/merge', {property4:'property4'}, {merge:true}, function(e, result){

						if (e)
							return callback(e);

						publisherclient.get('e2e_test1/testsubscribe/data/merge', null, function(e, results){

							if (e)
								return callback(e);

							console.log('in merge test');
							console.log(results.payload[0].data);

							expect(results.payload[0].data.property4).to.be('property4');
							expect(results.payload[0].data.property1).to.be('property1');
							
							callback();

						});  

					});
				}else
					callback(e);
			});

		}catch(e){
			callback(e);
		}
	});


	//We are testing pushing a specific value to a path which will actually become an array in the database



	it('the publisher should push to a collection and get a child', function(callback) {
		
		this.timeout(10000);

		try{

				publisherclient.setChild('e2e_test1/testsubscribe/data/collection', {property1:'post_property1',property2:'post_property2'}, function(e, results){

					if (!e){
						//the child method returns a child in the collection with a specified id
						publisherclient.getChild('e2e_test1/testsubscribe/data/collection', results.payload._id, function(e, results){
							callback(e);
						});

					}else
						callback(e);

				});
					

		}catch(e){
			callback(e);
		}
	});

	it('the publisher should push a sibling and get all siblings', function(callback) {
		
		this.timeout(10000);

		try{

				publisherclient.setSibling('e2e_test1/siblings', {property1:'sib_post_property1',property2:'sib_post_property2'}, function(e, results){

					if (!e){
						//the child method returns a child in the collection with a specified id
						publisherclient.get('e2e_test1/siblings*', null, function(e, results){
							console.log('siblings set');
							console.log(results);
							expect(results.payload.length > 0).to.be(true);
							callback(e);
						});

					}else
						callback(e);

				});
					

		}catch(e){
			callback(e);
		}
	});


//	We set the listener client to listen for a PUT event according to a path, then we set a value with the publisher client.

	it('the listener should pick up a single published event', function(callback) {
		
		this.timeout(10000);

		try{

			//first listen for the change
			listenerclient.on('/e2e_test1/testsubscribe/data/event', 'PUT', 1, function(e, message){

				expect(listenerclient.events['/PUT@/e2e_test1/testsubscribe/data/event'].length).to.be(0);
				callback(e);

			}, function(e){

				////console.log('ON HAS HAPPENED: ' + e);

				if (!e){

					expect(listenerclient.events['/PUT@/e2e_test1/testsubscribe/data/event'].length).to.be(1);

					////console.log('on subscribed, about to publish');

					//then make the change
					publisherclient.set('/e2e_test1/testsubscribe/data/event', {property1:'property1',property2:'property2',property3:'property3'}, null, function(e, result){
						////console.log('put happened - listening for result');
					});
				}else
					callback(e);
			});

		}catch(e){
			callback(e);
		}
	});



//	We are testing the deletion of data at a set path, and listening for the DELETE event at that path.

	it('the listener should pick up a single delete event', function(callback) {
		
		this.timeout(10000);

		try{

				//We put the data we want to delete into the database
				publisherclient.set('/e2e_test1/testsubscribe/data/delete_me', {property1:'property1',property2:'property2',property3:'property3'}, null, function(e, result){

					//We listen for the DELETE event
					listenerclient.on('/e2e_test1/testsubscribe/data/delete_me', 'DELETE', 1, function(e, message){

						//console.log('delete message');
						//console.log(message);

						//we are looking at the event internals on the listener to ensure our event management is working - because we are only listening for 1
						//instance of this event - the event listener should have been removed 
						expect(listenerclient.events['/DELETE@/e2e_test1/testsubscribe/data/delete_me'].length).to.be(0);

						//we needed to have removed a single item
						expect(message.removed).to.be(1);

						////console.log(message);

						callback(e);

					}, function(e){

						////console.log('ON HAS HAPPENED: ' + e);

						if (!e){

							expect(listenerclient.events['/DELETE@/e2e_test1/testsubscribe/data/delete_me'].length).to.be(1);

							////console.log('subscribed, about to delete');

							//We perform the actual delete
							publisherclient.remove('/e2e_test1/testsubscribe/data/delete_me', null, function(e, result){
								////console.log('put happened - listening for result');
							});
						}else
							callback(e);
					});
				});

			

		}catch(e){
			callback(e);
		}
	});



	it('should delete a child from an array', function(callback) {
		
		this.timeout(10000);

		try{

				publisherclient.setChild('/e2e_test1/testsubscribe/data/arr_delete_me', {property1:'property1',property2:'property2',property3:'property3'}, function(e, post_result){

					//console.log('post_result');
					//console.log(post_result);

					if (e)
						return callback(e);

					publisherclient.get('/e2e_test1/testsubscribe/data/arr_delete_me', null, function(e, results){

						if (e)
							return callback(e);

						console.log('got array');
						console.log(results);

						expect(results.payload.length).to.be(1);

						publisherclient.removeChild('/e2e_test1/testsubscribe/data/arr_delete_me', post_result.payload._id, function(e, delete_result){

							if (e)
							return callback(e);

							console.log('delete happened');
							console.log(delete_result);

							publisherclient.get('/e2e_test1/testsubscribe/data/arr_delete_me', null, function(e, results){

								console.log('get after delete happened');
								console.log(results.payload[0].data);

								if (e)
									return callback(e);

								var foundChild = false;
								results.payload[0].data.map(function(child){
									if (child._id == post_result.payload._id)
										foundChild = true;
								});

								expect(foundChild).to.be(false);

								callback(e);

							});

							
						});


					});

				});

		}catch(e){
			callback(e);
		}
	});

	

	it('should get using a wildcard', function(callback) {

		publisherclient.get('/e2e_test1/testsubscribe/data*', null, function(e, results){

			expect(results.payload.length > 0).to.be(true);

			publisherclient.getPaths('/e2e_test1/testsubscribe/data*', function(e, results){

				expect(results.payload.length > 0).to.be(true);

				callback(e);

			});


		});

	});

	it('should search for a complex object', function(callback) {

		//console.log('DOING COMPLEX SEARCH');

		var complex_obj = {
			regions:['North','South','East','West'],
			towns:['North.Cape Town', 'South.East London'],
			categories:['Action','History'],
			subcategories:['Action.angling','History.art'],
			keywords:['bass','Penny Siopis'],
			field1:'field1'
		};

		var parameters1 = {
			criteria:{
				$or: [ {"data.regions": { $all: ["North", "East" ] }}, 
					   {"data.towns": { $all: ["North.Cape Town" ] }}, 
					   {"data.categories": { $all: ["Action","History" ] }}],
				"data.keywords": {$all: ["bass", "Penny Siopis" ]}
			},
			fields:{"data.field1":1},
			sort:{"data.field1":1},
			limit:1
		}

		var parameters2 = {
			criteria:null,
			fields:null,
			sort:{"field1":1},
			limit:1
		}


		var parameters3 = {
			criteria:{
				'data.keywords': {$all: ["bass", "Penny Siopis"]}
			},
			fields:null,
			sort:{"data.field1":1},
			limit:1
		}

		var parameters4 = {
			criteria:{
				'data.field1':'field1'
			},
			fields:null,
			sort:{"data.field1":1},
			limit:1
		}

		var parameters5 = {
			criteria:{
				'data.keywords': {$all: ["bass", "Penny Siopis","Non-existent"]}
			},
			fields:null,
			sort:{"data.field1":1},
			limit:1
		}


		

		publisherclient.set('/e2e_test1/testsubscribe/data/complex_one', complex_obj, null, function(e, put_result){

			if (!e){
				//console.log('IN COMPLEX SEARCH');
				publisherclient.search('/e2e_test1/testsubscribe/data/complex*', parameters1, function(e, search_result){

					//console.log('here is the search_result');
					//console.log(search_result.payload);
					//console.log(search_result.payload[0].data);

					expect(search_result.payload.length > 0).to.be(true);

					for (var index in search_result.payload)
						console.log(index);

					callback(e);

				});
			}else
				callback(e);

		});

	});

	it('should fail to subscribe to an event', function(callback) {

		this.timeout(10000);

		console.log('bad subscribe');
		var faye = require('faye');

		var outgoing_extension = {
		session_token:'blahblah',
			outgoing: function(message, callback) {
				message.session_token = this.session_token;
				callback(message);
			}
		}

		//http://localhost:8000/events
		var bad_client = new faye.Client('http://localhost:' + testport + '/events');
		bad_client.addExtension(outgoing_extension);

		var subscription = bad_client.subscribe('/ALL@all', function(message){
				
		});

		var subWasSuccessful = false;

		subscription.then(function(e){
			subWasSuccessful = true;
		});

		setTimeout(function(){

			if (subWasSuccessful)
				callback('unauthorized subscribe was let through');
			else
				callback();

		}, 3000);

	});

	it('should tag some test data', function(callback) {

		var randomTag = require('shortid').generate();

		publisherclient.set('e2e_test1/test/tag', {property1:'property1',property2:'property2',property3:'property3'}, {tag:randomTag}, function(e, result){

			if (!e){
				publisherclient.get('e2e_test1/test/tag/tags/*', null, function(e, results){

					expect(e).to.be(null);
					expect(results.payload.length > 0);

					var found = false;

					results.payload.map(function(tagged){

						if (found)
							return;

						console.log('tagged, comparing to ' + randomTag);
						console.log(tagged.snapshot.tag);

						if (tagged.snapshot.tag == randomTag)
							found = true;

					});

					if (!found)
						callback('couldn\'t find the tag snapshot');
					else
						callback();

				});
			}else
				callback(e);
		});

	});	

	it('should merge tag some test data', function(callback) {

		var randomTag = require('shortid').generate();

		publisherclient.set('e2e_test1/test/tag', {property1:'property1',property2:'property2',property3:'property3'}, null, function(e, result){

			if (!e){

			publisherclient.set('e2e_test1/test/tag', {property4:'property4'}, {tag:randomTag, merge:true}, function(e, result){

				if (!e){

					console.log('merge result!!!');
					console.log(result);

					expect(result.payload.data.property1).to.be('property1');
					expect(result.payload.data.property4).to.be('property4');

					publisherclient.get('e2e_test1/test/tag/tags/*', null, function(e, results){

						expect(e).to.be(null);
						expect(results.payload.length > 0).to.be(true);
						

						var found = false;

						results.payload.map(function(tagged){

							if (found)
								return;

							if (tagged.snapshot.tag == randomTag){
								expect(tagged.snapshot.data.property1).to.be('property1');
								expect(tagged.snapshot.data.property4).to.be('property4');
								found = true;
							}
			
						});

						if (!found)
							callback('couldn\'t find the tag snapshot');
						else
							callback();

					});
				}else
					callback(e);

			});

		}
		else
			callback(e);

			
		});

	});

	it('should save by id, then search and get by id, using bsonid property', function(callback) {

		var randomPath = require('shortid').generate();

		publisherclient.set('e2e_test1/test/bsinid/' + randomPath, {property1:'property1',property2:'property2',property3:'property3'}, {}, function(e, setresult){

			if (!e){

				console.log(setresult);

				var searchcriteria = {
					criteria:{
						'_id': {$in: [{bsonid:setresult.payload._id}]}
					}
				}

				publisherclient.search('e2e_test1/test/bsinid/*' , searchcriteria, function(e, results){

					expect(e).to.be(null);
					console.log(results);
					expect(results.payload.length == 1).to.be(true);
					callback();

				});
			}else
				callback(e);
		});

	});		

});