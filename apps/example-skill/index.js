module.change_code = 1;
"use strict";

var alexa = require("alexa-app");
var app = new alexa.app("lfu");
var AmazonSpeech = require("ssml-builder/amazon_speech");
var sync = require("sync-request");
var stringSimilarity = require("string-similarity");

var host = "http://lfu.waldboth.com";

var my_courses_url = "/wp-json/alexa/v1/courses/my_registrations"; //email and pw
var all_courses_url = "/wp-json/alexa/v1/courses/all";
var course_url = "/wp-json/alexa/v1/course/name/"; //course number in url
var grade_url = "/wp-json/alexa/v1/grade"; //email password and course
var email = "ivan.waldboth@student.uibk.ac.at";
var password = "online_communication@18";

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
    var httpReq = sync("GET", host + course_url + number);
    try {
        return JSON.parse(httpReq.getBody());
    } catch (e) {
        console.log("Parse error: " + e.message);
        return null;
    }
    return null;
}

/**
 * @brie Gets all courses from the Server
 *
 *
 * @return null if a parse error occurs,
 *          the json object with the error message if the request got no result,
 *          the json_ld object of the desired course
 */
function getAllCourses()
{
    var httpReq = sync("GET",host + all_courses_url);
    try {
        var courses = JSON.parse(httpReq.getBody());
        return courses.itemListElement;
    } catch (e) {
        console.log("Parse error: " + e.message);
        return null;
    }
}

/**
 * @brie Gets courses where user is registrated
 *
 *
 * @return null if a parse error occurs,
 *          the json object with the error message if the request got no result,
 *          the json_ld object of the desired course
 */
function getMyCourses()
{
    try {
        var httpReq = sync("GET", host + my_courses_url + "?email=" + email + "&password=" + password);
        if(httpReq.statusCode == 200)
            return JSON.parse(httpReq.getBody());
        else if(httpReq.statusCode > 300)
            return httpReq.body.toString();
        else
            console.log("Error on request:"+httpReq.statusCode);

    } catch (e) {
        console.log("Parse error: " + e.message);
        return null;
    }
    return null;
}

/**
 * @brie Gets a the course where user is registered and has a grade given the course number
 *
 * @param number The number of the course
 *
 * @return null if a parse error occurs,
 *          the json object with the error message if the request got no result,
 *          the json_ld object of the desired course
 */
function getCourseWithMark(number,request,response)
{
    try {
        var httpReq = sync("GET", host + grade_url + "?email=" + email + "&password=" + password + "&course=" + number);
        if(httpReq.statusCode == 200)
            return JSON.parse(httpReq.getBody());
        else if(httpReq.statusCode > 300)
            return httpReq.body.toString();
        else
            console.log("Error on request:"+httpReq.statusCode+"\n"+httpReq.getBody());
    } catch (e) {
        console.log("Parse error: " + e.message);
    }
    return null;
}

