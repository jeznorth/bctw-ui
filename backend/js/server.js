/* Bare bones static file server */
//const fs = require('fs');
//const pg = require('pg');
const pug = require('pug');
const cors = require('cors');
const http = require('http');
const morgan = require('morgan');
const helmet = require('helmet');
const needle = require('needle');
const express = require('express');
// const compression = require('compression'); This messes with keycloak
const bodyParser = require('body-parser');
const expressSession = require('express-session');
const keycloakConnect = require('keycloak-connect');
const { json } = require('body-parser');

const sessionSalt = process.env.BCTW_SESSION_SALT;

const isProd = process.env.NODE_ENV === 'production' ? true : false;
const apiHost = process.env.BCTW_API_HOST;
const apiPort = process.env.BCTW_API_PORT;

const authorizedUsers = JSON.parse(process.env.BCTW_AUTHORIZED_USERS);

var memoryStore = new expressSession.MemoryStore();

// Keycloak config object (deprecates use of keycloak.json)
// see: https://wjw465150.gitbooks.io/keycloak-documentation/content/securing_apps/topics/oidc/nodejs-adapter.html
var keyCloakConfig = {
  authServerUrl: process.env.KEYCLOAK_SERVER_URL,
  clientId: process.env.KEYCLOAK_CLIENT_ID,
  public: true,
  realm: process.env.KEYCLOAK_REALM
};

// instantiate Keycloak Node.js adapter, passing in configuration
var keycloak = new keycloakConnect({
  store: memoryStore
}, keyCloakConfig);

var session = {
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 1,000 days
    secure: false
  },
  resave: false,
  saveUninitialized: true,
  secret: sessionSalt,
  store: memoryStore
};

/* ## proxyApi
  The api is not exposed publicly. This service is protected
  by Keycloak. So forward all authenticated traffic.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
const proxyApi = function (req, res, next) {
  const endpoint = req.params.endpoint; // The url

  // The parameter string
  const query = Object.keys(req.query).map( (key) => {
    return `${key}=${req.query[key]}`
  }).join('&');

  // The domain and username
  var url;
  if (isProd) {
    const cred = req.kauth.grant.access_token.content.preferred_username; 
    const domain = cred.split('@')[1];
    const user = cred.split('@')[0];
    console.log(`user: ${JSON.stringify(user)}`)
    url = `${apiHost}:${apiPort}/${endpoint}?${query}&${domain}=${user}`;
    console.log(`url: ${JSON.stringify(url)}`)
  } else {
    url = `${apiHost}:${apiPort}/${endpoint}?${query}&idir=user`;
  }

  console.log(url);
  // Right now it's just a get
  needle(url,(err,_,body) => {
    if (err) {
      console.error("Error communicating with the API: ",err);
      return res.status(500).json({error: err});
    }

    res.json(body);
  })
};

/* ## gardenGate
  Check that the user is authenticated before continuing.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
*/
const gardenGate = function (req, res, next) {
  if (keycloak.checkSso()) {
    return next();
  } else {
    console.log("User NOT authenticated; denying access")
    return res.status(404).send('<p>Error: You must be authenticated to use this application.</p>');
  }
};

/* ## notFound
  Catch-all router for any request that does not have an endpoint defined.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
 */
const notFound = function (req, res) {
  return res.status(404).send('<p>Sorry... You must be lost &#x2639;.</p>');
};

/* ## pageHandler
  Pass-through function for Express.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
const pageHandler = function (req, res, next) {
  return next();
};

/* ## authenticate
  After keycloak has been authenticated we need to check if 
  the account has access to the site.
  If yes... Pass through.
  If not... Redirect to access-denied page.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
const authenticate = function (req,res,next) {
  // Pass through if in dev or keycloak isn't configured yet
  if (!isProd || !req.kauth.grant) {
    return next();
  }

  /*
    Check if keycloak user has access.
    If something's wrong with the keycloak info... Don't crash the server.
   */
  try {
    const domain = req.kauth.grant.access_token.content.preferred_username; 
    const user = domain.split('@')[0];
    if (authorizedUsers.includes(user)) {
      next(); // Authorized... pass through
    } else {
      res.render('denied',req); // Nope... Denied
    }
  } catch (err) { // Something's wrong with keycloak
    console.error("Failed to authenticate:",err)
    res.render('denied',req); // Denied
  }
};


/* ## denied
  The route to the denied service page
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
*/
const denied = function (req,res) {
  res.render('denied',req);
}

// use enhanced logging in non-production environments
const logger = isProd ? 'combined' : 'dev';

// Server configuration
var app = express()
  .use(helmet())
  .use(cors())
  .use(morgan(logger))
  .use(bodyParser.json({
    limit: '50mb'
  }))
  .use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true
  }))
  .use(expressSession(session))
  .use(keycloak.middleware())
  .use(gardenGate) // Keycloak Gate
  .use(authenticate) // BCTW Gate
  .get('/denied',denied);

// Use keycloak authentication only in Production
if (isProd) {
  app
    .get('/', keycloak.protect(), pageHandler)
    .get('/api/:endpoint', keycloak.protect(), proxyApi)
} else {
  app
    .get('/api/:endpoint', proxyApi)
    .get('/', pageHandler)
}

// Remaining server configuration
app
  .use(express['static']('frontend/www'))
  .use(express['static']('frontend/dist'))
  .set('view engine', 'pug')
  .set('views', 'backend/pug')
  .get('*', notFound);

// Start server
http.createServer(app).listen(8080);
