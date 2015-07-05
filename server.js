var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var MongoClient = require('mongodb').MongoClient;
var assert = require('assert')
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/chat';

app.use(express.static(__dirname));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

function formatAMPM(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0' + minutes : minutes;
  var strTime = hours + ':' + minutes + ampm;
  return strTime;
}

function formatDate(date) {
  var month = date.getMonth();
  var day = date.getDate();
  month = month < 10 ? '0' + month : month;
  day = day < 10 ? '0' + day : day;
  return month + '/' + day;
}

var clients = {};

io.on('connection', function(socket) {
  var username = '';

  console.log('a user connected to socket ' + socket.id);

  socket.on('disconnect', function() {
    if (username === '') {
      console.log('unknown user disconnected');
    }
    else {
      delete clients[username];
      console.log(username + ' disconnected');
    }
  });

  socket.on('login', function(tmpUsername) {
    if (tmpUsername === '') {
      console.log('invalid login');
    }
    else {
      username = tmpUsername;
      clients[username] = socket.id;
      console.log(username + ' logged in');
      var context = {
        username: username,
        avatar: 1
      };
      io.to(socket.id).emit('update personal info', context);
      // TODO initialize user's page: friends list, unreceived messages
    }
  });

  socket.on('chat message', function(message) {
    if (message && message.hasOwnProperty('text')  && message.text !== '' && message.hasOwnProperty('from') && message.from === username && message.hasOwnProperty('to')) {
      // TODO save in database (also delivered or not)
      console.log(username + ' said: ' + message.text);
      var date = new Date();
      var context = {
        avatar: 2,
        name: username ? username : '???',
        date: formatDate(date),
        time: formatAMPM(date),
        text: message.text
      };
      io.to(socket.id).emit('chat message', context);
      if (clients.hasOwnProperty(message.to)) {
        io.to(clients[message.to]).emit('chat message', context);
      }
      // TODO emit messages to others to both
    }
    else
    {
      console.log('discarded invalid message');
    }
  });
});

http.listen(8888, function() {
  console.log('listening on port 8888...');
});

