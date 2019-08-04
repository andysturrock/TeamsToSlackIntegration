'use strict'
require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var flash = require('connect-flash');
var util = require('util')

const passport = require('./oauth/passport')

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRouter = require('./routes/auth');
var teamsRouter = require('./routes/teams');
var messagesRouter = require('./routes/messages');

var app = express();

// Session middleware
app.use(session({
    store: new RedisStore(),
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));

// Flash middleware
app.use(flash());

// Set up local vars for template layout
app.use(function (req, res, next) {
    // Read any flashed errors and save
    // in the response locals
    res.locals.error = req.flash('error_msg');

    // Check for simple error string and
    // convert to layout's expected format
    var errs = req.flash('error');
    for (var i in errs) {
        res.locals.error.push({ message: 'An error occurred', debug: errs[i] });
    }

    next();
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

var hbs = require('hbs');
var moment = require('moment');
// Helper to format date/time sent by Graph
hbs.registerHelper('eventDateTime', function (dateTime) {
    return moment(dateTime).format('M/D/YY h:mm A');
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

app.use(function (req, res, next) {
    // Set the authenticated user in the
    // template locals
    if (req.user) {
        res.locals.user = req.user.profile;
    }
    next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/auth', authRouter);
app.use('/teams', teamsRouter);
app.use('/messages', messagesRouter);

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
    res.status(err.status || 500);
    res.render('error');
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
        var teams = require('./teams');
        await teams.pollTeamsForMessagesAsync(accessToken)
    } catch (err) {
        console.log("Error checkForMessagesWithoutUserLogon(): " + util.inspect(err) + err.stack)
    }
}

setInterval(checkForMessagesWithoutUserLogon, 5000);

module.exports = app;