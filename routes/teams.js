var express = require('express');
var router = express.Router();
var tokens = require('../tokens.js');
var graph = require('../graph.js');
var util = require('util')

router.get('/',
  async function(req, res) {
    if (!req.isAuthenticated()) {
      // Redirect unauthenticated requests to home page
      res.redirect('/')
    } else {
      let params = {
        active: { teams: true }
      };

      // Get the access token
      var accessToken;
      try {
        accessToken = await tokens.getAccessTokenAsync(req);
      } catch (err) {
        req.flash('error_msg', {
          message: 'Could not get access token. Try signing out and signing in again.',
          debug: JSON.stringify(err)
        });
      }

      if (accessToken && accessToken.length > 0) {
        try {
          var teamsAndChannels = await graph.getTeamsAndChannelsAsync(accessToken);
          console.log("teamsAndChannels:" + util.inspect(teamsAndChannels))
          params.teamsAndChannels = teamsAndChannels;
        } catch (err) {
          req.flash('error_msg', {
            message: 'Could not fetch teams',
            debug: JSON.stringify(err)
          });
        }
      }

      res.render('teams', params);
    }
  }
);

module.exports = router;