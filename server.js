var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var MongoClient = require('mongodb').MongoClient;
var assert = require('assert')
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/chat';

var clients = {};
var friends = {};

app.use(express.static(__dirname));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

///////////////////////
// utility functions //
///////////////////////
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
  var month = date.getMonth() + 1;
  var day = date.getDate();
  month = month < 10 ? '0' + month : month;
  day = day < 10 ? '0' + day : day;
  return month + '/' + day;
}

/////////////////////
// event functions //
/////////////////////
function saveMessage(message, callback) {
  // TODO save message on RAM (also delivered or not -> find out from wheter or not message.to is online)
  // TODO save message on db
  callback(message);
}

function sendMessageToUser(message) {
  var date = new Date();
  var context = {
    avatar: 2,  // TODO
    name: message.from,
    date: formatDate(date),
    time: formatAMPM(date),
    text: message.text
  };
  io.to(clients[message.from]).emit('chat message', context);
  io.to(clients[message.to]).emit('chat message', context);
}

function saveUser(username, callback) {
  // TODO save user on db
  callback(username);
}

function sendUserData(username) {
  var context = {
    username: username,
    avatar: 1  // TODO
  };
  io.to(clients[username]).emit('update personal info', context);
  // TODO send user's page: friends list, unreceived messages
}

//////////
// main //
//////////
io.on('connection', function(socket) {
  var username = '';

  console.log('a user connected to socket ' + socket.id);

  socket.on('disconnect', function() {
    if (username !== '') {
      delete clients[username];
      console.log(username + ' disconnected');
    }
    else {
      console.log('unknown user disconnected');
    }
  });

  socket.on('login', function(tmpUsername) {
    if (tmpUsername !== '') {
      console.log(tmpUsername + ' logged in');
      username = tmpUsername;
      clients[username] = socket.id;
      saveUser(username, sendUserData);
    }
    else {
      console.log('invalid login');
    }
  });

  socket.on('add friend', function(friendUsername) {
    if (username !== '') {
      if (friendUsername !== '') {
        // TODO add to friends
      }
      else {
        console.log('discarded invalid friend for '+ username);
      }
    }
    else {
      console.log('discarded invalid friend for unknown usrname');
    }
  });

  socket.on('chat message', function(message) {
    if (message &&
        message.hasOwnProperty('text') &&
        message.text !== '' &&
        message.hasOwnProperty('from') &&
        clients.hasOwnProperty(message.to) &&
        username &&
        message.from === username &&
        message.hasOwnProperty('to') &&
        clients.hasOwnProperty(message.to)) {
      console.log(message.from + ' said: ' + message.text);
      saveMessage(message, sendMessageToUser);
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

