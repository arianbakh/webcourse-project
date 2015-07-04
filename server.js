var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
  console.log('a user connected');

  socket.on('disconnect', function() {
    console.log('user disconnected');
  });

  socket.on('chat message', function(message) {
    console.log('message: ' + message);
    io.emit('chat message', message);
  });
});

http.listen(8888, function() {
  console.log('listening on port 8888...');
});

