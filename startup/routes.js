const defualt = require('../routes/index');
const auth = require('../routes/auth');
const user = require('../routes/user');

module.exports = function(app){
    app.use('/', defualt),
    app.use('/api/v1/auth', auth),
    app.use('/api/v1/user', user)
};

