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
    socket.emit('login', value);
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
  // console.log(selectedFriend);
  // TODO contact server
  // TODO get history
  // TODO get if the guy is online
}

function addFriend(e) {
  if(e.keyCode == 13)
  {
    var value = $(this).val();
    if (value !== '') {
      var friendExists = false;
      for (var i = 0; i < friends.length; i++)
      {
        if (friends[i] === value)
        {
          friendExists = true;
          break;
        }
      }
      if (!friendExists)
      {
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

  socket.on('update personal info', function(context) {
    var source = $("#personal-info-template").html();
    var template = Handlebars.compile(source);
    var html = template(context);
    $('#user-info').append(html);
    // TODO get list of friends and whether or not they have undelivered messages
    $('.friend').click(selectFriend);
  });

  socket.on('chat message', function(context) {
    var source = $("#message-template").html();
    var template = Handlebars.compile(source);
    var html = template(context);
    $('#messages').children().eq(0).append(html);
  });
});

