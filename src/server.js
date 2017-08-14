const express = require('express');
const session = require('express-session');
const passport = require('./passport');
const issuer = require('./issuer');
const client = require('./client');
const ejs = require('ejs');

const bodyParser = require('body-parser');
const bluebird = require('bluebird');
const redis = require('redis');
const connectRedis = require('connect-redis');
const RedisStore = connectRedis(session);

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);


const redisClient = redis.createClient({ url: `redis://127.0.0.1:6379` }); // TODO: redis url hard coded, should change
redisClient.on('error', (err) => {
    console.log(err);
});
redisClient.on('connect', () => {
    console.log('Redis Connect Successfully');
});



const app = express();



app.engine('html', ejs.renderFile);
app.set('view engine', 'html');



const sessionStore = new RedisStore({ client: redisClient });
app.use(session({
    secret: 'demo',
    name: 'demo.sid',
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    store: sessionStore,
    unset: 'destroy',

}));
app.use(passport.initialize());
app.use(passport.session());


app.get('/', (req, res) => {
    res.redirect('/login')
});

app.get('/login', passport.authenticate('open-id'), async (req, res) => {
    // store (OP session ID)-(RP session ID) key-value pair to redis, for back channel logout.
    console.log(`--> 0: ${req.sessionID}`)
    console.log(`--> 1: ${JSON.stringify(req.user.tokenset.id_token)}`)
    const parts = req.user.tokenset.id_token.split('.');
    const base64url = require('base64url');
    const payload = JSON.parse(base64url.decode(parts[1]));
    console.log(`--> 3: payload: ${JSON.stringify(payload)}`)

    await redisClient.setAsync(`bc:${payload.sid}`, `sess:${req.sessionID}`);
    res.redirect('/welcome');
});

app.get('/welcome', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }
    res.render('index', {
        id_token: req.user.tokenset.id_token,
        user_name: req.user.user_name,
        company_name: req.user.company_name,
        id: req.user.sub });
});

app.get('/logout', (req, res) => {
    if (!req.user) {
        return res.redirect('/login');
    }

    // clear Browser session id
    res.clearCookie('demo.sid');

    // revoke open-id tokens
    const accessToken = req.user.tokenset.access_token;
    const refreshToken = req.user.tokenset.refresh_token;
    const idToken = req.user.tokenset.id_token;
    const endSessionEndpoint = issuer.end_session_endpoint;
    try {
        client.revoke(accessToken, 'access_token');
        client.revoke(refreshToken, 'refresh_token');
    } catch (e) {
        console.log('token revoke failed')
    }

    // nodify OP logout. PS: which will call back RP /backchannellogout
    const redirectUri = client.post_logout_redirect_uris[0];
    res.redirect(
        `${endSessionEndpoint}?id_token_hint=${idToken}&post_logout_redirect_uri=${redirectUri}`
    );
});

app.post('/backchannellogout', bodyParser.urlencoded({ extended: true }), async (req, res) => {
    // validate logout_token
    console.log(`--> logout req boddy: ${JSON.stringify(req.body)}`);
    const logoutToken = req.body.logout_token;

    const parts = logoutToken.split('.');
    const base64url = require('base64url');
    const header = JSON.parse(base64url.decode(parts[0]));
    const payload = JSON.parse(base64url.decode(parts[1]));

    console.log(`--> header: ${JSON.stringify(header)}`)
    console.log(`--> payload: ${JSON.stringify(payload)}`)


    const jose = require('node-jose');
    const key = await issuer.key(header)
    console.log(`--> key: ${JSON.stringify(key)}`)
    try {
        await jose.JWS.createVerify(key).verify(logoutToken)
        console.log(`--> token validate!`)
    } catch (err) {
        console.log(`--> validate err: ${err}`)
    }

    // get RP session ID from redis
    const demoSid = await redisClient.getAsync(`bc:${payload.sid}`);
    console.log(`--> get bc key: ${demoSid}`);

    // delete RP session, and key-value pair in redis
    await redisClient.delAsync(demoSid);
    await redisClient.delAsync(`bc:${payload.sid}`);

    res.status(200).end();
});

module.exports = app;
