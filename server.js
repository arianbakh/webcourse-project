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
var lastOnline = {}; // username: datetime

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

function getMessageContext(message) {
  return {
    avatar: 1,  // TODO
    from: message.from,
    date: formatDate(message.datetime),
    time: formatAMPM(message.datetime),
    text: message.text
  };
}

function getHistory(username, friendUsername) {
  var history = new Array();
  for (var i = 0; i < messages.length; i++) {
    if ((messages[i].to === friendUsername && messages[i].from === username) || (messages[i].to === username && messages[i].from === friendUsername)) {
      history.push(messages[i]);
      messages[i].delivered = true;
    }
  }
  history.sort(function (a, b) {
    return (b.datetime - a.datetime) * -1; // from oldest to newest
  });
  var result = new Array();
  for (var i = 0; i < history.length; i++) {
    result.push(getMessageContext(history[i]));
  }
  return result;
}

function getNumberOfUnreceivedMessages(username, friendUsername) {
  var count = 0;
  for (var i = 0; i < messages.length; i++) {
    if (messages[i].to === username && messages[i].from === friendUsername && messages[i].delivered === false) {
      count++;
    }
  }
  return count;
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

  var context = getMessageContext(tmpMessage);
  io.to(clients[message.from]).emit('chat message', context);
  if (clients.hasOwnProperty(message.to)) { // don't send messages to offline/non-existing users
    var toSocket = io.sockets.connected[clients[message.to]];
    toSocket.emit('chat message', context, function () {
      tmpMessage['delivered'] = true;
    });
  }
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
      lastOnline[username] = new Date();
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
        undelivered: {},
        avatar: 1  // TODO
      };
      // send friends
      if (friends.hasOwnProperty(username)) {
        context['friends'] = friends[username];
        for (var i = 0; i < friends[username].length; i++) {
          var friend = friends[username][i];
          context['undelivered'][friend] = getNumberOfUnreceivedMessages(username, friend);
        }
      }
      else {
        context['friends'] = new Array();
      }
      fn(context);
    }
    else {
      console.log('invalid login');
    }
  });

  socket.on('add friend', function(friendUsername, fn) {
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
            // not DRY
            friends[username].push(friendUsername);
            if (fn) {
              fn(getNumberOfUnreceivedMessages(username, friendUsername));
            }
          }
        }
        else { // user had no friends before
          if (friendUsername !== username) { // shouldn't add himself as a friend
            friends[username] = new Array();
            // not DRY
            friends[username].push(friendUsername);
            if (fn) {
              fn(getNumberOfUnreceivedMessages(username, friendUsername));
            }
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
        clients.hasOwnProperty(message.from) &&
        username &&
        message.from === username &&
        message.hasOwnProperty('to')) {
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
    else if (lastOnline.hasOwnProperty(friendUsername)) {
      status += ' (last seen at ' + formatDate(lastOnline[friendUsername]) + ' ' + formatAMPM(lastOnline[friendUsername]) + ')';
    }
    var context = {
      status: status,
      history: getHistory(username, friendUsername)
    };
    fn(context);
  });
});

http.listen(8888, function() {
  console.log('listening on port 8888...');
});

