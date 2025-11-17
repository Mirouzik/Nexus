// server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { WebSocketServer } = require("ws");

const app = express();
app.use(cors());
app.use(express.json());

// -----------------------
// 1. MONGO CONNECT
// -----------------------
mongoose.connect(
  "mongodb+srv://MIROUZIK:qKJydaIANX3vw2SG@cluster0.ww6yg8o.mongodb.net/?appName=Cluster0"
)

  )
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("Mongo ERROR:", err));


// -----------------------
// 2. SCHEMAS
// -----------------------
const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  avatar: String,
  status: String,
});

const MessageSchema = new mongoose.Schema({
  sender: String,
  receiver: String,
  text: String,
  time: String,
});

const User = mongoose.model("User", UserSchema);
const Message = mongoose.model("Message", MessageSchema);

// -----------------------
// 3. REGISTER
// -----------------------
app.post("/register", async (req, res) => {
  const { username, email, password, avatar } = req.body;

  const exists = await User.findOne({ email });
  if (exists) return res.json({ error: "User already exists" });

  await User.create({
    username,
    email,
    password,
    avatar: avatar || "",
    status: "online",
  });

  res.json({ success: true });
});

// -----------------------
// 4. LOGIN
// -----------------------
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, password });
  if (!user) return res.json({ error: "Invalid login" });

  res.json({
    id: user._id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    status: user.status,
  });
});

// -----------------------
// 5. GET MESSAGES BETWEEN 2 USERS
// -----------------------
app.post("/messages", async (req, res) => {
  const { me, friend } = req.body;

  const messages = await Message.find({
    $or: [
      { sender: me, receiver: friend },
      { sender: friend, receiver: me },
    ],
  });

  res.json(messages);
});

// -----------------------
// 6. HTTP SERVER + WEBSOCKET
// -----------------------
const server = app.listen(3001, () =>
  console.log("Server running on port 3001")
);

const wss = new WebSocketServer({ server });
const clients = {};

wss.on("connection", (ws) => {
  ws.on("message", async (data) => {
    const msg = JSON.parse(data);

    // Register WS client
    if (msg.type === "online") {
      clients[msg.userId] = ws;
      return;
    }

    // Save message to DB
    if (msg.type === "message") {
      await Message.create({
        sender: msg.sender,
        receiver: msg.receiver,
        text: msg.text,
        time: msg.time,
      });

      // Send only to receiver
      if (clients[msg.receiver]) {
        clients[msg.receiver].send(
          JSON.stringify({
            sender: msg.sender,
            text: msg.text,
            time: msg.time,
          })
        );
      }
    }
  });

  ws.on("close", () => {
    for (let id in clients) {
      if (clients[id] === ws) delete clients[id];
    }
  });
});
