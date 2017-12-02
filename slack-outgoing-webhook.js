// Slack will send a request for each message sent on any or a specific channel.
// If trigger word has been configured on Slack, only messages starting with
// that trigger word will be sent

module.exports = function (context, done) {
  console.log('slack request: ', context.body);
  // Make sure we have a real request first.
 
  if (context.secrets.WEBHOOK_SECRET !== context.body.token) {
    console.log("This is a bad request, aborting.");
    return done(null, {});
  }

  // And hopefully, the bot didn't trigger the message...
  if (context.body.user_name === context.secrets.BOT_NAME) {
    console.log("We don't talk to ourselves.");
    return done(null, {});
  }

  // Pattern explanation
  //  ^                     anchor to the opening of the string
  //  (                     first matching group
  //    \w+                   1 or more "word" characters
  //  |                       -or-
  //    "                     A quote followed by
  //    [\w+\s+]{1,}          one or more word or space characters, followed by
  //    "                     A quote
  //  )                     end of first match group
  //  (                     second match group
  //    --                    A literal pair of -- characers 
  //   |                      -or-
  //    \+\+                  Two ++ characters (escaped)
  //  )                     end of second match group
  // flags: i - ignore case  
  // This shold capture any mixture of single words or "quoted series of words" followed by -- or --
  // Ex:
  //    stuff++
  //    "red hot chili peppers"++
  //    "massive debt"--
  // While ignoring random ++ and --'s later in the text. 
  
  var reg = /^(\w+|"[\w+\s+]{1,}")(--|\+\+)/i;  
  var match = reg.exec(context.body.text);
  if( match ) {
    // We've got a match!  Look up the thing we're karma'ing and ++ or -- accordingly.
    // This is also just karma, we're not going to bother with conflicts here, 'cause
    // it's getting late and this is getting complicated.
    
    var thingy = match[1];
    var what = match[2];
    
    console.log( "We are doing " + what + " on " + thingy );
    context.storage.get( (error, stored_data) => { 
      if (error) { 
        return done(400, {});                   // If there's an error, slack will just try again in a few.
      } else { 
        var data = {};                          // Set up some default data documents, in case this is the first
        if( stored_data ) {                     // run, otherwise, use what came from the store.
          data = stored_data;
        }
        
        var current = 0;                        // Figure out the current karma value
        if( data[thingy] ) {                    // Since we don't know the name of the key, pretend 
          current = Number(data[thingy]);       // it's a hash.  
        }
        
        if( what === "--" ) {                   // ++ or -- it.  There's probably a more clever way
          current--;                            // but clarity over clever.
        } else { 
          current++;
        }
        
        data[thingy] = current;                 // Put the updated value back in our document, and..
        
        context.storage.set(data);            // We just don't care about concurrency here.  See above.
        
        //                            /-- Get rid of quotes for display.
        return done(null, {"text": thingy.replace(/"/g, '') + " has " + current + " karma."});
      }
    });
  }
};

