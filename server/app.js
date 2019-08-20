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
const channelMaps = require('./channel-maps')
const teams = require('./teams');
const graph = require('./graph');
const checkForMessagesInMappings = async () => {
    try {
        const channelMappings = await channelMaps.getMapsAsync();
        for (let channelMapping of channelMappings) {
            await teams.pollTeamsForMessagesAsync(channelMapping)
            // const oauthToken = oauth2.accessToken.create(channelMapping.mappingOwner.token);
            // const accessToken = await tokens.getRefreshedTokenAsync(oauthToken);
            // const res = await graph.postMessageAsync(accessToken,
            //     channelMapping.team.id,
            //     channelMapping.teamsChannel.id,
            //     "Hello from the bot")
            // logger.error("res = " + util.inspect(res))
        }
    } catch (err) {
        logger.error("arse()\n" + util.inspect(err) + "\n" + err.stack)
    }
}
setInterval(checkForMessagesInMappings, 5000);
// checkForMessagesInMappings()

const tokens = require('./oauth/tokens')
const cock = async () => {
    const botToken = await tokens.getBotTokenAsync()
    const access_token = botToken.access_token
    try {
        const teamsChannelId = '19:fb442837eaa74fd4ae81ed89c5e39cf6@thread.skype'
        const messageId = '1566313742985'

        await teams.postBotReplyAsync(access_token, teamsChannelId, messageId, "reply using teams function")
        await teams.postBotMessageAsync(access_token, teamsChannelId, "new message using teams function")
    }
    catch (error) {
        console.error("Arghhg error: " + util.inspect(error))
    }
}
// cock()

const slack = require('./slack-rtm')
const nob = async () => {
    try {
        await slack.connectToSlackRTMAsync(process.env.SLACK_TOKEN)
    } catch (error) {
        logger.error(error.stack)
    }
}
// nob()


module.exports = app;