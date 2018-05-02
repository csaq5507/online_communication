module.change_code = 1;
'use strict';

var alexa = require('alexa-app');
var app = new alexa.app('example-skill');
var AmazonSpeech = require('ssml-builder/amazon_speech');
var sync = require("sync-request");
var stringSimilarity = require('string-similarity');

var host = "http://lfu.waldboth.com";

function getCourseByNumber(number)
{
    var httpReq = sync("GET",host+"/wp-json/alexa/v1/course/name/"+number);
    try {
        var courses = JSON.parse(httpReq.getBody());
        return courses;
    } catch (e) {
        console.log('Parse error: ' + e.message);
        return null;
    }
    return null;
}


function getCourse(name)
{
    var cs = app.customSlots.COURSE;
    var max = 0;
    var maxIndex = 0;
    var secondIndex = -1;
    for(var i=0;i<cs.length;i++)
    {
        var matches = stringSimilarity.findBestMatch(name, cs[i].synonyms);
        if(matches.bestMatch.rating > max)
        {
            max = matches.bestMatch.rating;
            maxIndex = i;
        } else if(matches.bestMatch.rating == max)
            secondIndex = i;
    }
    if(secondIndex == -1)
        return cs[maxIndex];
    else
        return [cs[maxIndex],cs[secondIndex]];

}


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
            "what is the number of {COURSE}",
            "for the number of {COURSE}",
            "tell me the number of {COURSE}",
            "what's the number of {COURSE}"
        ]
    },
    function(request, response) {
        var course = request.slot("COURSE");
        var full_course = getCourse(course);
        if(full_course==null)
        {
            var speech = new AmazonSpeech().say('Could not find course ' + course);
            response.say(speech.ssml());
        } else if(Array.isArray(full_course)){
            var speech = new AmazonSpeech().say('Did you mean ' + full_course[0].value + ' or ' + full_course[1].value + '?');
            response.say(speech.ssml());
        } else {
            var speech = new AmazonSpeech().say('The number of ' + full_course.value + ' is: ').pause('500ms').sayAs({
                word: full_course.id,
                interpret: "digits"
            });
            response.say(speech.ssml());
        }
    }
);

app.intent('instructor_of', {
        "slots": {
            "COURSE": "COURSE"
        },
        "utterances": [
            "what is the instructor of {COURSE}",
            "for the instructor of {COURSE}",
            "tell me the instructor of {COURSE}",
            "what's the instructor of {COURSE}",
            "what is the author of {COURSE}",
            "for the author of {COURSE}",
            "tell me the author of {COURSE}",
            "what's the author of {COURSE}",
            "what is the teacher of {COURSE}",
            "for the teacher of {COURSE}",
            "tell me the teacher of {COURSE}",
            "what's the teacher of {COURSE}",
            "what is the professor of {COURSE}",
            "for the professor of {COURSE}",
            "tell me the professor of {COURSE}",
            "what's the professor of {COURSE}",
            "what is the prof of {COURSE}",
            "for the prof of {COURSE}",
            "tell me the prof of {COURSE}",
            "what's the prof of {COURSE}",
            "who holds course {COURSE}",
            "who leads course {COURSE}"
        ]
    },
    function(request, response) {
        var course = request.slot("COURSE");
        var full_course = getCourse(course);
        console.log(full_course);
        if(full_course==null)
        {
            var speech = new AmazonSpeech().say('Could not find course ' + course);
            response.say(speech.ssml());
        } else if(Array.isArray(full_course)){
            var speech = new AmazonSpeech().say('Did you mean ' + full_course[0].value + ' or ' + full_course[1].value + '?');
            response.say(speech.ssml());
        } else {
            var course_information = getCourseByNumber(full_course.id);
            console.log(course_information);
            if(course_information == null || course_information.data)
            {
                var speech = new AmazonSpeech().say('Could not load course data for ' + full_course.value + ' from ' + host);
                response.say(speech.ssml());
            } else
            {
                var speech = new AmazonSpeech().say('The instructor of ' + full_course.value + ' is: ' + course_information.author);
                response.say(speech.ssml());
            }
        }
    }
);

app.intent('available_courses', {
        "utterances": [
            "for the available courses",
            "for all the courses",
            "tell me all available courses",
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
			console.log('Parse error: ' + e.message);
			var speech = new AmazonSpeech().say('Parse error: ' + e.message);
			speechOutput = speech.ssml();
		}						

		response.say(speechOutput);
	}
);

app.customSlot('COURSE', [{
        id: "703601",
        value: "VO Compiler Construction",
        synonyms: [
            "compiler onstruction lecture",
            "compiler onstruction vo",
            "compiler onstruction",
            "compiler lecture",
            "compiler vo",
            "lecture compiler construction",
            "vo compiler construction",
            "lecture compiler",
            "vo compiler"
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
            "computer haptics vo",
            "lecture computer haptics",
            "vo computer haptics",
            "computer haptics",
            "haptics lecture",
            "lecture haptics",
            "haptics vo",
            "vo haptics"
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
            "Machine Learning for Theorem Proving vo",
            "vo Machine Learning for Theorem Proving",
            "theorem proving lecture",
            "theorem proving",
            "vo theorem proving",
            "theorem proving vo",
            "lecture theorem proving",
            "Machine Learning for Theorem Proving"
        ]
    }

    //TODO add elective modules
]);

module.exports = app;
