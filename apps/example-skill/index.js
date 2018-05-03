module.change_code = 1;
"use strict";

var alexa = require("alexa-app");
var app = new alexa.app("lfu");
var AmazonSpeech = require("ssml-builder/amazon_speech");
var sync = require("sync-request");
var stringSimilarity = require("string-similarity");

var host = "http://lfu.waldboth.com";

// Get Information from Our Server Functions

/**
 * @brie Gets Course Information from the Server for the course with the given number
 *
 * @param number The number of the course
 *
 * @return null if a parse error occurs,
 *          the json object with the error message if the request got no result,
 *          the json_ld object of the desired course
 */
function getCourseByNumber(number)
{
    var httpReq = sync("GET",host+"/wp-json/alexa/v1/course/name/"+number);
    try {
        return JSON.parse(httpReq.getBody());
    } catch (e) {
        console.log("Parse error: " + e.message);
        return null;
    }
    return null;
}

/**
 * @brief Finds the custom slot element that matches best with the given input
 *
 * @param name the user said course
 * @return the custom slot item of the course with the best match,
 *          null if best match below 80%,
 *          2 slot items if they have identical match rating (f.e.: compiler construction will return PS Compiler Construction and VO Compiler Construction)
 */
function getCourseSlotByInput(name)
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
    {
        if(max <= 0.8 )
            return null;
        else
            return cs[maxIndex];
    }
    else
        return [cs[maxIndex],cs[secondIndex]];

}

/**
 * @brief combining getCourseByNumber & getCourseSlotByInput to get course information from user input
 *
 * @param course user input
 * @param request
 * @param response
 * @return {null}
 */
function loadCourse(course, request, response)
{
    var full_course = getCourseSlotByInput(course);
    console.log(full_course);
    if(full_course==null)
    {
        var speech = new AmazonSpeech().say("Could not find course " + course);
        response.say(speech.ssml());
        return null;
    } else if(Array.isArray(full_course)){
        var speech = new AmazonSpeech().say("Did you mean " + full_course[0].value + " or " + full_course[1].value + "?");
        request.getSession().set("c0", full_course[0]);
        request.getSession().set("c1", full_course[1]);
        response.say(speech.ssml()).shouldEndSession(false);
        return null;
    } else {
        var course_information = getCourseByNumber(full_course.id);
        if(course_information == null || course_information.data )
        {
            var speech = new AmazonSpeech().say("Could not load course data for " + full_course.value + " from " + host);
            response.say(speech.ssml());
            return null;
        } else
            return course_information;
    }
}

/**
 * @brief Gets all available courses from the Server
 *
 * @return all available courses from the Server,
 *          null if error occurs, should not happen
 */
function getAllCourses(request, response)
{
    var httpReq = sync("GET",host+"/wp-json/alexa/v1/courses/all");
    try {
        var courses = JSON.parse(httpReq.getBody());
        return courses.itemListElement;
    } catch (e) {
        console.log("Parse error: " + e.message);
        var speech = new AmazonSpeech().say("Error on getting courses from Server");
        response.say(speech.ssml());
        return null;
    }
}

// Custom Intents

function course_number(request, response) {
    request.getSession().set("intent", "course_number");
    var course = request.slot("COURSE");
    var full_course = getCourseSlotByInput(course);
    if(full_course==null)
    {
        var speech = new AmazonSpeech().say("Could not find course " + course);
        response.say(speech.ssml());
    } else if(Array.isArray(full_course)){
        var speech = new AmazonSpeech().say("Did you mean " + full_course[0].value + " or " + full_course[1].value + "?");
        response.say(speech.ssml()).shouldEndSession(false);
        request.getSession().set("end","true");
    } else {
        var speech = new AmazonSpeech().say("The number of " + full_course.value + " is: ").pause("500ms").sayAs({
            word: full_course.id,
            interpret: "digits"
        });
        response.say(speech.ssml());
    }
}

