module.change_code = 1;
'use strict';

var alexa = require('alexa-app');
var app = new alexa.app('example-skill');
var AmazonSpeech = require('ssml-builder/amazon_speech');
var http = require("http");
var sync = require("sync-request");


var host = "http://lfu.waldboth.com";


app.launch(function(request, response) {
    response.say('Welcome to the Alexa lfu-online').shouldEndSession(false);
});


app.error = function(exception, request, response) {
    console.log(exception)
    console.log(request);
    console.log(response);
    response.say('Sorry an error occured ' + error.message);
};

app.intent('course_number', {
        "slots": {
            "COURSE": "COURSE"
        },
        "utterances": [
            "tell me the number of {COURSE}",
            "what's the number of {COURSE}"
        ]
    },
    function(request, response) {
        var course = request.slot("COURSE");

        response.say(request);
     //   var cs = app.customSlots.COURSE;
     //   forEach()
    }
);

app.intent('what_course', {
        "utterances": [
            "tell me all availale courses",
            "what courses are available"
        ]
    },
    function(request, response) {
        var speechOutput;
		var httpReq = sync("GET",host+"/wp-json/alexa/v1/courses/all");
		try {
			var courses = JSON.parse(httpReq.getBody());
			courses = courses.itemListElement;
			var l = courses.length;
			var speech = new AmazonSpeech().say('There ' + ((l == 1)?
															'is ' + l + ' course ':
															'are ' + l + ' courses '
															) + 'available:').pause('1s');
			for(var i = 0; i < l;i++)
				speech.say(courses[i].item.name).pause('500ms');
			speechOutput = speech.ssml();
		} catch (e) {
			console.error('Parse error: ' + e.message);
			var speech = new AmazonSpeech().say('Parse error: ' + e.message);
			speechOutput = speech.ssml();
		}						

		response.say(speechOutput);
		console.log("\n\nENDE:\n");
		console.log(speechOutput);
	}
);

app.customSlot('COURSE', [{
        id: "703601",
        value: "VO Compiler Construction",
        synonyms: [
            "compiler onstruction lecture",
            "compiler onstruction",
            "compiler lecture",
            "lecture compiler construction",
            "lecture compiler"
        ]
    },
    {
        id: "703602",
        value: "PS Compiler Construction",
        synonyms: [
            "compiler construction proseminar",
            "compiler construction",
            "compiler proseminar",
            "proseminar compiler ",
            "proseminar compiler construction",
            "compiler construction ps",
            "ps compiler construction"
        ]
    },
    {
        id: "703606",
        value: "SE Master's Seminar 2",
        synonyms: [
            "master seminar 2",
            "master's seminar 2",
            "seminar master's seminar 2",
            "seminar master seminar 2"
        ]
    },
    {
        id: "702878",
        value: "VU Weiterführende Fachkompetenzen 2: Probalistic analysis of algorithms",
        synonyms: [
            "probalistic analysis",
            "vu probalistic analysis",
            "probalistic analysis of algorithms",
            "vu probalistic analysis of algorithms"
        ]
    },
    {
        id: "703756",
        value: "PS Domain-specific Language Engineering",
        synonyms: [
            "domain specific languages proseminar",
            "domain specific languages ps",
            "proseminar domain specific languages",
            "ps domain specific languages",
            "domain specific languages",
            "dsl",
            "ps dsl",
            "proseminar dsl"
        ]
    },
    {
        id: "703800",
        value: "VO Computer Haptics",
        synonyms: [
            "computer haptics lecture",
            "lecture computer haptics",
            "computer haptics",
            "haptics lecture",
            "lecture haptics"
        ]
    },
    {
        id: "703801",
        value: "PS Computer Haptics",
        synonyms: [
            "computer haptics proseminar",
            "computer haptics ps",
            "proseminar computer haptics",
            "ps computer haptics",
            "computer haptics",
            "haptics proseminar",
            "haptics ps",
            "proseminar haptics",
            "ps haptics"
        ]
    },
    {
        id: "703815",
        value: "SE Online Communication",
        synonyms: [
            "online communication seminar",
            "online communication",
            "proseminar online communication",
            "oc seminar",
            "seminar oc",
            "oc"
        ]
    },
    {
        id: "703819",
        value: "VO Machine Learning for Theorem Proving",
        synonyms: [
            "lecture Machine Learning for Theorem Proving",
            "Machine Learning for Theorem Proving lecture",
            "theorem proving lecture",
            "theorem proving",
            "lecture theorem proving",
            "Machine Learning for Theorem Proving"
        ]
    }

    //TODO add elective modules
]);

module.exports = app;
