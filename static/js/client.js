$(document).ready(function() {
  var socket = io();

  $('#login-modal').modal('show');

  function sendMessage() {
    socket.emit('chat message', $('#message-box').val());
    $('#message-box').val('');
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

