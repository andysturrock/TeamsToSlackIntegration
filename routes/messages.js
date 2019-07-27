var express = require('express');
var router = express.Router();
var tokens = require('../tokens.js');
var graph = require('../graph.js');
var util = require('util')

router.get('/:team_id/:channel_id',
  async function(req, res) {
    const team_id = req.params.team_id;
    const channel_id = req.params.channel_id;

    if (!req.isAuthenticated()) {
      // Redirect unauthenticated requests to home page
      res.redirect('/')
    } else {
      let params = {
        active: { messages: true }
      };

      // Get the access token
      var accessToken;
      try {
        accessToken = await tokens.getAccessToken(req);
      } catch (err) {
        req.flash('error_msg', {
          message: 'Could not get access token. Try signing out and signing in again.',
          debug: JSON.stringify(err)
        });
      }

      if (accessToken && accessToken.length > 0) {
        try {
          var messages = await graph.getMessages(accessToken, team_id, channel_id);
          console.log("messages:" + util.inspect(messages))

          for(message of messages.value) {
              console.log("Message body" + util.inspect(message.body))
          }
          params.messages = messages;
        } catch (err) {
          req.flash('error_msg', {
            message: 'Could not fetch messages',
            debug: JSON.stringify(err)
          });
        }
      }

      res.render('messages', params);
    }
  }
);

module.exports = router;