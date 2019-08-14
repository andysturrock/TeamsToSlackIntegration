'use strict'
require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const util = require('util')
const logger = require('pino')()
const pino = require('express-pino-logger')({
    level: process.env.LOG_LEVEL || 'warn'
  })
const cors = require('cors')
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const flash = require('req-flash');

const configuredPassport = require('./oauth/passport')

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const apiRouter = require('./routes/api');

const app = express();
app.use(pino)

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors())

// Session middleware
app.use(session({
    store: new RedisStore(),
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, 'public')));

// Initialize passport
app.use(configuredPassport.initialize());
app.use(configuredPassport.session());
app.use(flash())

app.use(function (req, res, next) {
    // Set the authenticated user in the
    // template locals
    if (req.user) {
        res.locals.user = req.user.profile;
    }
    next();
});

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/api', apiRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.sendStatus(err.status || 500);
});

const oauth2 = require('./oauth/oauth.js')
const redis = require("redis")
const client = redis.createClient();
const { promisify } = require('util');
const getAsync = promisify(client.get).bind(client);
const tokens = require('./oauth/tokens.js');
const checkForMessagesWithoutUserLogon = async () => {
    try {
        const profileAndToken = JSON.parse(await getAsync('users/5a85aa45-9606-4698-b599-44697e2cbfcb'))
        logger.error("profileAndToken.oauthToken.token = " + util.inspect(profileAndToken.oauthToken.token))
        const oauthToken = oauth2.accessToken.create(profileAndToken.oauthToken.token);

        logger.error("oauthToken = " + util.inspect(oauthToken))
        const accessToken = await tokens.getRefreshedTokenAsync(oauthToken);
        logger.error("oauthToken = ", oauthToken)
        logger.error("accessToken = ", accessToken)
        const teams = require('./teams');
        // await teams.pollTeamsForMessagesAsync(accessToken)
    } catch (err) {
        logger.error("checkForMessagesWithoutUserLogon()\n" + util.inspect(err) + "\n" + err.stack)
    }
}

const channelMaps = require('./channel-maps')
// checkForMessagesWithoutUserLogon()
//setInterval(checkForMessagesWithoutUserLogon, 5000);
class ChannelMapping {
    constructor(json) {
        // if (!json) {
        this.team = { id: null, name: null };
        this.teamsChannel = { id: null, name: null };
        this.workspace = { id: null, name: null };
        this.slackChannel = { id: null, name: null };
        this.mappingOwner = { id: null, name: null, token: null };
        // }
        if (json) {
            const jsonAny = JSON.parse(json)
            this.team.id = jsonAny.team.id
            this.team.name = jsonAny.team.name
            this.teamsChannel.id = jsonAny.teamsChannel.id;
            this.teamsChannel.name = jsonAny.teamsChannel.name;
            this.workspace.id = jsonAny.workspace.id;
            this.workspace.name = jsonAny.workspace.name;
            this.slackChannel.id = jsonAny.slackChannel.id;
            this.slackChannel.name = jsonAny.slackChannel.name;
            this.mappingOwner.id = jsonAny.mappingOwner.id;
            this.mappingOwner.name = jsonAny.mappingOwner.name;
            this.mappingOwner.token = jsonAny.mappingOwner.token;
        }
    }
}

const arse = async () => {
    try {
        const channelMappings = await channelMaps.getMapsAsync();
        logger.error("channelMappings = ", channelMappings)
        for (let mapping of channelMappings) {
            const channelMapping = new ChannelMapping(mapping)
            const mappingOwner = channelMapping.mappingOwner;
            const token = mappingOwner.token
            logger.error("token = ", token)

            const OBOtoken = await tokens.getOnBehalfOfTokenAsync(token)
            logger.error("OBOtoken = ", OBOtoken)
            
            // const oauthToken = oauth2.accessToken.create(token);

            // const accessToken = await tokens.getRefreshedTokenAsync(oauthToken);
            // logger.error("oauthToken = ", oauthToken)
            // logger.error("accessToken = ", accessToken)
            // const teams = require('./teams');
            // await teams.pollTeamsForMessagesAsync(accessToken)
        }
    } catch (err) {
        logger.error("checkForMessagesWithoutUserLogon()\n" + util.inspect(err) + "\n" + err.stack)
    }
}
arse()

module.exports = app;