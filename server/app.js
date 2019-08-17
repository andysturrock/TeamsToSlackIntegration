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
const checkForMessagesInMappings = async () => {
    try {
        const channelMappings = await channelMaps.getMapsAsync();
        for (let channelMapping of channelMappings) {
            await teams.pollTeamsForMessagesAsync(channelMapping)
        }
    } catch (err) {
        logger.error("arse()\n" + util.inspect(err) + "\n" + err.stack)
    }
}
setInterval(checkForMessagesInMappings, 5000);

module.exports = app;