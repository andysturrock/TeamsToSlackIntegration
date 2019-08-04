'use strict'
const express = require('express');
const router = express.Router();
const tokens = require('../oauth/tokens.js');
const graph = require('../graph.js');
const util = require('util')


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
      let accessToken;
      try {
        accessToken = await tokens.getAccessTokenAsync(req);
      } catch (err) {
        req.flash('error_msg', {
          message: 'Could not get access token. Try signing out and signing in again.',
          debug: JSON.stringify(err.stack)
        });
      }

      if (accessToken && accessToken.length > 0) {
        try {
          const messages = await graph.getMessagesAsync(accessToken, team_id, channel_id);

          for(message of messages) {
              logger.debug("Message body" + util.inspect(message.body))
              logger.debug("Message from" + util.inspect(message.from.user))
              const replies = await graph.getRepliesAsync(accessToken, team_id, channel_id, message.id);
              for(reply of replies) {
                logger.debug.log("reply body" + util.inspect(reply.body))
              }
          }
          params.messages = messages;
        } catch (error) {
          req.flash('error_msg', {
            message: 'Could not fetch messages',
            debug: JSON.stringify(err.stack)
          });
        }
      }

      res.render('messages', params);
    }
  }
);

module.exports = router;