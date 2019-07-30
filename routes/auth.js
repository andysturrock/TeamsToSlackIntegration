var express = require('express');
var passport = require('passport');
var router = express.Router();

/* GET auth callback. */
router.get('/signin',
  function (req, res, next) {
    console.log("Auth Here 1")
    passport.authenticate('azuread-openidconnect',
      {
        response: res,
        prompt: 'login',
        failureRedirect: '/',
        failureFlash: true
      }
    )(req, res, next);
  },
  function (req, res) {
    console.log("Auth Here 2")
    res.redirect('/');
  }
);

router.post('/callback',
  function (req, res, next) {
    passport.authenticate('azuread-openidconnect',
      {
        response: res,
        failureRedirect: '/',
        failureFlash: true
      }
    )(req, res, next);
  },
  function (req, res) {
    res.redirect('/');
  }
);

router.get('/signout',
  function (req, res) {
    req.session.destroy(function (err) {
      req.logout();
      res.redirect('/');
    });
  }
);

module.exports = router;