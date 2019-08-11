'use strict'
require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const util = require('util')
const logger = require('pino')()
const pino = require('express-pino-logger')()
const cors = require('cors')

const configuredPassport = require('./oauth/passport')

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const apiRouter = require('./routes/api');

const app = express();
app.use(pino)

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors())

app.use(express.static(path.join(__dirname, 'public')));

// Initialize passport
app.use(configuredPassport.initialize());
app.use(configuredPassport.session());

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
        const oauthToken = oauth2.accessToken.create(profileAndToken.oauthToken.token);
        const accessToken = await tokens.getRefreshedTokenAsync(oauthToken);
        const teams = require('./teams');
        await teams.pollTeamsForMessagesAsync(accessToken)
    } catch (err) {
        logger.error("checkForMessagesWithoutUserLogon(): %o %s", util.inspect(err), err.stack)
    }
}

//setInterval(checkForMessagesWithoutUserLogon, 5000);

module.exports = app;