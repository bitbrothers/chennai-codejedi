/**
 * Module dependencies.
 */

var express = require('express');
var cookieParser = require('cookie-parser');
var compress = require('compression');
var session = require('express-session');
var bodyParser = require('body-parser');
var logger = require('morgan');
var errorHandler = require('errorhandler');
var csrf = require('lusca').csrf();
var methodOverride = require('method-override');

var _ = require('lodash');
var MongoStore = require('connect-mongo')(session);
var path = require('path');
var mongoose = require('mongoose');
var expressValidator = require('express-validator');
var connectAssets = require('connect-assets');

//TODO Create a config function in secrets.js
//var secret = require('./config/secrets');
//var config = new secret();

var config = require('./config/secrets');

/**
 * Create Express server.
 */

var app = express();

/**
 * Connect to MongoDB.
 */

mongoose.connect(config.db);
mongoose.connection.on('error', function() {
  console.error('MongoDB Connection Error. Please make sure that MongoDB is running.');
});

/**
 * CSRF whitelist.
 */

var csrfExclude = ['/url1', '/url2'];

/**
 * Express configuration.
 */

app.set('port', process.env.PORT || 3000);
app.use(compress());
app.use(connectAssets({
  paths: [path.join(__dirname, 'public/css'), path.join(__dirname, 'public/js')]
}));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(methodOverride());
app.use(cookieParser());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: config.sessionSecret,
  store: new MongoStore({ url: config.db, auto_reconnect: true })
}));
/*
app.use(function(req, res, next) {
  // CSRF protection.
  if (_.contains(csrfExclude, req.path)) return next();
  csrf(req, res, next);
});
*/
app.use(function(req, res, next) {
  // Make user object available in templates.
  res.locals.user = req.user;
  next();
});
app.use(function(req, res, next) {
  // Remember original destination before login.
  var path = req.path.split('/')[1];
  if (/auth|login|logout|signup|fonts|favicon/i.test(path)) {
    return next();
  }
  req.session.returnTo = req.path;
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));


/**
 * Controllers (route handlers).
 */

var userController = require('./controllers/user');
var eventController = require('./controllers/event');
var teamController = require('./controllers/team');

var app = express();;

app.set('port', process.env.PORT || 3000);
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/auth/signup', userController.signup);
app.post('/api/auth/login', userController.login);
app.post('/api/auth/facebook', userController.facebookAuth);
app.post('/api/auth/google', userController.googleAuth);
app.get('/api/users', userController.hasEmail);

app.get('/api/events', eventController.getEvents);
app.get('/api/events/:id', eventController.getEvent);
app.post('/api/events', eventController.postEvent);
app.post('/api/events/:id/register', /*userController.isLogin, */
									eventController.postEventRegister);
app.post('/api/events/:id/unregister', userController.isLogin,
									eventController.postEventRegister);

//if these api calls give 400 then there is a problem in their positioning....if then jus change name to check functionality
app.put('/api/event/:eslug/team/:tslug/apply', teamController.postCreate,teamController.applyTeam);
app.put('/api/event/:eslug/team/:tslug/approval', teamController.postUpdate,teamController.approveMember);//send member to be approved in req.body.approval
app.put('/api/event/:eslug/team/:tslug/invite', teamController.postUpdate,teamController.inviteMember);
app.put('/api/event/:eslug/team/:tslug/accept', teamController.postCreate, teamController.acceptInvite);




app.get('/api/event/:eslug/teams', teamController.getallTeams);
app.post('/api/event/:eslug/team', teamController.postCreate, teamController.createTeam);
app.get('/api/event/:eslug/teamsearch',teamController.getTeams);
app.put('/api/event/:eslug/team/:tslug', teamController.postUpdate, teamController.updateTeam);
app.get('/api/event/:eslug/team/:tslug', teamController.searchTeamSlug);
app.delete('/api/event/:eslug/team/:tslug',teamController.deleteTeam);

app.put('/api/user',userController.updateProfile);
app.get('/api/user/:uslug',userController.getUserBySlug);

app.get('*', function(req, res) {
  res.redirect('/#' + req.originalUrl);
});

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.send(500, { message: err.message });
});

app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