function instructor_of(request, response) {
    request.getSession().set("intent", "instructor_of");
    var course = request.slot("COURSE");
    course = loadCourse(course,request,response);
    if(course == null)
        return;
    if (Array.isArray(course.author)) {
        var speech = new AmazonSpeech().say("The instructors of " + course.name + " are: ");
        for(var i=0;i<course.author.length -1 ;i++)
            speech.say(course.author[i]).pause("500ms");
        speech.say(" and "+ course.author.length -1);
        response.say(speech.ssml());
    } else {
        var speech = new AmazonSpeech().say("The instructor of " + course.name + " is: " + course.author);
        response.say(speech.ssml());
    }
}

function course_detail(request, response) {
    request.getSession().set("intent", "course_detail");
    var course = request.slot("COURSE");
    course = loadCourse(course,request,response);
    if(course == null)
        return;
    if(course.description == null) {
        var speech = new AmazonSpeech().say(course.name + " has no description.");
        response.say(speech.ssml());
    } else {
        var speech = new AmazonSpeech().say(course.name + ": ").pause("500ms").say(course.description);
        response.say(speech.ssml());
    }
}

function available_courses(request, response) {
    request.getSession().set("intent", "available_courses");
    var speechOutput;
    var courses = getAllCourses(request, response);
    if(courses==null)
        return;

    var l = courses.length;
    var speech = new AmazonSpeech().say("There " + ((l == 1)?
            "is " + l + " course ":
            "are " + l + " courses "
    ) + "available:").pause("1s");
    for(var i = 0; i < l;i++)
        speech.say(courses[i].item.name).pause("500ms");
    speechOutput = speech.ssml();


    response.say(speechOutput);
}

app.intent("response", {
        "slots": {
            "COURSE": "COURSE"
        },
        "utterances": [
            "{COURSE}",
            "no thank you",
            "no",
            "goodbye",

        ]
    },
    function(request, response) {
        var course = request.slot("COURSE");
        request.getSession().clear("c0");
        request.getSession().clear("c1");
        request.getSession().clear("intent");
        if(course == "no" || course == "no thank you" || course == "goodbye") {
            request.getSession().set("end","true");
        }
        switch(request.getSession().get("intent")) {
            case "course_number":
                course_number(request,response);
                break;
            case "instructor_of":
                instructor_of(request,response);
                break;
            case "course_detail":
                course_detail(request,response);
                break;
            case "available_courses":
                available_courses(request,response);
                break;
        }
    }
);

app.intent("course_number", {
        "slots": {
            "COURSE": "COURSE"
        },
        "utterances": [
            "{what is | what's | tell me} the number {of | for} {COURSE}",
            "for the number {of | for} {COURSE}",
            "the number {of | for} {COURSE}"

        ]
    },course_number
);

app.intent("instructor_of", {
        "slots": {
            "COURSE": "COURSE"
        },
        "utterances": [
            "{what is | what's | tell me} the {instructor | author | teacher | professor | prof} of {COURSE}",
            "for the {instructor | author | teacher | professor | prof} of {COURSE}",
            "who {holds | leads} the course {COURSE}",
            "who {holds | leads} {COURSE}"
        ]
    }, instructor_of
);

app.intent("course_detail", {
        "slots": {
            "COURSE": "COURSE"
        },
        "utterances": [
            "for {details | information | the description} about {COURSE}",
            "tell me {details | information | the description} about {COURSE}",
            "{what is | what's} {COURSE} about"
        ]
    }, course_detail
);


app.intent("available_courses", {
        "utterances": [
            "for the available courses",
            "for all the courses",
            "tell me all available courses",
            "what courses are available"
        ]
    }, available_courses
);
//Alexa app intents

app.launch(function(request, response) {
    response.say("Welcome to the Alexa lfu-online").shouldEndSession(false);
});

app.intent("AMAZON.HelpIntent", {
        "slots": {},
        "utterances": []
    },
    function(request, response) {
        var helpOutput = "You can ask information about courses.";
        var reprompt = "What would you like to ask?";
        response.say(helpOutput).reprompt(reprompt).shouldEndSession(false);
    }
);

