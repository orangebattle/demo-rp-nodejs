const app = require('./src/server');
const port = 3001;
app.listen(port, () => {
    console.log(`server listen to port ${port}`);
});
