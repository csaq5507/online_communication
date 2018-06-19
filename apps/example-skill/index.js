module.change_code = 1;
"use strict";

///////////////////// REQUIREMENTS /////////////////////

var alexa = require("alexa-app");
var app = new alexa.app("lfu");
var AmazonSpeech = require("ssml-builder/amazon_speech");
var sync = require("sync-request");
var stringSimilarity = require("string-similarity");


/////////////////////// CONSTANTS //////////////////////

	var host = "http://lfu.waldboth.com";

	var my_courses_url = "/wp-json/alexa/v2/courses/my_registrations"; //email and pw
	var all_courses_url = "/wp-json/alexa/v2/courses/all";
	var course_url = "/wp-json/alexa/v2/course/name/"; //course number in url
	var grade_url = "/wp-json/alexa/v2/grade"; //email password and course
var enroll_url = "/wp-json/alexa/v2/enrol"; //email password and content json-ld

var INTENTS = {
	NUM : {value : 0, name : "course_number"},
	AVAIL : {value : 1, name : "available_courses"},
	INSTRUCTOR : {value : 2, name : "instructor_of"},
	DETAIL : {value : 3, name : "course_detail"},
	MARK : {value : 4, name : "my_mark"},
	MY_COURSE : {value : 5, name : "my_course"},
	SCHEDULE : {value : 6, name : "course_schedule"},
	FULL_SCHEDULE : {value : 7, name : "list_schedule"},
	ENROLL : {value : 8, name : "enroll"}
};


/////////////////// USER CREDENTIALS ///////////////////

var email = "ivan.waldboth@student.uibk.ac.at";
var password = "online_communication@18";


/////////////////// HELPER FUNCTIONS ///////////////////

/**
 * @brief Finds the custom slot element that matches best with the given input
 *
 * @param name the user said course
 * @return the custom slot item of the course with the best match,
 *          null if best match below 80%,
 *          2 slot items if they have identical match rating (f.e.: compiler construction will return PS Compiler Construction and VO Compiler Construction)
 */
function getCourseSlotByInput(request, response) {
	try {
		var name = request.slot("COURSE");
		var cs = app.customSlots.COURSE;
		var max = 0;
		var maxIndex = 0;
		var secondIndex = -1;
		for (var i = 0; i < cs.length; i++) {
			var matches = stringSimilarity.findBestMatch(name, cs[i].synonyms);
			if (matches.bestMatch.rating < 0.5)
				continue;
			if (matches.bestMatch.rating > max) {
				max = matches.bestMatch.rating;
				maxIndex = i;
			} else if (matches.bestMatch.rating == max)
				secondIndex = i;
		}
		if (secondIndex == -1) {
			if (max <= 0.8) {
				var speech = new AmazonSpeech().say("Could not find course " + course);
				response.say(speech.ssml());
				return null;
			}
			else
				return cs[maxIndex];
		}
		else
			return decide([cs[maxIndex], cs[secondIndex]], request, response);
	} catch (e){
		var speech = new AmazonSpeech().say("Sorry, i didn't understand the course you are talking about");
		response.say(speech.ssml());
		return null;
	}

}

/**
 * @brief Check if myVar is a string
 *
 * @param myVar
 * @return {boolean}
 */
function isString(myVar) {
	return typeof myVar === 'string' || myVar instanceof String;
}

/**
 * @brief Lets alexa ask the user for the course if it's not sure witch course the user means
 *
 * @param course
 * @param request
 * @param response
 */
function decide(course, request, response) {
	var speech = new AmazonSpeech().say("Did you mean " + course[0].value + " or " + course[1].value + "?");
	request.getSession().set("c0", course[0]);
	request.getSession().set("c1", course[1]);
	response.say(speech.ssml()).shouldEndSession(false);
	return null;
}

/**
 * @brief combining getCourseByNumber & getCourseSlotByInput to get course information from user input
 *
 * @param course user input
 * @param request
 * @param response
 * @return {null}
 */
function loadCourse(request, response) {
	var full_course = getCourseSlotByInput(request, response);
	if (full_course != null) {
		var course_information = getCourseByNumber(full_course.id);
		if (course_information == null || course_information.data)
			return new AmazonSpeech().say("Could not load course data for " + full_course.value + " from " + host).ssml();
		else
			return course_information;
	}
}


/////////////// API CONNECTION FUNCTIONS ///////////////

/**
 * @brief Parse a http response Object from the API
 *
 * @param httpReq Response Object
 * @return string error message if error occurs, Json Object otherwise
 */
