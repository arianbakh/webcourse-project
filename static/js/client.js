$(document).ready(function() {
  var socket = io();

  $('#login-modal').modal('show');

  var username = '';

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
    if (username !== '') {
      var value = $('#message-box').val();
      if (value !== '') {
        socket.emit('chat message', value);
        $('#message-box').val('');
      }
    }
    return false;
  }

  $('#submit-button').click(sendMessage);
  $('#message-form').submit(sendMessage);

  socket.on('chat message', function(context) {
    var source   = $("#message-template").html();
    var template = Handlebars.compile(source);
    var html = template(context);
    $('#messages').children().eq(0).append(html);
  });
});

