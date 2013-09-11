var express = require('express'),
    app = express(),
    db = require('./config/dbschema'),
    pass = require('./config/pass'),
    passport = require('passport'),
    basic_routes = require('./routes/basic'),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    user_routes = require('./routes/user'),
    Room = require('./room.js'),
	uuid = require('node-uuid');

var canvas = [], clients = [], inRoomPeople = {};
var people = {}, rooms = {};

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.logger());
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.methodOverride());

app.use(express.session({ secret: 'keyboard cat' }));

app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);

app.use('/public', express.static('public'));
app.use('/public/zxcvbn', express.static('node_modules/zxcvbn/zxcvbn'));
app.use(express.static(__dirname + '/public'));

app.get('/', basic_routes.index);

app.post('/dmz/login', user_routes.postlogin);
app.get('/dmz/logout', user_routes.logout);

app.post('/dmz/signup', user_routes.signup);

app.get('/secure/account', user_routes.account);
app.post('/secure/account', user_routes.update);

Array.prototype.contains = function(k, callback) {
    var self = this;
    return (function check(i) {
        if (i >= self.length) {
            return callback(false);
        }
        if (self[i] === k) {
            return callback(true);
        }
        return process.nextTick(check.bind(null, i+1));
    }(0));
};

function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }
    return true;
}

///////////////////////////////////////////////////////////////////////////
///////////////////Socket.io block////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////