app.intent("AMAZON.StopIntent", {
        "slots": {},
        "utterances": []
    }, function(request, response) {
        var stopOutput = "Goodbye";
        response.say(stopOutput);
    }
);

app.intent("AMAZON.CancelIntent", {
        "slots": {},
        "utterances": []
    }, function(request, response) {
        var cancelOutput = "No problem. Request cancelled.";
        response.say(cancelOutput);
    }
);

app.error = function(exception, request, response) {
    console.log(exception)
    console.log(request);
    console.log(response);
    response.say("Sorry an error occured " + error.message);
};

app.post = function(request, response, type, exception) {
    if(request.getSession().get("end") == "true") {
        var stopOutput = "Goodbye";
        response.say(stopOutput);
        return;
    }
    switch(Math.floor(Math.random() * 3))
    {
        case 0:
            response.say("<break time='500ms'/>Something else?").shouldEndSession(false);
            break;
        case 1:
            response.say("<break time='500ms'/>Wanna ask more?").shouldEndSession(false);
            break;
        case 2:
            response.say("<break time='500ms'/>Need more information?").shouldEndSession(false);
            break;
        default:
            response.say("<break time='500ms'/>How can i continue to help?").shouldEndSession(false);
            break;
    }
};



// Custom slots

app.customSlot("COURSE", [
    {
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
            "oc",
            "the coolest seminar",
            "the most interesting seminar"
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
    },
    {
        id: "703655",
        value: "PS Semantic Web Services",
        synonyms: [
            "ps semantic web services",
            "proseminar semantic web services",
            "semantic web services ps",
            "semantic web services proseminar",
            "semantic web services",
            "semantic web",
            "semantic web ps",
            "semantic web proseminar",
            "ps semantic web",
            "proseminar semantic web"
        ]
    },
    {
        id: "703654",
        value: "VO Semantic Web Services",
        synonyms: [
            "vo semantic web services",
            "lecture semantic web services",
            "semantic web services vo",
            "semantic web services lecture",
            "semantic web services",
            "semantic web",
            "semantic web vo",
            "semantic web lecture",
            "vo semantic web",
            "lecture semantic web"
        ]
    },
    {
        id: "703649",
        value: "PS New Database Models",
        synonyms: [
            "ps new database models",
            "proseminar new database models",
            "new database models ps",
            "new database models proseminar",
            "database models ps",
            "database models proseminar",
            "ps database models",
            "proseminar database models",
            "database models"
        ]
    },
    {
        id: "703648",
        value: "VO New Database Models",
        synonyms: [
            "vo new database models",
            "lecture new database models",
            "new database models vo",
            "new database models lecture",
            "database models vo",
            "database models lecture",
            "vo database models",
            "lecture database models",
            "database models"
        ]
    },
    {
        id: "703646",
        value: "VO Network Security",
        synonyms: [
            "lecture Network Security",
            "Network Security lecture",
            "Network Security vo",
            "vo Network Security",
            "Network Security"
        ]
    },
    {
        id: "703647",
        value: "PS Network Security",
        synonyms: [
            "ps Network Security",
            "Network Security ps",
            "Network Security proseminar",
            "proseminar Network Security",
            "Network Security"
        ]
    },
    {
        id: "703632",
        value: "VO Advanced Concepts and Techniques in Software Quality",
        synonyms: [
            "VO Advanced Concepts and Techniques in Software Quality",
            "lecture Advanced Concepts and Techniques in Software Qualitys",
            "VO Advanced Software Quality",
            "lecture Advanced Software Quality",
            "Advanced Software Quality VO",
            "Advanced Software Quality lecture",
            "Advanced Concepts and Techniques in Software Qualitys VO",
            "Advanced Concepts and Techniques in Software Qualitys lecture",
            "Advanced Concepts and Techniques in Software Qualitys",
            "Advanced Software Quality",
        ]
    }

    //TODO add elective modules
]);

module.exports = app;
