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

	it('should initialize the service', function(callback) {
		
		this.timeout(20000);

		try{

			service.initialize({size:5, port:testport, services:{
				auth:{authTokenSecret:'a256a2fd43bf441483c5177fc85fd9d3',
				systemSecret:test_secret}
			}}, function(e){
				callback(e);
			});

		}catch(e){
			callback(e);
		}
	});

	var publisherclient;
	var listenerclient;


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



	it('the publisher should set data ', function(callback) {
		
		this.timeout(10000);

		try{

			publisherclient.put('e2e_test1/testsubscribe/data', {property1:'property1',property2:'property2',property3:'property3'}, function(e, result){

				console.log('put happened');
				console.log(e);
				console.log(result);
			
				if (!e){
					publisherclient.get('e2e_test1/testsubscribe/data', function(e, results){

						callback(e);

					});
				}
			});

		}catch(e){
			callback(e);
		}
	});

	it('the publisher should push to a collection and get a child', function(callback) {
		
		this.timeout(10000);

		try{

				publisherclient.post('e2e_test1/testsubscribe/data/collection', {property1:'post_property1',property2:'post_property2'}, function(e, results){

					console.log('POST RESULTS');
					console.log(results);

					if (!e){

						publisherclient.child('e2e_test1/testsubscribe/data/collection', results.data._id, function(e, results){

							if (!e){
								console.log('GOT CHILD');
								console.log(results);
							}

							callback(e);
						});

					}else
						callback(e);

				});
					

		}catch(e){
			callback(e);
		}
	});

	it('the listener should pick up a single published event', function(callback) {
		
		this.timeout(10000);

		try{

			listenerclient.on('/e2e_test1/testsubscribe/data/event', 'PUT', 1, function(e, message){

				console.log('on happened');
				console.log(message);
				expect(listenerclient.events['/PUT@/e2e_test1/testsubscribe/data/event'].length).to.be(0);

				callback(e);

			}, function(e){

				console.log('ON HAS HAPPENED: ' + e);

				if (!e){

					expect(listenerclient.events['/PUT@/e2e_test1/testsubscribe/data/event'].length).to.be(1);

					console.log('on subscribed, about to publish');

					publisherclient.put('/e2e_test1/testsubscribe/data/event', {property1:'property1',property2:'property2',property3:'property3'}, function(e, result){
						console.log('put happened');
						console.log(result);
					});
				}else
					callback(e);
			});

		}catch(e){
			callback(e);
		}
	});


	
	
});