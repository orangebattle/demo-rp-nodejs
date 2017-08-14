const{ Strategy } = require('openid-client');
const passport = require('passport');
const client = require('./client');

const params = {
    scope: 'openid profile'
};

function openidPassport(client, params) {
    passport.serializeUser((user, done) => {
        done(null, user);
    });

    passport.deserializeUser((user, done) => {
        done(null, user);
    });

    passport.use('open-id', new Strategy({ client, params }, async (tokenset, userinfo, done) => {
        try {
            if (!userinfo) {
                return done(null, false, { message: 'Not Found.' });
            }
            let user = userinfo;
            user.tokenset = tokenset;
            return done(null, user);
        } catch (error) {
            return done(null, false, { message: error.message });
        }
    }));
    return passport;
}

module.exports = openidPassport(client, params);
