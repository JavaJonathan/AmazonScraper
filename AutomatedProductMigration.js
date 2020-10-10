const { count } = require('console'), Bot = require('./Bot.js'), { Agent } = require('http');

Bot.start()

//We have this download functionality for just in case
// function download(uri, filename, callback) 
// {
//   request.head(uri, function(err, res, body){
//     console.log('content-type:', res.headers['content-type']);
//     console.log('content-length:', res.headers['content-length']);

//     request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
//   });
// };

// download('https://images-na.ssl-images-amazon.com/images/I/61ETmnP83rL._AC_SL1500_.jpg', 'google.png', function(){
//   console.log('done');
// });