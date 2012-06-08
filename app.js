#!/usr/bin/env node

var auth = require("./auth.js");
var fs = require('fs');

function syncOutput(text) {
    fs.writeSync(1, text + "\n");
}

var secret = JSON.parse(fs.readFileSync('./secret.json'));

var oauth = new auth.OAuth(secret);


function tweetFormat(user, content, time) {
    return "@" + user + ": " + content + "\n";
}
    
function processTweet(chunk) {
    try {
        var ev = JSON.parse(chunk.toString());
        if ("friends" in ev) {
            // This is a "friends" message. Ignore
        } else if ("entities" in ev) {
            // This is a tweet. Write
            syncOutput(tweetFormat(ev.user.screen_name, ev.text, ev.created_at));
        } else if ("delete" in ev) {
        // Tweet deleted. Ignore
        } else {
            // Log it
            syncOutput("[!] Unknown event: " + chunk.toString());
        }
    } catch (e) {
        // Wasn't JSON. Probably a Keep-Alive newline
    }
}

function dumpData(chunk) {
    console.log(chunk.toString());
}

function processTweetList(bulk) {
    try {
        var list = JSON.parse(bulk.toString()).reverse();
        for (var i = 0; i < list.length; i++) {
            syncOutput(tweetFormat(list[i].user.screen_name,
                                    list[i].text,
                                    list[i].created_at));
        }
    } catch (e) {
        // Bad formatting
        syncOutput("[!] " + e.message);
    }
}

oauth.getLast(processTweetList);
oauth.streamUser(processTweet);