io.sockets.on('connection', function (socket) {
	var uname = null;
	
	socket.on("joinserver", function(name) {
		ownerRoomID = inRoomID = null;
		uname = name;
		people[name] = {"name" : name, "owns" : ownerRoomID, "inroom": inRoomID};
		socket.emit("update", "You have connected to the server.");
		io.sockets.emit("update", people[name].name + " is online.");
		io.sockets.emit("update-people", people);
		io.sockets.emit("roomList", {rooms: rooms});
		clients.push(name);		
	});

	socket.on("profRequest", function (data) {
		db.userModel.findOne({username:data}, function(err, data){
			socket.emit("profResponse", data);
		});
	});

	socket.on("send", function(msg) {
		if (io.sockets.manager.roomClients[socket.id]['/'+socket.room] !== undefined ) {
			io.sockets.in(socket.room).emit("chat", people[uname], msg);
	    	} else {
			socket.emit("update", "Please connect to a room.");
	    }
	});

	socket.on("disconnect", function() {
		if (people[uname]) {
			if (people[uname].inroom === null) {
				io.sockets.emit("update", people[uname].name + " has left the server.");			
				delete people[uname];
				io.sockets.emit("update-people", people);
			} 
			else {
				if (people[uname].owns !== null) {
					var room = rooms[people[uname].owns];
					io.sockets.in(socket.room).emit("homeRedirect");
					if (people[uname].owns === room.owner) {
						var i = 0;
						
					
							while(i < clients.length) {	
								if (clients[i] === room.people[i]) {
									people[clients[i]].inroom = null;					
									//people[clients[i]].socketid.leave(room.name);
																	
								}
						    	++i;
							}
						
						delete rooms[people[uname].owns];
					}					
				}
				else if(people[uname].inroom !== null){
					
					var roomTmp = rooms[people[uname].inroom];
					var tmp = rooms[people[uname].inroom];

					roomTmp.people.contains(uname, function(found) {
						    if (found) {
						    var personIndex = roomTmp.people.indexOf(uname);
							roomTmp.people.splice(personIndex, 1);
							
							io.sockets.emit("update", uname + " has left the room.");
							io.sockets.emit("roomList", {rooms: rooms});
							io.sockets.in(socket.roomTmp).emit("inRoomAdd", roomTmp.people, roomTmp.name);
						    }
					});						

				}
				io.sockets.emit("update", people[uname].name + " has left the server.");
				
				delete people[uname];

				io.sockets.emit("update-people", people);
				io.sockets.emit("roomList", {rooms: rooms});
				
	 		}
			var personIndex = clients.indexOf(uname);
			clients.splice(personIndex, 1);	
		}
	});

	socket.on("createRoom", function(name) {
		if (people[uname].owns === null) {
			var id = uuid.v4();
			var room = new Room(name, id, id);
			rooms[id] = room;
			io.sockets.emit("roomList", {rooms: rooms});
			//add room to socket, and auto join the creator of the room
			socket.room = name;
			socket.join(socket.room);

			people[uname].owns = id;
			people[uname].inroom = id;
			room.addPerson(people[uname].name);
			socket.emit("update", "Welcome to " + room.name + ".");

			

			io.sockets.emit("roomList", {rooms: rooms});
			io.sockets.in(socket.room).emit("inRoomAdd", rooms[id].people, room.name);
	
			socket.emit("sendRoomID", {id: id});
			socket.emit("drawEnable");
		} else {
			io.sockets.emit("update", "You have already created a room.");
		}
		
	});

	// when the client emits 'sendchat', this listens and executes
	
	socket.on("joinRoom", function(id) {
		var room = rooms[id];
		if (people[uname].owns === room.owner) {
			socket.emit("update", "You are the owner of this room and you have already been joined.");
		} else {
			room.people.contains(uname, function(found) {
			    if (found) {
			        socket.emit("update", "You have already joined this room.");
			    } else {
			    	if (people[uname].inroom !== null) {
			    		//socket.emit("update", "You are already in a room ("+rooms[people[uname].inroom].name+"), please leave it first to join another room.");
			    	} else {
					//room.addPerson(socket.id);
					room.addPerson(people[uname].name);
					people[uname].inroom = id;
					socket.room = room.name;
					socket.join(socket.room);
					io.sockets.in(socket.room).emit("inRoomAdd", rooms[id].people, room.name);
					io.sockets.in(socket.room).emit("update", uname + " has connected to " + room.name + " room.");
					socket.emit("update", "Welcome to " + room.name + ".");
					socket.emit("sendRoomID", {id: id});
					io.sockets.emit("roomList", {rooms: rooms});
				}
			    }
			});
		}
	});

	socket.on("leaveRoom", function(id) {
		var room = rooms[id];
		if (room) {
			if (people[uname].owns === room.owner) {
				var i = 0;
				io.sockets.in(socket.room).emit("homeRedirect");
				people[uname].inroom = null;
				
				while(i < clients.length) {	
							
					if (clients[i] === room.people[i]) {
					people[clients[i]].inroom = null;					
					//people[clients[i]].socketid.leave(room.name);
																	
					}
					++i;
				}

	    		delete rooms[id];
	    		people[uname].owns = null;
				io.sockets.emit("roomList", {rooms: rooms});
				
			} else {
				//make sure that the client is in fact part of this room
					room.people.contains(people[uname].name, function(found) {
				    if (found) {
				    var personIndex = room.people.indexOf(people[uname].name);
					room.people.splice(personIndex, 1);
					people[uname].inroom = null;
					people[uname].owns = null;
					io.sockets.emit("update", uname + " has left the room.");
					io.sockets.emit("roomList", {rooms: rooms});
					io.sockets.in(socket.room).emit("inRoomAdd", rooms[id].people, room.name);
					socket.leave(room.name);
				    }
				 });
			}

			
		}
		people[uname].inroom = null;
		people[uname].owns = null;		
	});

	////////////////////////////////////////////////////////////////////
	/////////////Drawing Canvas Section////////////////////////////////
	//////////////////////////////////////////////////////////////////

	socket.on('draw', function (line) {

		if (io.sockets.manager.roomClients[socket.id]['/'+socket.room] !== undefined ) {
			canvas.push(line);
			io.sockets.in(socket.room).emit('draw', line);

		}
	});
	
	socket.on('clear', function () {
		if (io.sockets.manager.roomClients[socket.id]['/'+socket.room] !== undefined ) {
			canvas.splice(0, canvas.length);
			io.sockets.in(socket.room).emit('clearCanvas');
		}	
		
	});

	socket.on('mousemove', function (data) {
		
		// This line sends the event (broadcasts it)
		// to everyone except the originating client.
		socket.broadcast.emit('moving', data);
	});

});

//socket.io block///
server.listen(3000, function () {
    console.log('Express server listening on port 3000');
});