function parseResponse(httpReq) {
	try {
		if (httpReq.statusCode == 200)
			return JSON.parse(httpReq.body.toString("utf8"));
		else if (httpReq.statusCode > 300)
			return new AmazonSpeech().say(JSON.parse(httpReq.body.toString("utf8")).message).ssml();
		else
			return new AmazonSpeech().say("Error on request with status code: " + httpReq.statusCode + "\nResponse: " + httpReq.body.toString("utf8")).ssml();
	} catch (e) {
		return new AmazonSpeech().say("Error occured: " + e.message).ssml();
	}
}

/**
 * @brief Gets Course Information from the Server for the course with the given number
 *
 * @param number The number of the course
 *
 * @return string error message if error occurs, course otherwise
 */
function getCourseByNumber(number) {
	return parseResponse(sync("POST", host + course_url + number));
}

/** @brief Gets all courses from the Server
 *
 *
 * @return string error message if error occurs, list with all courses otherwise
 */
function getAllCourses() {
	return parseResponse(sync("POST", host + all_courses_url));
}

/**
 * @brief Gets courses where user is registrated
 *
 *
 * @return string error message if error occurs, list with courses user is registered
 */
function getMyCourses() {
	var fd = new sync.FormData();
	fd.append("email", email);
	fd.append("password", password);
	return parseResponse(sync("POST", host + my_courses_url, {
		form : fd
	}));
}

/**
 * @brief Gets a the course where user is registered and has a grade given the course number
 *
 * @param number The number of the course
 *
 * @return string error message if error occurs, course with mark otherwise
 */
function getCourseWithMark(number) {
	var fd = new sync.FormData();
	fd.append('email', email);
	fd.append('password', password);
	fd.append('course', number);

	return parseResponse(sync("POST", host + grade_url, {
		form : fd,
	}));
}

/**
 * @brief Enroll for a course
 *
 * @param number The number of the course
 *
 * @return string error message if error occurs, success message otherwise
 */
function enrollCourse(number) {
	var fd = new sync.FormData();
	fd.append('email', email);
	fd.append('password', password);

	var jsonld = {
		"@context" : "//schema.org",
		"@type" : "Course",
		"courseCode" : number
	};
	fd.append('content', JSON.stringify(jsonld));

	return parseResponse(sync("POST", host + enroll_url, {
		form : fd,
	}));
}


/////////////////// INTENT FUNCTIONS ///////////////////

function response(request, response) {
	var intent = request.getSession().get("intent");
	request.getSession().clear("intent");
	switch (intent) {
		case INTENTS.NUM.name:
			course_number(request, response);
			break;
		case INTENTS.AVAIL.name:
			available_courses(request, response);
			break;
		case INTENTS.ENROLL.name:
			enroll(request, response);
			break;
		case INTENTS.SCHEDULE.name:
			course_schedule(request, response);
			break;
		case INTENTS.FULL_SCHEDULE.name:
			list_schedule(request, response);
			break;
		case INTENTS.MY_COURSE.name:
			my_course(request, response);
			break;
		case INTENTS.INSTRUCTOR.name:
			instructor_of(request, response);
			break;
		case INTENTS.DETAIL.name:
		default:
			course_detail(request, response);
			break;
	}
}

function course_number(request, response) {
	var full_course = getCourseSlotByInput(request, response);
	if (full_course != null) {
		var speech = new AmazonSpeech().say("The number of " + full_course.value + " is: ").pause("500ms").sayAs({
			word : full_course.id,
			interpret : "digits"
		});
		response.say(speech.ssml());
	}
}

function available_courses(request, response) {
	var courses = getAllCourses();
	if (isString(courses)) {
		response.say(courses);
		return;
	}
	if(courses.hasOwnProperty("itemListElement")) {
		courses=courses.itemListElement;
		var l = courses.length;
		var speech = new AmazonSpeech().say("There " + ((l == 1) ?
				"is " + l + " course " :
				"are " + l + " courses "
		) + "available:").pause("1s");
		for (var i = 0; i < l; i++)
			speech.say(courses[i].item.name).pause("500ms");
		response.say(speech.ssml());
	} else response.say(new AmazonSpeech().say("Something went wrong").ssml());
}

function instructor_of(request, response) {
	var course = loadCourse(request, response);
	if (isString(course))
		response.say(course);
	else if (Array.isArray(course.author)) {
		var speech = new AmazonSpeech().say("The instructors of " + course.name + " are: ");
		for (var i = 0; i < course.author.length - 1; i++)
			speech.say(course.author[i]).pause("500ms");
		speech.say(" and " + course.author.length - 1);
		response.say(speech.ssml());
	} else {
		var speech = new AmazonSpeech().say("The instructor of " + course.name + " is: " + course.author);
		response.say(speech.ssml());
	}
}

