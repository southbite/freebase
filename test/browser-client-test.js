var expect = require('expect.js');
var freebase = require('../lib/index')
var service = freebase.service;
var config  = require('./config');
var request = require('request');

describe('browser client tests', function() {

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

	it('should fetch the browser client', function(callback) {
		
		this.timeout(5000);

		try{

			require('request')({uri:'http://127.0.0.1:' + testport + '/browser_client',
					 method:'GET'
					}, 
					function(e, r, b){

						if (!e){
							console.log('got body!!!');
							console.log(b);
							callback();
						}else
							callback(e);
						

					});

		}catch(e){
			callback(e);
		}
	});


	
	
	
});