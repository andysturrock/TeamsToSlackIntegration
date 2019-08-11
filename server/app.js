'use strict'
require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const util = require('util')
const logger = require('pino')()
const pino = require('express-pino-logger')()
const cors = require('cors')
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

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
        logger.error("profileAndToken = " + util.inspect(profileAndToken))
        const oauthToken = oauth2.accessToken.create(profileAndToken.oauthToken.token);


        // const token = 'eyJ0eXAiOiJKV1QiLCJub25jZSI6ImRBeTdFWm5rX2xZZE5QY0wtb29OU0hNVDRROEpmdlNKR2t6ek0tdWxJbTAiLCJhbGciOiJSUzI1NiIsIng1dCI6InU0T2ZORlBId0VCb3NIanRyYXVPYlY4NExuWSIsImtpZCI6InU0T2ZORlBId0VCb3NIanRyYXVPYlY4NExuWSJ9.eyJhdWQiOiIwMDAwMDAwMy0wMDAwLTAwMDAtYzAwMC0wMDAwMDAwMDAwMDAiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC9iNDVkZWM1NS00NDhjLTQ3ODYtODA3ZS0yOTg3YjI0MzQxN2EvIiwiaWF0IjoxNTY1NTIxNDMwLCJuYmYiOjE1NjU1MjE0MzAsImV4cCI6MTU2NTUyNTMzMCwiYWNjdCI6MCwiYWNyIjoiMSIsImFpbyI6IjQyRmdZSkNlT0d1eHZsRHJ0K0p2NTczUE0yNmNrdk15MHRIem1ZL1VIVFh6S2JaTTltNEEiLCJhbXIiOlsicHdkIl0sImFwcF9kaXNwbGF5bmFtZSI6IlNsYWNrL1RlYW1zIEludGVncmF0aW9uIENsaWVudCIsImFwcGlkIjoiMTZlZGE1YWQtYjVmMC00OGRkLWFhNDAtMzlkZmE0MjgyOWNkIiwiYXBwaWRhY3IiOiIwIiwiZmFtaWx5X25hbWUiOiJTdHVycm9jayIsImdpdmVuX25hbWUiOiJBbmRyZXciLCJpcGFkZHIiOiI4MS4xMDguNDEuMTMzIiwibmFtZSI6IkFuZHJldyBTdHVycm9jayIsIm9pZCI6IjVhODVhYTQ1LTk2MDYtNDY5OC1iNTk5LTQ0Njk3ZTJjYmZjYiIsInBsYXRmIjoiMTQiLCJwdWlkIjoiMTAwMzIwMDA1MzEwM0JENyIsInNjcCI6Ikdyb3VwLlJlYWQuQWxsIG9wZW5pZCBwcm9maWxlIFVzZXIuUmVhZCBVc2VyLlJlYWQuQWxsIGVtYWlsIiwic3ViIjoiOV9FZy1wNTJoVWMxLUFRUnE2MFBFa0JMQkxVZmVSV0RtYnRkdmpEZENvdyIsInRpZCI6ImI0NWRlYzU1LTQ0OGMtNDc4Ni04MDdlLTI5ODdiMjQzNDE3YSIsInVuaXF1ZV9uYW1lIjoiYW5keUBzdHVycm9ja2Rldi5vbm1pY3Jvc29mdC5jb20iLCJ1cG4iOiJhbmR5QHN0dXJyb2NrZGV2Lm9ubWljcm9zb2Z0LmNvbSIsInV0aSI6Ikg3WTM4c0lzNUVPZkRPYlljRzBmQUEiLCJ2ZXIiOiIxLjAiLCJ4bXNfc3QiOnsic3ViIjoiYnFrU2dmUGdRXzA3M2d4R3cwU1p4RWdKLWEtbGxNd2RkTjI4ZWVCSEkycyJ9LCJ4bXNfdGNkdCI6MTU2MzcwODE1MH0.fCJ0DvbkkvvovdCD5uNDV_3FYESnokB_dtkZD1LzBFRYXKGC9Oww8WROabb8qQv-FgKS6N1YMsgj9BQv5b47TBJUM3UuvOVJ5mcnSLXvW8yRQiI4CqI0YMrNdo4_qzWYfDtXkRNl_O3R-AMwT33T4dddKrHzV04MqWiFqe2a3SzSaB3LFcuzrXAvbPWC9RSu7sv7DiJzmqJbDa18lpm27c9rqyAyg9Y5MudJy1Yy_5lSIKr_-OIvauT0QEg3cdycmiK4uqMxd5jkVEopF69GUx_MkrPqoihYDLNmdU4Y6fRqt40HNqKePs0TfxqOrKJyQulm1G3N__Mg63XNx13Jsw'
        // const oauthToken = oauth2.accessToken.create(token);

        const accessToken = await tokens.getRefreshedTokenAsync(oauthToken);
        logger.error("oauthToken = ", oauthToken)
        logger.error("accessToken = ", accessToken)
        const teams = require('./teams');
        // await teams.pollTeamsForMessagesAsync(accessToken)
    } catch (err) {
        logger.error("checkForMessagesWithoutUserLogon()\n" + util.inspect(err) + "\n" + err.stack)
    }
}

checkForMessagesWithoutUserLogon()
//setInterval(checkForMessagesWithoutUserLogon, 5000);

module.exports = app;