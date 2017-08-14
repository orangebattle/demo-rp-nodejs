const issuer = require('./issuer');

// TODO:rpconfig hard coded, uri should change
const rpConfig = {
    client_id: "demo-nodejs",
    client_secret: "demo-secret-nodejs",
    redirect_uris: ["http://localhost:3001/login"],
    post_logout_redirect_uris: ["http://localhost:3001/login"]
};

const Client = issuer.Client;

const client = new Client(rpConfig);
client.CLOCK_TOLERANCE = 30; // to allow a 30 seconds skew

module.exports = client;
