FREEBASE
=====================

Introduction
-------------------------

Freebase is an attempt at getting the same kind of functionality that [firebase](https://www.firebase.com/) offers, but it is free. It is not production ready - unless you want to fork it and do quite a lot of filling in...

Firebase is fricking awesome - but sometimes priced a little out of the reach of certain projects, but if you have the money to throw at it, it is well worth investigating.

Freebase uses faye for its pub/sub framework and mongo as its backend db, the API uses connect. The Redis part is to allow Faye to keep state across clustered instances of the Freebase worker process. The pub/sub stuff is working but the permissions are not linked into pub/sub(a security hole - whereby anyone can listen for PUT, DELETE events without logging on) But the PUT,GET,DELETE (set and remove methods of the client) are all working and are secured using web tokens.

Freebase stores its data in a collection called 'freebase' on your mongodb. The freebase system is actually built to be a module, this is because my idea is that you will be able to initialize a server in your own code, and possibly attach your own plugins to various system events. So the requirements and installation instructions show you how to reference freebase and write the code that starts the instance up. This won't be a tremendously detailed document - so please do spelunk and get involved.

Requirements
-------------------------

You need NodeJS and NPM of course, you also need to know how node works (as my setup instructions are pretty minimal)

You need to install [Redis](http://redis.io/topics/quickstart) and have it up and running, on its standard port: 6379

You need to install [Mongo](http://docs.mongodb.org/manual/installation/) and have it up and running on its standard port: 27017

Create a directory you want to run your freebase in, create a node application in it - with some kind of main.js and a package.json

I havent had the time to join npm yet, so add the following dependancy to your package.json:

```javascript
"dependencies": {
    "freebase": "git+https://github.com/southbite/freebase.git"
  }
```
To get the latest freebase files run:
npm install


*In node_modules/freebase/test in your folder, the e2e_test.js script demonstrates the server and client interactions shown in the following code snippets*

To start up a freebase, add following to your main.js:
-------------------------

```javascript
var freebase = require('freebase')
var service = freebase.service;

service.initialize({size:5, //this is how many worker processes for freebase you want running
					port:80, //the port you want freebase to listen on
					services:{
						auth:{authTokenSecret:'a256a2fd43bf441483c5177fc85fd9d3', //mandatory, but can be value you specify
						systemSecret:'my test secret'}, //mandatory, but can be value you specify
						utils:{log_level:'info|error|warning'} //writes to console.log on all log levels
					}}, function(e){
						callback(e);//your server has/has-not started
					});
```

In your console, go to your application folder and run *node main* your server should start up and be listening on your port of choice.

Connecting to Freebase
-------------------------

Using node:

```javascript
 var freebase = require('freebase'); 
 var freebase_client = freebase.client; 
 var my_client_instance; 

 	freebase_client.newClient({host:'localhost', 
						  port:80, 
						  secret:'my test secret'}, function(e, my_client_instance){

						  //if no e, then you have been passed back a client in the client variable
						  if (!e)
						  	my_client_instance.get...

```

To use the browser client, make sure the server is running, and reference the client javascript with the url pointing to the running server instances port and ip address like so:

```html
<script type="text/javascript" src="http://localhost:80/browser_client"></script>
<script>
//Thanks to the magic of browserify.org the browser client works exactly the same way as what the node client does, and can immediately be referenced like this:

	FreebaseBrowserClient.newClient({host:'localhost', port:80, secret:'my test secret'}, function(e, my_client_instance){

               if (!e){

               	//instance.get...
               	//instance.set...
               	//instance.on...

               }

    });
</script>
```

PUT
-------------------------

*Puts the json in the branch e2e_test1/testsubscribe/data, creates the branch if it does not exist*

```javascript
my_client_instance.set('e2e_test1/testsubscribe/data', {property1:'property1',property2:'property2',property3:'property3'}, null, function(e, result){
			
				if (!e){
					//successful
					console.log(result.payload);//payload is an object with the result with an _id and containing a [data] property with yr uploaded data

```

PUT CHILD
-------------------------

*Posts your data to a collection that lives at the end of the specified branch (creates the collection if it doesnt exist), the getChild method will fetch your data back*

```javascript
my_client_instance.setChild('e2e_test1/testsubscribe/data/collection', {property1:'post_property1',property2:'post_property2'}, function(e, results){

					if (!e){
						//the child method returns a child in the collection with a specified id
						my_client_instance.getChild('e2e_test1/testsubscribe/data/collection', results.payload._id, function(e, results){
```

PUT SIBLING
-------------------------

*Posts your data to a unique path starting with the path you passed in as a parameter*

```javascript
	my_client_instance.setSibling('e2e_test1/siblings', {property1:'sib_post_property1',property2:'sib_post_property2'}, function(e, results){
		//you would get all siblings by querying the path e2e_test1/siblings*
```

GET
---------------------------

*Gets the data living at the specified branch, gets the whole collection if the data is a collection, see the child method (above) for getting a specific item from a collection*

```javascript
publisherclient.get('e2e_test1/testsubscribe/data', null, function(e, results){
	//results is your data
	console.log(results.payload.length);//payload is now an array containing all the results for your get, get can also use a wildcard * in the path ie. publisherclient.get('e2e_test1/testsubscribe/data*'...
```

DELETE
---------------------------
*Deletes the data living at the specified branch, if a child_id is specified, the child from the collection at the end of the branch is deleted*

```javascript
	my_client_instance.remove('/e2e_test1/testsubscribe/data/delete_me', null, function(e, result){
	if (!e)
		//your item was deleted, result.payload is an object that lists the amount of objects deleted
```

DELETE CHILD
----------------------------
*Deletes a child from an array living at a branch *

```javascript
//first we put
my_client_instance.setChild('/e2e_test1/testsubscribe/data/catch_all_array', {property1:'property1',property2:'property2',property3:'property3'}, function(e, post_result){
	if (!e){
		//your item was added to a collection, now remove it
		my_client_instance.removeChild('/e2e_test1/testsubscribe/data/catch_all_array', post_result.payload._id, function(e, del_ar_result){

								
```

EVENTS
----------------------------

*You can listen to any PUT, POST and DELETE events happeneing in your data - you can specifiy a path you want to listen on or you can listen to all PUT, POST and DELETE using a catch-all listener*

Specific listener:
```javascript
my_client_instance.on('/e2e_test1/testsubscribe/data/delete_me', //the path you are listening on
					  'DELETE', //either PUT,POST,DELETE
					  1, //how many times you want your listener event handler to fire - in this case your listener function will only fire once
					  function(e, message){ //your listener event handler
```

Catch all listener:
```javascript
my_client_instance.onAll(function(e, message){

			//message consists of action property - POST,PUT, DELETE
			//and payload property - the actual data that got PUT, POSTED - or the _id of the data that got DELETED


		}, function(e){

```




