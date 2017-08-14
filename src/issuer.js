const{ Issuer } = require('openid-client');

Issuer.defaultHttpOptions = { retries: 5, timeout: 15000 };

// TODO:issuerUrl hard coded, issuerUrl should change.
const issuerUrl = 'https://accounts-test.cloudtrust.com.cn';

module.exports = new Issuer({
    issuer: issuerUrl,
    authorization_endpoint: `${issuerUrl}/auth`,
    end_session_endpoint: `${issuerUrl}/session/end`,
    token_endpoint: `${issuerUrl}/token`,
    userinfo_endpoint: `${issuerUrl}/me`,
    jwks_uri: `${issuerUrl}/certs`,
    revocation_endpoint: `${issuerUrl}/token/revocation`,
});
