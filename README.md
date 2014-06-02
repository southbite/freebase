FREEBASE
=====================

Introduction
-------------------------

Freebase is an attempt at getting the same kind of functionality that [firebase](https://www.firebase.com/) offers, but it is free. Because this is the fruit of 3 days furious coding, I would not use it in production - unless you want to fork it and do quite a lot of filling in...

Firebase is fricking awesome - but sometimes priced a little out of the reach of certain projects, but if you have the money to throw at it, it is well worth investigating.

Freebase uses faye for its pub/sub framework and mongo as its backend db, the API uses connect and is RESTful. The Redis part is to allow Faye to keep state across clustered instances of the Freebase worker process. I havent created the browser client for freebase yet - only the node client, nor are the permissions linked into pub/sub... But the event stuff and POST,PUT,GET,DELETE or all working.

Freebase stores its data in a collection called 'freebase' on your mongodb. This wont be a tremendously detailed document - so please do spelunk and get involved

Requirements
-------------------------

You need NodeJS and NPM of course.

You need to install [Redis](http://redis.io/topics/quickstart) and have it up and running, on its standard port: 6379

You need to install [Mongo](http://docs.mongodb.org/manual/installation/) and have it up and running on its standard port: 27017


* The /test/e2e_test.js demonstrates the server and client interactions shown in the following code snippets *

Starting up Freebase
-------------------------

`
var freebase = require('freebase')
var service = freebase.service;

service.initialize({size:5, //this is how many worker processes for freebase you want running
					port:testport, //the port you want freebase to listen on
					services:{
						auth:{authTokenSecret:'a256a2fd43bf441483c5177fc85fd9d3', //mandatory, but can be value you specify
						systemSecret:test_secret}, //mandatory, but can be value you specify
						utils:{log_level:'info|error|warning'} //writes to console.log on all log levels
					}}, function(e){
						callback(e);//your server has/has-not started
					});

`

Connecting to Freebase
-------------------------

`
var freebase = require('freebase')
var freebase_client = freebase.client;
var my_client_instance;

freebase_client.newClient({host:'localhost', 
						  port:testport, 
						  secret:test_secret}, function(e, client){

						  //if no e, then you have been passed back a client in the client variable
						  if (!e)
						  	my_client_instance = client;


`

PUT
-------------------------
* Puts the json in the branch e2e_test1/testsubscribe/data, creates the branch if it does not exist *

`

my_client_instance.put('e2e_test1/testsubscribe/data', //your branch
					{property1:'property1',property2:'property2',property3:'property3'}, //your data
					function(e, result){


`

POST
-------------------------
* Posts your data to a collection that lives at the end of the specified branch (creates the collection if it doesnt exist), the child method will fetch your data back *

`

my_client_instance.post('e2e_test1/testsubscribe/data/collection', {property1:'post_property1',property2:'post_property2'}, function(e, results){

					if (!e){
						//the child method returns a child in the collection with a specified id
						my_client_instance.child('e2e_test1/testsubscribe/data/collection', results.data._id, function(e, results){
							if (!e)
								//you have your data back


`

GET
---------------------------
* Gets the data living at the specified branch, gets the whole collection if the data is a collection, see the child method (above) for getting a specific item from a collection *

`
my_client_instance.get('e2e_test1/testsubscribe/data', function(e, results){
	//results is your data

`

DELETE
---------------------------
* Deletes the data living at the specified branch, if a child_id is specified, the child from the collection at the end of the branch is deleted *

`
my_client_instance.delete('/e2e_test1/testsubscribe/data/delete_me', null, function(e, result){
	if (!e)
		//your item was deleted

`

DELETE CHILD
----------------------------
* Deletes a child from an array living at a branch *

`
	//first we put
	my_client_instance.post('/e2e_test1/testsubscribe/data/arr_delete_me', {property1:'property1',property2:'property2',property3:'property3'}, function(e, post_result){

	if (!e){
		//your item was added to a collection
		my_client_instance.delete('/e2e_test1/testsubscribe/data/arr_delete_me',
								   post_result.data._id, //NB - this is the child_id (you get back from the data)
								   function(e, delete_result){ //your callback

		

`

EVENTS
----------------------------
* You can listen to any PUT, POST and delete events happeneing in your data - there us no catch-all at the moment - so you need to specifiy a path you want to listen on *

`
	listenerclient.on('/e2e_test1/testsubscribe/data/delete_me', //the path you are listening on
					  'DELETE', //either PUT,POST,DELETE
					  1, //how many times you want your listener event handler to fire - in this case your listener function will only fire once
					  function(e, message){ //your listener event handler 
`




