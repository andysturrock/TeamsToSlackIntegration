'use strict'
const util = require('util')
const logger = require('pino')()
const passport = require('passport');
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
const graph = require('../graph');
const redis = require("redis")
const client = redis.createClient();
const { promisify } = require('util');
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);
const oauth2 = require('./oauth.js')

// Configure passport

// Passport calls serializeUser and deserializeUser to
// manage users
passport.serializeUser(async function (user, done) {
    // Use the OID property of the user as a key
    await setAsync(`users/${user.profile.oid}`, JSON.stringify(user))
    done(null, user.profile.oid);
});

passport.deserializeUser(async function (id, done) {
    const user = JSON.parse(await getAsync(`users/${id}`))
    done(null, user)
});


// Callback function called once the sign-in is complete
// and an access token has been obtained
async function signInComplete(iss, sub, profile, accessToken, refreshToken, params, done) {
    if (!profile.oid) {
        return done(new Error("No OID found in user profile."), null);
    }

    try {
        const user = await graph.getUserDetails(accessToken);

        if (user) {
            // Add properties to profile
            profile['email'] = user.mail ? user.mail : user.userPrincipalName;
            logger.info("user = " + util.inspect(user))
        }
    } catch (err) {
        logger.error("signInComplete() %o", err)
        done(err, null);
    }
    // Create a simple-oauth2 token from raw tokens
    const oauthToken = oauth2.accessToken.create(params);

    // Save the profile and tokens in user storage
    const profileAndToken = { profile, oauthToken }
    await setAsync(`users/${profile.oid}`, JSON.stringify(profileAndToken))

    return done(null, profileAndToken)
}

// Configure OIDC strategy
passport.use(new OIDCStrategy({
    identityMetadata: `${process.env.OAUTH_AUTHORITY}${process.env.OAUTH_ID_METADATA}`,
    clientID: process.env.OAUTH_APP_ID,
    responseType: 'code id_token',
    responseMode: 'form_post',
    redirectUrl: process.env.OAUTH_REDIRECT_URI,
    allowHttpForRedirectUrl: true,
    clientSecret: process.env.OAUTH_APP_PASSWORD,
    validateIssuer: false,
    passReqToCallback: false,
    scope: process.env.OAUTH_SCOPES.split(' ')
},
    signInComplete
));

module.exports = passport;