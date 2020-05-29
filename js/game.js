var RESPONSE_INDEX = 0, //current index to pull responses from
    RESPONSE_SELECTION_STATUS = false, //has the user selected a response
    CORRECT_RESPONSES = 0; //number of correct responses

let rawResponsesArray, responsesArray;
//$.getJSON("responses.json", (data) => rawResponsesArray = data.default);  //import questions json
//responsesArray = data.default;


//click event array
let clickEventObj = {
    //id : method
    "replay-button": function () {
        console.log("replaying audio");
        audio.pause();
        audio.currentTime = 0;
        audio.play();
    },
    "next-button": async function () {
        //check to see if the user has selected an answer
        if (!RESPONSE_SELECTION_STATUS) return selectResponsePrompt();

        if (RESPONSE_INDEX == responsesArray.length - 1) return endGame();
        console.log("going to next question");
        audio.pause(); //stop any currently playing audio
        RESPONSE_INDEX++; //increment the index
        await initializeLoadingSequence(); //show loading screen
        loadAudioFile(); //bring in the next audio file (default index is RESPONSE_INDEX)
        await playSoloFullscreen(); //play the solo
        resetResponseSelection(); //clear the responses
        loadResponses(); //load new responses using current RESPONSE_INDEX
        showResponses(); //show the new responses
    }
};

//click event handler
$(window).click(e => {
    //gives us the element that the user clicked on
    if (clickEventObj[e.target.id]) clickEventObj[e.target.id]();
});
$(document).on("click", ".response", function () { //when a response is selected
    if (RESPONSE_SELECTION_STATUS) return; //if user already selected a resonse, exit
    RESPONSE_SELECTION_STATUS = true; //update global variable
    //color the response red/green if it was wrong/right
    //if it was wrong, color the correct response green and enlarge it
    let correctResponseObj = isCorrectResponse($(this).data("responseid"), true);
    //if it is the correct response
    if (correctResponseObj.isCorrectResponse) {
        CORRECT_RESPONSES++; //increment global correct response counter
        $(this).addClass("correct");
    } else {
        $(this).addClass("incorrect"); //add incorrect class to user selection
        setTimeout(() => { //timeout for smoothness
            $(".response").each(function () { //add correct class to correct reponse
                if ($(this).data("responseid") == correctResponseObj.correctResponse) $(this).addClass("correct");
            });
        }, 500);
    }
});

/**
 * Shuffles an array and does not modify the original.
 * 
 * @param {array} array - An array to shuffle.
 * @return {array} A shuffled array.
 */
function shuffleArray(array) {
    //modified from https://javascript.info/task/shuffle

    tmpArray = [...array];

    for (let i = tmpArray.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1)); // random RESPONSE_INDEX from 0 to i

        // swap elements tmpArray[i] and tmpArray[j]
        // we use "destructuring assignment" syntax to achieve that
        // you'll find more details about that syntax in later chapters
        // same can be written as:
        // let t = tmpArray[i]; tmpArray[i] = tmpArray[j]; tmpArray[j] = t
        [tmpArray[i], tmpArray[j]] = [tmpArray[j], tmpArray[i]];
    }
    return tmpArray;
}

var dummyGamemode = {
    rawResponsesArray: rawResponsesArray,
    length: 15
}

function generateResponseArray(gamemode = GAMEMODE_INFO) {
    //gamemode will be an obj, ideally. obviously this can all change
    
    //create a responsesArray obj that sorts rawResponsesArray the way we specify
    responsesArray = shuffleArray(  //shuffle an array of response objects, shuffle each individual response.
                                    //this is to prevent the same response appearing in the same spot over and over.
        gamemode.rawResponsesArray.map(responseObj => {
            responseObj.responses = shuffleArray(responseObj.responses);
            return responseObj;
        })
    ); 
    
    responsesArray.length = gamemode.length; //truncate array to gamemode length (because we have more questions than will be asked)

}

/**
 * Loads the next set of responses into the html elements
 *
 * @param {boolean} initialize - Whether or not to initialize the RESPONSE_INDEX to zero
 * @param {boolean} incrementIndex - Whether or not to increment the RESPONSE_INDEX
 */
function loadResponses(initialize = false, incrementIndex = false) { //populate html with responses
    //TODO reformat responses.json to store questions in a way they can be randomized
    //while also keeping track of correct answer (turn each string into an obj)
    if (initialize) RESPONSE_INDEX = 0;
    if (incrementIndex) RESPONSE_INDEX++;
    $(".response").each(function () { //iterate thru all elements with the "response" class
        rid = $(this).data("responseid");
        $(this).text(responsesArray[RESPONSE_INDEX].responses[rid].text); //set the text of the current element
    });
}