//////////////////////////////////


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
    console.log(name);
    console.log("\n\n\n");
    for(var i=0;i<cs.length;i++)
    {
        var matches = stringSimilarity.findBestMatch(name, cs[i].synonyms);
        console.log(matches.bestMatch);
        if(matches.bestMatch.rating < 0.5)
            continue;
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
    if(full_course==null)
    {
        var speech = new AmazonSpeech().say("Could not find course " + course);
        response.say(speech.ssml());
        return null;
    } else if(Array.isArray(full_course))
        return decide(full_course,request,response);
    else {
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




function response(request, response) {
    var resp = request.slot("COURSE");
    if(resp == "no" || resp == "no thank you" || resp == "goodbye") return;
    var intent=request.getSession().get("intent");
    request.getSession().clear("intent");
    switch(intent) {
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
        case "my_mark":
            my_mark(request,response);
            break;
        case "course_schedule":
            course_schedule2(request,response);
            break;
        default:
            course_detail(request,response);
            break;
    }
}
app.intent("response", {
        "slots": {
            "COURSE": "COURSE"
        },
        "utterances": [
            "{COURSE}",
            "and {COURSE}",
            "what's about {COURSE}",
            "no thank you",
            "no",
            "goodbye",
            "add them to my calendar",
            "want to hear them all"

        ]
    }, response
);


function course_number(request, response) {
    request.getSession().set("intent", "course_number");
    var course = request.slot("COURSE");
    var full_course = getCourseSlotByInput(course);
    if(full_course==null)
    {
        var speech = new AmazonSpeech().say("Could not find course " + course);
        response.say(speech.ssml());
    } else if(Array.isArray(full_course))
        return decide(full_course,request,response);
    else {
        var speech = new AmazonSpeech().say("The number of " + full_course.value + " is: ").pause("500ms").sayAs({
            word: full_course.id,
            interpret: "digits"
        });
        response.say(speech.ssml());
    }
    post(request,response);
}
app.intent("course_number", {
        "slots": {
            "COURSE": "COURSE"
        },
        "utterances": [
            "what is the number of {COURSE}",
            "what's the number of {COURSE}",
            "tell me the number of {COURSE}",
            "what is the number for {COURSE}",
            "what's the number for {COURSE}",
            "tell me the number for {COURSE}",
            "for the number of {COURSE}",
            "for the number for {COURSE}",
            "the number for {COURSE}",
            "the number of {COURSE}"

        ]
    },course_number
);

function available_courses(request, response) {
    request.getSession().set("intent", "available_courses");
    var speechOutput;
    var courses = getAllCourses();
    if(courses==null)
    {
        var speech = new AmazonSpeech().say("Could not load course data from " + host);
        response.say(speech.ssml());
        post(request,response);
        return;
    }

    var l = courses.length;
    var speech = new AmazonSpeech().say("There " + ((l == 1)?
            "is " + l + " course ":
            "are " + l + " courses "
    ) + "available:").pause("1s");
    for(var i = 0; i < l;i++)
        speech.say(courses[i].item.name).pause("500ms");
    speechOutput = speech.ssml();
    response.say(speechOutput);
    post(request,response);
}
app.intent("available_courses", {
        "utterances": [
            "for the available courses",
            "for all the courses",
            "tell me all available courses",
            "what courses are available",
            "which courses are available",
            "for all courses",
            "tell me all courses"
        ]
    }, available_courses
);

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
app.intent("instructor_of", {
        "slots": {
            "COURSE": "COURSE"
        },
        "utterances": [
            "what is the author of {COURSE}",
            "what is the instructor of {COURSE}",
            "what is the teacher of {COURSE}",
            "what is the professor of {COURSE}",
            "what's the instructor of {COURSE}",
            "what's the author of {COURSE}",
            "what's the teacher of {COURSE}",
            "what's the professor of {COURSE}",
            "tell me the instructor of {COURSE}",
            "tell me the author of {COURSE}",
            "tell me the teacher of {COURSE}",
            "tell me the professor of {COURSE}",
            "for the instructor of {COURSE}",
            "for the author of {COURSE}",
            "for the teacher of {COURSE}",
            "for the professor of {COURSE}",
            "who holds the course {COURSE}",
            "who leads the course {COURSE}",
            "who holds {COURSE}",
            "who leads {COURSE}"
        ]
    }, instructor_of
);

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
    post(request,response);

}
app.intent("course_detail", {
        "slots": {
            "COURSE": "COURSE"
        },
        "utterances": [
            "for the description about {COURSE}",
            "for information about {COURSE}",
            "for details about {COURSE}",
            "for the description of {COURSE}",
            "for information of {COURSE}",
            "for details of {COURSE}",
            "for the description for {COURSE}",
            "for information for {COURSE}",
            "for details for {COURSE}",
            "tell me the description about {COURSE}",
            "tell me information about {COURSE}",
            "tell me details about {COURSE}",
            "tell me the description of {COURSE}",
            "tell me information of {COURSE}",
            "tell me details of {COURSE}",
            "tell me the description for {COURSE}",
            "tell me information for {COURSE}",
            "tell me details for {COURSE}",
            "what is {COURSE} about",
            "what's {COURSE} about"
        ]
    }, course_detail
);

function my_mark(request, response) {
    request.getSession().set("intent", "my_mark");
    var course = request.slot("COURSE");
    course = getCourseSlotByInput(course);
    if(course==null)
    {
        var speech = new AmazonSpeech().say("Could not find course " + course);
        response.say(speech.ssml());
        return null;
    } else if(Array.isArray(course))
        return decide(course,request,response);
     else {
        var mark = getCourseWithMark(course.id, request, response);
        if (mark == null) {
            var speech = new AmazonSpeech().say("There was a error with the request");
            response.say(speech.ssml());
        } else if(mark.educationalCredentialAwarded == null) {
            var speech = new AmazonSpeech().say("You have no mark for "+ course.value);
            response.say(speech.ssml());
        } else
        {
            switch (parseInt(mark.educationalCredentialAwarded)){
                case 1:
                    var speech = new AmazonSpeech().say("Congratulations, you got the mark 1");
                    response.say(speech.ssml());
                    break;
                case 2:
                    var speech = new AmazonSpeech().say("You did pretty well, you got the mark 2");
                    response.say(speech.ssml());
                    break;
                case 3:
                    var speech = new AmazonSpeech().say("Not bad,you got a 3");
                    response.say(speech.ssml());
                    break;
                case 4:
                    var speech = new AmazonSpeech().say("At least you passed, 4");
                    response.say(speech.ssml());
                    break;
                case 5:
                    var speech = new AmazonSpeech().say("I'm sorry, it's a 5. Maybe next time.");
                    response.say(speech.ssml());
                    break;
                default:
                    var speech = new AmazonSpeech().say("No mark yet.");
                    response.say(speech.ssml());
                    break;
            }
        }
    }

    post(request,response);
}
app.intent("my_mark", {
        "slots": {
            "COURSE": "COURSE"
        },
        "utterances": [
            "for my grade in {COURSE}",
            "for my mark in {COURSE}",
            "tell me my grade in {COURSE}",
            "what is my mark in {COURSE}",
            "what's my grade  in {COURSE}",
            "tell me my mark in {COURSE}",
            "what is my grade in {COURSE}",
            "what's my mark in {COURSE}",
            "what did i got in {COURSE}"
        ]
    }, my_mark
);

function my_course(request, response){
    request.getSession().set("intent", "my_course");
    var courses = getMyCourses();
    if(courses==null)
    {
        var speech = new AmazonSpeech().say("There ws a error with the request");
        response.say(speech.ssml());
    } else if(Array.isArray(courses.itemListElement))
    {
        var l = courses.itemListElement.length;
        courses = courses.itemListElement;
        var speech = new AmazonSpeech().say("You are enrolled to " + ((l == 1)?
                l + " course ":
                l + " courses "
        ) + ":").pause("1s");
        for(var i = 0; i < l;i++)
            speech.say(courses[i].item.name).pause("500ms");
        response.say(speech.ssml());
    }
    post(request,response);
}
app.intent("my_course", {
        "utterances": [
            "for my courses",
            "for the courses I am registered",
            "for the courses I'm registered",
            "tell me my courses",
            "list my courses",
            "what are my courses"
        ]
    }, my_course
);

function course_schedule2(request, response){
    request.getSession().set("intent", "course_schedule");
    var course = request.getSession().get("course");
    course = loadCourse(course,request,response);
    if(course == null)
        return;
    if(course.hasCourseInstance == null) {
        var speech = new AmazonSpeech().say(course.name + " has no appointments.");
        response.say(speech.ssml());
    } else {
        var len = course.hasCourseInstance.length;
        console.log(request);
    }
    post(request,response);
}

function course_schedule(request, response){
    request.getSession().set("intent", "course_schedule");
    var course = request.slot("COURSE");
    course = loadCourse(course,request,response);
    if(course == null)
        return;
    if(course.hasCourseInstance == null) {
        var speech = new AmazonSpeech().say(course.name + " has no appointments.");
        response.say(speech.ssml());
    } else {
        var len = course.hasCourseInstance.length;
        var speech = new AmazonSpeech().say(course.name + " has " + len + " appointments starting on ").sayAs({
            word: course.hasCourseInstance[0].startDate,
            interpret: "date"
        }).say(" and goes until ").sayAs({
            word: course.hasCourseInstance[len-1].startDate,
            interpret: "date"
        }).pause("500ms").say("Do you want to hear all appointments or add them to your calendar?");
        response.say(speech.ssml());
        request.getSession().set("course", course.name);

    }
    post(request,response);
}
app.intent("course_schedule", {
    "slots": {
        "COURSE": "COURSE"
    },
        "utterances": [
            "tell me the schedule of {COURSE}",
            "for the schedule of {COURSE}",
            "when does the course {COURSE} take place?",
            "when does {COURSE} take place?",
            "when are the appointments for {COURSE}",
            "when is the course {COURSE}"
        ]
    }, course_schedule
);




//////////////////////////////////////////////////////////////////
//Alexa app default intents///////////////////////////////////////

app.launch(function(request, response) {
    var speech = new AmazonSpeech().say("Welcome to the Alexa ").spell("lfu").say(" online");
    response.say(speech.ssml()).shouldEndSession(false);
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
    console.log(request.data.request.intent);
    console.log(response);
    response.say("Sorry an error occured " + exception);
};

function post(request, response) {
    switch(Math.floor(Math.random() * 3))
    {
        case 0:
            response.reprompt("<break time='500ms'/>Something else?").shouldEndSession(false);
            break;
        case 1:
            response.reprompt("<break time='500ms'/>Wanna ask more?").shouldEndSession(false);
            break;
        case 2:
            response.reprompt("<break time='500ms'/>Need more information?").shouldEndSession(false);
            break;
        default:
            response.reprompt("<break time='500ms'/>How can i continue to help?").shouldEndSession(false);
            break;
    }
}

function decide(course,request,response){
    var speech = new AmazonSpeech().say("Did you mean " + course[0].value + " or " + course[1].value + "?");
    request.getSession().set("c0", course[0]);
    request.getSession().set("c1", course[1]);
    response.say(speech.ssml()).shouldEndSession(false);
    return null;
}

// Custom slots

app.customSlot("COURSE", [
    {
        id: "703601",
        value: "VO Compiler Construction",
        synonyms: [
            "compiler construction lecture",
            "compiler construction vo",
            "compiler construction",
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

]);

module.exports = app;
