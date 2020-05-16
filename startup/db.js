const mongoose = require('mongoose');

module.exports = function() {
  const db = 'mongodb://asfar:asfar@sikay-shard-00-00-xqopv.mongodb.net:27017,sikay-shard-00-01-xqopv.mongodb.net:27017,sikay-shard-00-02-xqopv.mongodb.net:27017/test?replicaSet=Sikay-shard-0&ssl=true&authSource=admin';
  mongoose
    .connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log(`Connected to ${db}...`))
    .catch((err) => console.log('Not connected'+ err));
};