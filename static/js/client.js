var socket = io();
var username = '';
var selectedFriend = '';
var friends = new Array();

function init () {
  $('#friends-list').hide();
  $('#messages-pane').hide();
  $('#login-modal').modal('show');
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
      // TODO get list of friends and whether or not they have undelivered messages
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

  // TODO NOW get if the guy is online from server
  // TODO NOW get history from server
}

function addFriend(e) {
  if(e.keyCode == 13)
  {
    var value = $(this).val();
    if (value !== '') {
      var friendExists = false;
      for (var i = 0; i < friends.length; i++) {
        if (friends[i] === value) {
          friendExists = true;
          break;
        }
      }
      if (!friendExists)
      {
        friends.push(value);
        var context = {
          username: value
        };
        var source = $("#friend-template").html();
        var template = Handlebars.compile(source);
        var html = template(context);
        $('#roster').append(html);
        $('#roster').children().last().click(selectFriend);
        $(this).val('');
        // TODO contact server
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

  socket.on('chat message', function(message) {
    var senderIsAFriend = (message.from === username); // consider self as a friend
    for (var i = 0; i < friends.length; i++) {
      if (message.from === friends[i]) {
        senderIsAFriend = true;
        break;
      }
    }
    if (senderIsAFriend) { // ignore message if it is not from friends
      if (message.from === selectedFriend || message.from === username) { // add message to messages pane
        var source = $("#message-template").html();
        var template = Handlebars.compile(source);
        var html = template(message);
        $('#messages').children().eq(0).append(html);
      }
      else { // add message to notifications
        var friendElement = $('#roster a span:contains(' + message.from + ')').parent();
        var notificationElement = friendElement.find('div.ui.blue.label');
        if (notificationElement.length === 0) {
          friendElement.append('<div class="ui blue label">1</div>');
        }
        else {
          var notificationCount = parseInt(notificationElement.html()) + 1;
          notificationElement.html(notificationCount);
        }
      }
    }
  });
});

