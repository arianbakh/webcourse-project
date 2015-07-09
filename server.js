var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var MongoClient = require('mongodb').MongoClient;
var assert = require('assert')
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/chat';

var clients = {}; // username: socket id
var friends = {}; // username: list of friend usernames
var messages = new Array;

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

function getHistory(username) {
  // TODO
}

function getUnreceivedMessages(username) {
  // TODO
}

/////////////////////
// event functions //
/////////////////////
function sendMessageToUser(message) {
  var date = new Date();

  var tmpMessage = {
    to: message.to,
    from: message.from,
    text: message.text,
    datetime: date,
    delivered: false
  };
  messages.push(tmpMessage);

  var context = {
    avatar: 1,  // TODO
    from: message.from,
    date: formatDate(date),
    time: formatAMPM(date),
    text: message.text
  };
  io.to(clients[message.from]).emit('chat message', context);
  var toSocket = io.sockets.connected[clients[message.to]];
  toSocket.emit('chat message', context, function () {
    tmpMessage['delivered'] = true;
  });
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

  socket.on('login', function(tmpUsername, fn) {
    if (tmpUsername !== '') {
      console.log(tmpUsername + ' logged in');
      username = tmpUsername;
      clients[username] = socket.id;
      var context = {
        username: username,
        avatar: 1  // TODO
      };
      // send friends
      if (friends.hasOwnProperty(username)) {
        context['friends'] = friends[username];
      }
      else {
        context['friends'] = new Array();
      }
      // TODO NOW send number of unreceived messages for each friend
      fn(context);
    }
    else {
      console.log('invalid login');
    }
  });

  socket.on('add friend', function(friendUsername) {
    if (username !== '') {
      if (friendUsername !== '') {
        if (friends.hasOwnProperty(username)) {
          var friendExists = (friendUsername === username); // shouldn't add himself as a friend
          for (var i = 0; i < friends[username].length; i++) {
            if (friends[username][i] === friendUsername) {
              friendExists = true;
              break;
            }
          }
          if (!friendExists) {
            friends[username].push(friendUsername);
          }
        }
        else { // user had no friends before
          if (friendUsername !== username) { // shouldn't add himself as a friend
            friends[username] = new Array();
            friends[username].push(friendUsername);
          }
        }
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
      sendMessageToUser(message);
    }
    else
    {
      console.log('discarded invalid message');
    }
  });

  socket.on('select friend', function(friendUsername, fn) {
    var status = 'Offline';
    if (clients.hasOwnProperty(friendUsername)) {
      status = 'Online';
    }
    var context = {
      status: status,
      history: getHistory(username)
    };
    fn(context);
  });
});

http.listen(8888, function() {
  console.log('listening on port 8888...');
});

