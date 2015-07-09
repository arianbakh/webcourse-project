var socket = io();
var username = '';
var selectedFriend = '';
var friends = new Array();

var window_focus;
$(window).focus(function() {
    window_focus = true;
}).blur(function() {
    window_focus = false;
});


function init () {
  $('#friends-list').hide();
  $('#messages-pane').hide();
  $('#login-modal').modal('show');
}

function renderFriend(friendUsername) {
  friends.push(friendUsername);
  var context = {
    username: friendUsername
  };
  var source = $("#friend-template").html();
  var template = Handlebars.compile(source);
  var html = template(context);
  $('#roster').append(html);
  $('#roster').children().last().unbind('click'); // so that the event won't be called multiple times
  $('#roster').children().last().click(selectFriend);
}

function renderMessage(message) {
  var source = $("#message-template").html();
  var template = Handlebars.compile(source);
  var html = template(message);
  $('#messages').children().eq(0).append(html);
}

function renderNotification(friendUsername, addCount) {
  var friendElement = $('#roster a span:contains(' + friendUsername + ')').parent();
  var notificationElement = friendElement.find('div.ui.blue.label');
  if (notificationElement.length === 0) {
    friendElement.append('<div class="ui blue label">' + addCount + '</div>');
  }
  else {
    var notificationCount = parseInt(notificationElement.html()) + addCount;
    notificationElement.html(notificationCount);
  }
}

function login() {
  var value = $('#username-input').val();
  if (value !== '') {
    username = value;
    socket.emit('login', value, function(context) {
      var source = $("#personal-info-template").html();
      var template = Handlebars.compile(source);
      var html = template(context);
      $('#user-info').append(html);
      for (var i = 0; i < context.friends.length; i++) {
        friends.push(context.friends[i]);
        renderFriend(context.friends[i]);
      }

      // whether or not friends have undelivered messages
      for (var key in context.undelivered) {
        var count = context.undelivered[key];
        if (count > 0) {
          renderNotification(key, count);
        }
      }

      $('.friend').unbind('click'); // so that the event won't be called multiple times
      $('.friend').click(selectFriend); // add click event for friends after initially loading them
    });
    $('#username-input').val('');
    $("#message-box").prop('disabled', false);
    $('#login-modal').modal('hide');
    $('#friends-list').show();
  }
  return false;
}

function selectFriend () {
  selectedFriend = $(this).children().eq(0).html();
  $('.active.green.item.friend').removeClass('active green');
  $(this).addClass('active green');
  $('#friend-name').html(selectedFriend);
  $('#messages-pane').show();

  // if there are notifications, remove them
  var notificationElement = $(this).find('div.ui.blue.label');
  if (notificationElement.length !== 0) {
    notificationElement.remove();
  }

  $('#messages').children().eq(0).children().remove(); // clear previous messages

  socket.emit('select friend', selectedFriend, function (context) {
    $('#status').html(context.status);
    for (var i = 0; i < context.history.length; i++) {
      renderMessage(context.history[i]);
    }
  });
}

function addFriend(e) {
  if(e.keyCode == 13)
  {
    var value = $(this).val();
    if (value !== '') {
      var friendExists = (value === username); // shouldn't add himself as a friend
      for (var i = 0; i < friends.length; i++) {
        if (friends[i] === value) {
          friendExists = true;
          break;
        }
      }
      if (!friendExists)
      {
        renderFriend(value);
        $(this).val('');
        socket.emit('add friend', value, function(undeliveredCount) {
          // get undelivered messages from new friend
          if (undeliveredCount > 0) {
            renderNotification(value, undeliveredCount);
          }
        });
      }
    }
  }
}

function sendMessage() {
  if (username !== '' && selectedFriend !== '') {
    var value = $('#message-box').val();
    if (value !== '') {
      var message = {
        from: username,
        to: selectedFriend,
        text: value
      };
      socket.emit('chat message', message);
      $('#message-box').val('');
    }
  }
  return false;
}

$(document).ready(function() {
  init();

  $('#login-button').click(login);
  $('#login-form').submit(login);

  $('#add-friend-input').keyup(addFriend);

  $('#submit-button').click(sendMessage);
  $('#message-form').submit(sendMessage);

  socket.on('chat message', function(message, fn) {
    var senderIsAFriend = (message.from === username); // consider self as a friend
    for (var i = 0; i < friends.length; i++) {
      if (message.from === friends[i]) {
        senderIsAFriend = true;
        break;
      }
    }
    if (senderIsAFriend) { // ignore message if it is not from friends
      // desktop notification
      if (!window_focus) {
        var notificationText = message.from + ' has sent you a message!';
        if (!("Notification" in window)) {
          console.log("This browser does not support system notifications");
        }
        else if (Notification.permission === 'granted') {
          var notification = new Notification(notificationText);
        }
        else if (Notification.permission !== 'denied') {
          Notification.requestPermission(function (permission) {
            if (permission === "granted") {
              var notification = new Notification(notificationText);
            }
          });
        }
      }

      if (message.from === selectedFriend || message.from === username) { // add message to messages pane
        renderMessage(message);
        if (fn) { // the callback is not always passed for some reason
          fn(); // mark the message as delivered (seen)
        }
      }
      else { // add message to notifications
        renderNotification(message.from, 1);
      }
    }
  });
});

