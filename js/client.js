$(document).ready(function() {
  var socket = io();
  $('form').submit(function() {
    socket.emit('chat message', $('#message_box').val());
    $('#message_box').val('');
    return false;
  });
  socket.on('chat message', function(msg){
    $('#messages').append($('<li>').text(msg));
  });
});

