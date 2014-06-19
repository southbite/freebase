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
		
		this.timeout(20000);

		try{

			service.initialize({size:1, port:testport, services:{
				auth:{authTokenSecret:'a256a2fd43bf441483c5177fc85fd9d3',
				systemSecret:test_secret},
				utils:{log_level:'info|error|warning'}
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


	//We are testing setting data at a specific path



	it('the publisher should set data ', function(callback) {
		
		this.timeout(10000);

		try{

			publisherclient.set('e2e_test1/testsubscribe/data', {property1:'property1',property2:'property2',property3:'property3'}, null, function(e, result){
			
				if (!e){
					publisherclient.get('e2e_test1/testsubscribe/data', null, function(e, results){

						callback(e);

					});
				}
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
						publisherclient.getChild('e2e_test1/testsubscribe/data/collection', results.data._id, function(e, results){
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

				//console.log('ON HAS HAPPENED: ' + e);

				if (!e){

					expect(listenerclient.events['/PUT@/e2e_test1/testsubscribe/data/event'].length).to.be(1);

					//console.log('on subscribed, about to publish');

					//then make the change
					publisherclient.set('/e2e_test1/testsubscribe/data/event', {property1:'property1',property2:'property2',property3:'property3'}, null, function(e, result){
						//console.log('put happened - listening for result');
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

						console.log('delete message');
						console.log(message);

						//we are looking at the event internals on the listener to ensure our event management is working - because we are only listening for 1
						//instance of this event - the event listener should have been removed 
						expect(listenerclient.events['/DELETE@/e2e_test1/testsubscribe/data/delete_me'].length).to.be(0);

						//we needed to have removed a single item
						expect(message.removed).to.be(1);

						//console.log(message);

						callback(e);

					}, function(e){

						//console.log('ON HAS HAPPENED: ' + e);

						if (!e){

							expect(listenerclient.events['/DELETE@/e2e_test1/testsubscribe/data/delete_me'].length).to.be(1);

							//console.log('subscribed, about to delete');

							//We perform the actual delete
							publisherclient.remove('/e2e_test1/testsubscribe/data/delete_me', null, function(e, result){
								//console.log('put happened - listening for result');
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

					if (e)
						return callback(e);

					publisherclient.get('/e2e_test1/testsubscribe/data/arr_delete_me', null, function(e, results){

						if (e)
							return callback(e);

						//console.log('got array');
						//console.log(results);

						
						expect(results.data.length).to.be(1);

						publisherclient.removeChild('/e2e_test1/testsubscribe/data/arr_delete_me', post_result.data._id, function(e, delete_result){

							if (e)
							return callback(e);

							//console.log('delete happened');
							//console.log(delete_result);

							publisherclient.get('/e2e_test1/testsubscribe/data/arr_delete_me', null, function(e, results){

								if (e)
									return callback(e);

								expect(results.data.length).to.be(0);

								callback(e);

							});

							
						});


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

			console.log(message);

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

							publisherclient.removeChild('/e2e_test1/testsubscribe/data/catch_all_array', post_result.data._id, function(e, del_ar_result){

								//console.log(del_ar_result);
						
							});
					
						});
					
					});

				});

			}

		});

	});

	it('should get using a wildcard', function(callback) {

		publisherclient.get('/e2e_test1/testsubscribe/data*', null, function(e, results){

			expect(results.data.length > 0).to.be(true);

			publisherclient.getPaths('/e2e_test1/testsubscribe/data*', function(e, results){

				expect(results.data.length > 0).to.be(true);

				callback(e);

			});


		});

	});
	
});