function course_detail(request, response) {
	var course = loadCourse(request, response);
	if (isString(course))
		response.say(course);
	else if (course.description == null) {
		var speech = new AmazonSpeech().say(course.name + " has no description.");
		response.say(speech.ssml());
	} else {
		var speech = new AmazonSpeech().say(course.name + ": ").pause("500ms").say(course.description);
		response.say(speech.ssml());
	}
}

function my_mark(request, response) {
	var course = getCourseSlotByInput(request, response);

	if (course != null) {
		var mark = getCourseWithMark(course.id);
		if (isString(mark))
			response.say(mark);
		else {
			switch (parseInt(mark.educationalCredentialAwarded)) {
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
}

function my_course(request, response) {
	var courses = getMyCourses();

	if (isString(courses))
		response.say(courses);
	else if (Array.isArray(courses.itemListElement)) {
		var length = courses.itemListElement.length;
		courses = courses.itemListElement;
		var speech = new AmazonSpeech().say("You are enrolled to " + ((length == 1) ?
				length + " course " :
				length + " courses "
		) + ":").pause("1s");
		for (var i = 0; i < length; i++)
			speech.say(courses[i].item.name).pause("500ms");
		response.say(speech.ssml());
	} else
		response.say(new AmazonSpeech().say("An error occured." + courses).pause("500ms").ssml());
}

function course_schedule(request, response) {
	var course = loadCourse(request, response);

	if (isString(course))
		response.say(course);
	if (course.hasCourseInstance == null) {
		var speech = new AmazonSpeech().say(course.name + " has no appointments.");
		response.say(speech.ssml());
	} else {
		var length = course.hasCourseInstance.length;
		var speech = new AmazonSpeech().say(course.name + " has " + length + " appointments starting on ").sayAs({
			word : course.hasCourseInstance[0].startDate,
			interpret : "date"
		}).say(" and goes until ").sayAs({
			word : course.hasCourseInstance[length - 1].startDate,
			interpret : "date"
		}).pause("500ms").say("Do you want to hear all appointments?");
		response.say(speech.ssml());
		request.getSession().set("course", course.name);
	}
}

function list_schedule(request, response) {
	var course = request.getSession().get("course");
	if (course == null) {
		var speech = new AmazonSpeech().say("Of witch course are we talking about?");
		response.say(speech.ssml()).shouldEndSession(false);
		return;
	}
	request.getSession().clear("course");
	request.slot = function () {
		return course;
	};
	course = loadCourse(request, response);
	if (isString(course))
		response.say(course);
	if (course.hasCourseInstance == null) {
		var speech = new AmazonSpeech().say(course.name + " has no appointments.");
		response.say(speech.ssml());
	} else {
		var len = course.hasCourseInstance.length;
		var speech = new AmazonSpeech().say(course.name + " has " + len + " appointments: ").pause("500ms");
		for (var i = 0; i < len; i++)
			speech.sayAs({
				word : course.hasCourseInstance[i].startDate,
				interpret : "date"
			}).say(" in Room ").spell(course.hasCourseInstance[i].location).pause("200ms");
		response.say(speech.ssml());
	}
}

function enroll(request, response) {
	var course = getCourseSlotByInput(request, response);
	if (course != null)
		response.say(enrollCourse(course.id));
}


/////////////////////// INTENTS ////////////////////////

app.intent("response", {
	"slots" : {
		"COURSE" : "COURSE"
	},
	"utterances" : [
		"{COURSE}",
		"and {COURSE}",
		"what's about {COURSE}"
	]
}, response);

app.intent("course_number", {
	"slots" : {
		"COURSE" : "COURSE"
	},
	"utterances" : [
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
}, course_number);

app.intent("available_courses", {
	"utterances" : [
		"for the available courses",
		"for all the courses",
		"tell me all available courses",
		"what courses are available",
		"which courses are available",
		"for all courses",
		"tell me all courses"
	]
}, available_courses);

app.intent("instructor_of", {
	"slots" : {
		"COURSE" : "COURSE"
	},
	"utterances" : [
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
}, instructor_of);

app.intent("course_detail", {
	"slots" : {
		"COURSE" : "COURSE"
	},
	"utterances" : [
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
}, course_detail);

app.intent("my_mark", {
	"slots" : {
		"COURSE" : "COURSE"
	},
	"utterances" : [
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
}, my_mark);

app.intent("my_course", {
	"utterances" : [
		"for my courses",
		"for the courses I am registered",
		"for the courses I'm registered",
		"tell me my courses",
		"list my courses",
		"what are my courses"
	]
}, my_course);

app.intent("course_schedule", {
	"slots" : {
		"COURSE" : "COURSE"
	},
	"utterances" : [
		"tell me the schedule of {COURSE}",
		"for the schedule of {COURSE}",
		"when does the course {COURSE} take place",
		"when does {COURSE} take place",
		"when are the appointments for {COURSE}",
		"when is the course {COURSE}"
	]
}, course_schedule);

app.intent("enroll", {
	"slots" : {
		"COURSE" : "COURSE"
	},
	"utterances" : [
		"register me for the course {COURSE}",
		"enroll me for the course {COURSE}",
		"i want to attend the course {COURSE}",
		"register me for {COURSE}",
		"enroll me for {COURSE}",
		"i want to attend {COURSE}"
	]
}, enroll);

app.intent("AMAZON.YesIntent", {
	"utterances" : [
		"want to hear them all",
		"say all appointments",
		"list all appointments"
	]
}, list_schedule);

app.intent("AMAZON.HelpIntent", {
	"slots" : {},
	"utterances" : []
}, function (request, response) {
	var helpOutput = "You can ask information about courses.";
	var reprompt = "What would you like to ask?";
	response.say(helpOutput).reprompt(reprompt).shouldEndSession(false);
});

app.intent("AMAZON.StopIntent", {
	"slots" : {},
	"utterances" : []
}, function (request, response) {
	var stopOutput = "Goodbye";
	response.say(stopOutput).shouldEndSession(true);
});

app.intent("AMAZON.CancelIntent", {
	"slots" : {},
	"utterances" : []
}, function (request, response) {
	var cancelOutput = "No problem. Request cancelled.";
	response.say(cancelOutput);
});

app.intent("AMAZON.NoIntent", {
	"slots" : {},
	"utterances" : []
}, function (request, response) {
	var cancelOutput = "No problem. Request cancelled.";
	response.say(cancelOutput);
});

///////////////////////// APP //////////////////////////

app.launch(function (request, response) {
	var speech = new AmazonSpeech().say("Welcome to the Alexa ").spell("lfu").say(" online");
	request.getSession().set("start","true");
	response.say(speech.ssml()).shouldEndSession(false);
});

app.error = function (exception, request, response) {
	console.log(exception);
	console.log(request);
	console.log(request.data.request.intent);
	console.log(response);
	response.say("Sorry an error occured " + exception);
};

app.pre = function (request, response) {
	response.shouldEndSession(false);
	if(request.data.request.hasOwnProperty("intent"))
	{
		if(request.data.request.intent.name == "response" || request.data.request.intent.name == "YesIntent" )
			return;
		else
			request.getSession().set("intent", request.data.request.intent.name);
	}
};

///////////////////// CUSTOM SLOTS /////////////////////

app.customSlot("COURSE", [
	{
		id : "703601",
		value : "VO Compiler Construction",
		synonyms : [
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
		id : "703602",
		value : "PS Compiler Construction",
		synonyms : [
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
		id : "703606",
		value : "SE Master's Seminar 2",
		synonyms : [
			"master seminar 2",
			"master's seminar 2",
			"seminar master's seminar 2",
			"seminar master seminar 2"
		]
	},
	{
		id : "702878",
		value : "VU Weiterführende Fachkompetenzen 2: Probalistic analysis of algorithms",
		synonyms : [
			"probalistic analysis",
			"vu probalistic analysis",
			"probalistic analysis of algorithms",
			"vu probalistic analysis of algorithms"
		]
	},
	{
		id : "703756",
		value : "PS Domain-specific Language Engineering",
		synonyms : [
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
		id : "703800",
		value : "VO Computer Haptics",
		synonyms : [
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
		id : "703801",
		value : "PS Computer Haptics",
		synonyms : [
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
		id : "703815",
		value : "SE Online Communication",
		synonyms : [
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
		id : "703819",
		value : "VO Machine Learning for Theorem Proving",
		synonyms : [
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
		id : "703655",
		value : "PS Semantic Web Services",
		synonyms : [
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
		id : "703654",
		value : "VO Semantic Web Services",
		synonyms : [
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
		id : "703649",
		value : "PS New Database Models",
		synonyms : [
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
		id : "703648",
		value : "VO New Database Models",
		synonyms : [
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
		id : "703646",
		value : "VO Network Security",
		synonyms : [
			"lecture Network Security",
			"Network Security lecture",
			"Network Security vo",
			"vo Network Security",
			"Network Security"
		]
	},
	{
		id : "703647",
		value : "PS Network Security",
		synonyms : [
			"ps Network Security",
			"Network Security ps",
			"Network Security proseminar",
			"proseminar Network Security",
			"Network Security"
		]
	},
	{
		id : "703632",
		value : "VO Advanced Concepts and Techniques in Software Quality",
		synonyms : [
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
