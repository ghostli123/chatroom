const express = require("express");
const app = express();
const https = require("https");
const fs = require("fs");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost/chat", {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

const messageSchema = new mongoose.Schema({
	username: String,
	message: String,
	timestamp: Date,
});

const Message = mongoose.model("Message", messageSchema);

var options = {
	key: fs.readFileSync("/etc/letsencrypt/live/kappaw.com/privkey.pem"),
	cert: fs.readFileSync("/etc/letsencrypt/live/kappaw.com/fullchain.pem"),
}; const server = https.createServer(options, app);
const io = new Server(server);

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/index.html");
});

let usernames = new Set();

function generateRandomUsername() {
	const adjectives = [
		"quick",
		"lazy",
		"friendly",
		"quiet",
		"proud",
		"happy",
		"thoughtful",
		"resonant",
		"sleepy",
		"slow",
	];
	const nouns = [
		"fox",
		"dog",
		"cat",
		"mouse",
		"hamster",
		"lizard",
		"koala",
		"parrot",
		"dolphin",
		"whale",
	];

	let username;
	do {
		const randomAdjective =
			adjectives[Math.floor(Math.random() * adjectives.length)];
		const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
		const randomNumber = Math.floor(Math.random() * 100);
		username = `${randomAdjective}-${randomNoun}-${randomNumber}`;
	} while (usernames.has(username));

	usernames.add(username);

	return username;
}

const cookie = require("cookie");

io.on("connection", (socket) => {
	Message.find()
		.sort("-timestamp")
		.limit(10)
		.exec()
		.then((messages) => {
			// 发送历史消息
			socket.emit("history", messages);
		})
		.catch((err) => {
			// 处理错误
			console.error(err);
		});
	let cookies = cookie.parse(socket.handshake.headers.cookie || "");
	let username = cookies.username;

	// if the cookie doesn't exist, create a new username
	if (!username) {
		username = generateRandomUsername();
		socket.emit("set cookie", username);
	}

	socket.on("chat message", (data) => {
		// const timestamp = new Date(data.timestamp);
		// const userIP = (socket.request.connection.remoteAddress || socket.request.headers['x-forwarded-for']).replace(/^::ffff:/, '');
		const server_timestamp = new Date();
		const fullMsg = `${server_timestamp.toISOString()} ${username} ${data.msg}`;
		io.emit("chat message", fullMsg);

		const message = new Message({
			username: `${username}`,
			message: `${data.msg}`,
			timestamp: server_timestamp,
		});
		message.save().catch((err) => console.error(err));
	});
});

server.listen(443, () => {
	console.log("listening on *:443");
});
