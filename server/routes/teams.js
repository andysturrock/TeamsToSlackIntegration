const express = require('express');
const router = express.Router();
const tokens = require('../oauth/tokens.js');
const graph = require('../graph.js');
const util = require('util')
const logger = require('pino')()

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
      let accessToken;
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
          const teamsAndChannels = await graph.getTeamsAndChannelsAsync(accessToken);
          logger.debug("teamsAndChannels:" + util.inspect(teamsAndChannels))
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