/**
 * @param {number} rid - The ID of the response to check
 * @param {boolean} detailedReturn - Whether or not to return a more detailed object instead of the detailed return
 *
 * @return {boolean} Whether or not the response is correct for the current global RESPONSE_INDEX variable
 */
function isCorrectResponse(rid, detailedReturn = false) {
    //if (!detailedReturn) return responsesArray[RESPONSE_INDEX].correct_response == rid;
    if (!detailedReturn) return responsesArray[RESPONSE_INDEX].responses[rid].isCorrectResponse;
    else  {
        var correctResponse = responsesArray[RESPONSE_INDEX].responses.findIndex(obj => obj.isCorrect === true);
        return {
            "rid": rid,
            "responseIndex": RESPONSE_INDEX,
            "isCorrectResponse": responsesArray[RESPONSE_INDEX].responses[rid].isCorrect,
            "correctResponse": correctResponse
        }
    }
}

function resetResponseSelection() {
    RESPONSE_SELECTION_STATUS = false;
    $(".response").each(function () {
        $(this).removeClass(); //remove all classes
        $(this).addClass("response"); //add back the response class
    });
}

async function beginGame() {
    //add a try{} wrapper?

    $("#instructions-wrapper").addClass("hidden"); //hide list of instructions
    await initializeLoadingSequence(); //show full loading bar animation
    //^ possibly add a .then() callback?
    //possibly add a "Question x of y" above the loading bar?

    generateResponseArray();    //generate the responses for the whole game, plus get the current solo in queue
    /* question process:
     * loading screen -> first solo -> question page -> correct answer page
     * first solo has audio and fullscreen canvas
     * question page has audio and small canvas
     * correct answer page has audio and small canvas
     */

    //load and play the solo for the users
    loadAudioFile();
    await playSoloFullscreen();

    //show the questions
    loadResponses(true, false);
    showResponses();
}

function initializeLoadingSequence() { //make sure you use await when you call this function
    //possibly add an arg that allows us to perform some other methods while loading in
    return new Promise((resolve, reject) => {
        $("#page-wrapper > *").addClass("hidden"); //hide all descending divs
        $("#loading-container-wrapper").removeClass("hidden"); //show loading bar and start animation
        //wait for animation to end then hide loading bar and return promise once animation is over
        $("#loading-container").one('webkitAnimationEnd oanimationend msAnimationEnd animationend', () => {
            $("#loading-container-wrapper").addClass("hidden"); //hide loading bar
            //we end on a black screen, so divs need to be manually shown after this function is called
            resolve(); //end promise
        });
    });
};

function loadAudioFile(index = RESPONSE_INDEX) {
    $(audio).attr("src", `audio/solo/${responsesArray[index].filename}`);
    audio.load();
}

function playSoloFullscreen() {
    return new Promise((resolve, reject) => {
        $("#canvas-wrapper").removeClass("hidden"); //show the canvas
        $("#canvas").addClass("canvas-full"); //make it fullscreen
        audio.play(); //play the audio and animate the audio graph
        $("#audio").one("ended", () => {
            //minimize canvas and resolve promise
            $("#canvas").removeClass("canvas-full"); //add an animation to shrink it down?
            resolve();
        });
    });
}

function showResponses() {
    //asuming we already have them generated
    $("#response-page").removeClass("hidden");
}

function selectResponsePrompt() {
    $("#no-selection-prompt").modal({
        fadeDuration: 100
    });
}

function endGame() {
    loadEndPage();
    showEndPage();
}

function loadEndPage() {
    //insert user results into the #end-page html
    var endScoreElement = $("#end-score");
    endScoreElement.html(`Your Score: ${CORRECT_RESPONSES} <span style="font-size:${parseFloat(endScoreElement.css("font-size")) * .85}px;">out of</span> ${responsesArray.length}`);

    //display end of game HTML. if gamemode has custom HTML, use that, otherwise show default msg
    if(GAMEMODE_INFO.endHTML) $("#end-body").html(GAMEMODE_INFO.endHTML);
    else $("#end-text").text("Thanks for playing! Try again sometime.");
}

function showEndPage() {
    //hide everything then show the end page
    $("#page-wrapper > *").addClass("hidden"); //hide all descending divs
    $("#end-page").removeClass("hidden"); //show loading bar and start animation
}