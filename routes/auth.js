'use strict'
const express = require('express');
const passport = require('passport');
const router = express.Router();
const logger = require('pino')()

/* GET auth callback. */
router.get('/signin',
  function (req, res, next) {
    try {
      passport.authenticate('azuread-openidconnect',
        {
          response: res,
          prompt: 'login',
          failureRedirect: '/',
          failureFlash: true
        }
      )(req, res, next);
    } catch (error) {
      logger.error("router.get('/signin'): " + error)
    }
  },
  function (req, res) {
    res.redirect('/');
  }
);

// AAD redirects here after the user logs in via AAD.
// AAD does a POST with some stuff (a code) in the res(ponse) object.
// Passport then calls back to AAD to swap the code for an OAuth
// bearer token, which consists of the access_token and refresh_token.
// Then passport calls the signIncomplete callback with that bearer token.
router.post('/callback',
  function (req, res, next) {
    try {
      passport.authenticate('azuread-openidconnect',
        {
          response: res,
          failureRedirect: '/',
          failureFlash: true
        }
      )(req, res, next);
    } catch (error) {
      logger.error("router.get('/callback'): " + error)
    }
  },
  function (req, res) {
    res.redirect('/');
  }
);

router.get('/signout',
  function (req, res) {
    try {
      req.session.destroy(function (err) {
        req.logout();
        res.redirect('/');
      });
    } catch (error) {
      logger.error("router.get('/signout'): " + error)
    }
  }
);

module.exports = router;