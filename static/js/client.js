$(document).ready(function() {
  var socket = io();

  $('#login-modal').modal('show');

  var username = '';
  var selectedFriend = '';

  function login() {
    var value = $('#username-input').val();
    if (value !== '') {
      username = value;
      socket.emit('login', value);
      $('#username-input').val('');
      $("#message-box").prop('disabled', false);
      $('#login-modal').modal('hide');
    }
    return false;
  }

  $('#login-button').click(login);
  $('#login-form').submit(login);

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

  function selectFriend () {
    selectedFriend = $(this).children().eq(0).html();
    console.log(selectedFriend);
    // TODO unselect all and select this one
    // TODO contact server
    // TODO get history
    // TODO get if the guy is online
    // TODO show the conversation div at this stage
  }

  $('#add-friend-input').keyup(function(e) {
    if(e.keyCode == 13)
    {
      var value = $(this).val();
      if (value !== '') {
        var context = {
          username: value
        };
        var source = $("#friend-template").html();
        var template = Handlebars.compile(source);
        var html = template(context);
        $('#roster').append(html);
        $('.friend').click(selectFriend);
        $(this).val('');
        // TODO don't add if there already is a person with that name
        // TODO contact server
      }
    }
  });
});

