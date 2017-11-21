var child_process = require("child_process");

var Game = require("./Game.js");
var GameClient = require("./GameClient.js");

var gameProcFile = __dirname + "/game_proc.js";

var GameRoom = function(io, uuid, username1, username2) {
	this.io = io;
	this.uuid = uuid;
	
	this.username1 = username1;
	this.username2 = username2;
	
	this.creationTime = new Date().getTime();
	
	this.gameProc = child_process.fork(gameProcFile);
	
	this.game = new Game(this.io, this.uuid);
	this.game.init();
	this.running = false;
	
	this.clients = [];
	
	this.turn = true;
	this.winner = 0;
	
	this.startGame = function() {
		this.gameProc.send("start");
		this.running = true;
	};
	
	this.endGame = function() {
		if (this.running === true) {
			this.gameProc.kill('SIGINT');
			this.running = false;
		}
		
		for (var i = 0; i < this.clients.length; ++i) {
			this.clients[i].terminate();
		}
		
		console.log("Game room closed: " + this.uuid);
	};
	
	this.onConnect = function(socket) {
		if (this.clients.length < 2) {
			if (this.clients.length === 0) {
				this.clients.push(new GameClient(this.game, this.uuid, socket, this.username1));
			}
			else {
				if (this.clients[0].username === this.username1) {
					this.clients.push(new GameClient(this.game, this.uuid, socket, this.username2));
				}
				else {
					this.clients.push(new GameClient(this.game, this.uuid, socket, this.username1));
				}
			}
		}
		
		return true;
	}.bind(this);
	
	this.onDisconnect = function(socket) {
		for (var i = 0; i < this.clients.length; ++i) {
			var client = this.clients[i];
			if (client.socket.id === socket.id) {
				client.disconnect();
				
				if (this.winner === 0) {
					if (i === 0) {
						this.winner = 2;
					}
					else if (i === 1) {
						this.winner = 1;
					}
					
					//this.endGame();
				}
				
				this.clients.splice(i, 1);
				return true;
			}
		}
		
		return false;
	}.bind(this);
	
	this.onMove = function(data) {
		
	}.bind(this);
	
	this.onTimeout = function() {
		if (this.clients.length === 0) {
			this.endGame();
		}
	}.bind(this);
	
	this.gameProc.on('message', function(msg) {
		for (var i = 0; i < this.clients.length; ++i) {
			this.clients[i].socket.emit("state", msg);
		}
	}.bind(this));
};

module.exports = GameRoom;