/*
    This is a basic implementation of the OAuth protocol
    written for the clittdget streaming client.

    There are millions of libs out there that do this, but
    where's the fun on that?

    Author: Adria López <insecure@prealfa.com>
*/

var DEBUG = false;

// Node.JS Crypto
var crypto = require("crypto");
// Node.JS HTTPS (internally http)
var http = require('https');

// Create OAuth signature
function buildSignature(param) {
    // parameters includes all the parameters sent with the request
    // that must form part of the signature, that is, the querystring
    // parameters, the request content and all the oauth vars

    /*  To simplify, we hardcode what parameters will be supplied:
        
        - Query String:
            with
        - Request:
           
    */

    // With this, the ordering is hardcoded

    var param_string = "";
    
    param_string += 'oauth_consumer_key=' + encodeURIComponent(param.oauth_consumer_key) + '&';
    param_string += 'oauth_nonce=' + encodeURIComponent(param.oauth_nonce) + '&';
    param_string += 'oauth_signature_method=HMAC-SHA1&';
    param_string += 'oauth_timestamp=' + encodeURIComponent(param.timestamp) + '&';
    param_string += 'oauth_token=' + encodeURIComponent(param.oauth_token) + '&';
    param_string += 'oauth_version=' + encodeURIComponent(param.oauth_version);
    if (param.with) {
        param_string += '&with=' + (param.with || 'followings');
    }

    // We also need to retrieve the query method

    var method = param.method;

    // And the base URL

    var base_url = param.base_url;

    // The three must be combined now

    var base_string = method.toUpperCase() + "&" +
                      encodeURIComponent(base_url) + "&" +
                      encodeURIComponent(param_string);
    if (DEBUG) {
        console.log("Base String: " + base_string);
    }
    // Now we build the signing key by appending consumer and token secrets

    var signing_key = encodeURIComponent(param.oauth_consumer_secret) + "&" +
                      encodeURIComponent(param.oauth_token_secret);

    // Finally, sign
    var hmac = crypto.createHmac('sha1', signing_key);
    hmac.update(base_string);
    return hmac.digest(encoding='base64');
}

function OAuth(options) {
    // Builds an object that dispatches the requests

    this.params = {
        oauth_consumer_key : options.oauth_consumer_key,
        oauth_consumer_secret : options.oauth_consumer_secret,
        oauth_token: options.oauth_token,
        oauth_token_secret: options.oauth_token_secret
    }

    // Get Timestamp
    this._getTimestamp = function(){
        return String(Math.round(new Date().getTime() / 1000));
    }

    // Get nonce
    this._getNonce = function(){
        return (new Buffer((10*Math.random()).toString()).toString('base64'));
    }

    // Build headers
    this._getAuthorizationHeaders = function(url, p){
        var authorization = "OAuth ";
        var sig_param = {
            timestamp:              this._getTimestamp(),
            oauth_nonce:            this._getNonce(),
            oauth_consumer_key:     this.params.oauth_consumer_key,
            oauth_consumer_secret:  this.params.oauth_consumer_secret,
            oauth_token:            this.params.oauth_token,
            oauth_token_secret:     this.params.oauth_token_secret,
            base_url:               url,
            oauth_version:          "1.0",
            method:                 "GET",
        };
        for (var k in p) {
            sig_param[k] = p[k];
        }

        authorization += "oauth_consumer_key=\"" + encodeURIComponent(sig_param.oauth_consumer_key) + "\",";
        authorization += "oauth_nonce=\"" + encodeURIComponent(sig_param.oauth_nonce) + "\",";
        authorization += "oauth_signature=\"" + encodeURIComponent(buildSignature(sig_param)) + "\","
        authorization += "oauth_signature_method=\"HMAC-SHA1\",";
        authorization += "oauth_timestamp=\"" + encodeURIComponent(sig_param.timestamp) + "\",";
        authorization += "oauth_token=\"" + encodeURIComponent(sig_param.oauth_token) + "\",";
        authorization += "oauth_version=\"1.0\"";

        if (DEBUG) {
            console.log("Authorization: " + authorization);
        }
        return authorization
    }
    
    // Query params to qstring
    this._paramsToQString = function(params) {
        var str = "";
        for (var k in params) {
            if (str!="") str += "&";
            str += k + "=" + params[k];
        }
        return str
    }

    // Internal request function
    this._request = function(base, endpoint, p, callback) {
        var req = http.request({
            host: base,
            port: 443,
            headers: {'Authorization': this._getAuthorizationHeaders('https://'+base+endpoint, p)},
            path: endpoint + "?" + this._paramsToQString(p),
            method: "GET"
        }, callback);
        
        req.on('error', function(e) {
            console.log("Request failed: " + e.message);
        });
        
        req.end();
    }

    // Internal callback for when streaming the user
    this._streamCallback = function(callback) {
        // This function calls callback with whatever comes and reconnects
        // if the connection drops
        return function(res) {
            res.on('data', callback);
            res.on('end', function() {
                this.streamUser(callback);
            });
        };
    }
    
    // Stream the user
    this.streamUser = function(callback) {
        this._request("userstream.twitter.com",
                      "/2/user.json",
                      {"with" : "followings"},
                      this._streamCallback(callback));
    }

    // Internal callback for when getting last tweets
    this._bulkCallback = function(callback) {
        // This function buffers until the connection closes
        // and then passes the result to a further callback
        return function(res) {
            var buf = "";
            res.on('data', function(chunk) {
                buf += chunk.toString();
            });
            res.on('end', function() {
                callback(buf)
            });
        };
    }

    // Get last tweets
    this.getLast = function(callback) {
        this._request("api.twitter.com",
                      "/1/statuses/home_timeline.json",
                      {},
                      this._bulkCallback(callback));
    }


}


// Exports

exports.OAuth = OAuth;
