const express = require('express');
const app = express();
const https = require('https');
const fs = require('fs');
const { Server } = require("socket.io");
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/chat', { useNewUrlParser: true, useUnifiedTopology: true });

const messageSchema = new mongoose.Schema({
  message: String,
  timestamp: Date
});

const Message = mongoose.model('Message', messageSchema);

var options = {
  key: fs.readFileSync('/etc/letsencrypt/live/kappaw.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/kappaw.com/fullchain.pem')
};

const server = https.createServer(options, app);
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  socket.on('chat message', (data) => {
    const timestamp = new Date(data.timestamp);
    const fullMsg = `${timestamp.toISOString()} ${data.msg}`;
    io.emit('chat message', fullMsg);
    const server_timestamp = new Date(); 

    const message = new Message({ message: fullMsg, timestamp: server_timestamp });
    message.save().catch(err => console.error(err));
  });
});

server.listen(443, () => {
  console.log('listening on *:443');
});
