module.change_code = 1;
'use strict';

var alexa = require( 'alexa-app' );
var app = new alexa.app( 'example-skill' );


app.launch( function( request, response ) {
	response.say( 'Welcome to your test skill' ).reprompt( 'Way to go. You got it to run. Bad ass.' ).shouldEndSession( false );
} );


app.error = function( exception, request, response ) {
	console.log(exception)
	console.log(request);
	console.log(response);	
	response.say( 'Sorry an error occured ' + error.message);
};

app.intent('say_number',
  {
    "slots":{"NUMBER":"AMAZON.NUMBER"}
	,"utterances":[ 
		"say the number {NUMBER}"]
  },
  function(request,response) {
    var number = request.slot('NUMBER');
    response.say("You asked for the number "+number);
  }
);

module.exports = app;
