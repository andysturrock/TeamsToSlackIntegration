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


const channelMaps = require('./channel-maps')

const SlackToTeamsMapping = require('./slack-to-teams-mapping')
const createInitialSlackToTeamsMappings = async () => {
    try {
        const channelMappings = await channelMaps.getMapsAsync();
        for (let channelMapping of channelMappings) {
            const slackToTeamsMapping = new SlackToTeamsMapping(channelMapping)
            await slackToTeamsMapping.initAsync()
        }
    } catch (error) {
        logger.error(error.stack)
    }
}
createInitialSlackToTeamsMappings()

const TeamsToSlackMapping = require('./teams-to-slack-mapping')
const createInitialTeamsToSlackMappings = async () => {
    try {
        const channelMappings = await channelMaps.getMapsAsync();
        for (let channelMapping of channelMappings) {
            const teamsToSlackMapping = new TeamsToSlackMapping(channelMapping)
            await teamsToSlackMapping.initAsync()
        }
    } catch (error) {
        logger.error(error.stack)
    }
}
createInitialTeamsToSlackMappings()

module.exports = app;