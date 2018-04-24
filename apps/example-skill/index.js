module.change_code = 1;
'use strict';

var alexa = require( 'alexa-app' );
var app = new alexa.app( 'example-skill' );
//var AmazonSpeech = require('ssml-builder/amazon_speech');
 


app.launch( function( request, response ) {
	response.say( 'Welcome to your test skill' ).reprompt( 'Way to go. You got it to run. Bad ass.' ).shouldEndSession( false );
} );


app.error = function( exception, request, response ) {
	console.log(exception)
	console.log(request);
	console.log(response);	
	response.say( 'Sorry an error occured ' + error.message);
};

app.intent('course_number',
  {
    "slots":{"COURSE":"COURSE"}
	,"utterances":[ 
                        "tell me the number of {COURSE}",
                        "what's the number of {COURSE}"
                  ]
  },
  function(request,response) {
    var course = this.event.request.intent.slots.name.value;
    
   /* var speech = new AmazonSpeech()
	  .say('Hi')
	  .pause('1s')
	  .whisper('the number you want is')
	  .pause('500ms')
	  .say(course.value);
	 */
	//var speechOutput = speech.ssml();
	response.say("hi "+course);
  }
);

app.customSlot('COURSE',[
                        {
                            id: "dsl",
                            value: "PS Domain Specific Language",
                            synonyms: [
                                    "domain specific language",
                                    "DSL"
                                ]
                        },
                        {
							value: "PS Compiler Construction",
                            synonyms: [
                                    "compiler construction"
                                ]
                        },
                        {
                            id: "OC",
							value: "SL Online Communication",
                            synonyms: [
                                   "oc seminar",
                                    "online communication"
                                ]
                        }
                    ]);

module.exports = app;
