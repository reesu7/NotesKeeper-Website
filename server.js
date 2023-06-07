// jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const app = express();
const passport = require("passport");
const passportLocalMongoose = require('passport-local-mongoose');
const session = require('express-session');
const options = {
  autoIndex: false,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
};
mongoose.connect(process.env.MONGODB_URI, options);
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());
const userSchema = new mongoose.Schema({
  email: "String",
  password: "String",
  username: "String"
});
const noteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: "String"
});
userSchema.plugin(passportLocalMongoose, { usernameField: "email" });
const User = mongoose.model("User", userSchema);
const Note = mongoose.model("Note", noteSchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, JSON.stringify(user)); 
});

passport.deserializeUser(function(user, done) {
  done(null, JSON.parse(user));
});
app.get("/",(req,res)=>{
  res.render("welcome");
})
app.get("/signup", (req, res) => {
  res.render("register");
});
app.get("/notes", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const userId = req.user._id;
      const foundNotes = await Note.find({ userId });
      res.render("home", {
        listitem: foundNotes
      });
    } catch (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.redirect("/");
  }
});
app.post("/signup", (req, res) => {
  User.register({ email: req.body.email, username: req.body.email }, req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect("/signup");
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/notes");
      });
    }
  });
});
app.get("/login",(req,res)=>{
  res.render("login");
})
app.post("/login",(req,res)=>{
  const user = new User({
    username:req.body.username,
    password:req.body.password
   
});
req.login(user,function(err){
   if(err){
       console.log(err);
   }
   else{
       passport.authenticate("local")(req,res,()=>{
           res.redirect("/notes");
       })
   }
})
});
app.post("/notes", (req, res) => {
  const newitem = req.body['note'];
  const userId = req.user._id;
  const newNote = new Note({
    userId,
    content: newitem
  });
  newNote.save();
  res.redirect("/notes");
});
  app.get("/notes/edit/:id", async (req, res) => {
    const noteId = req.params.id;
    try {
      const note = await Note.findById(noteId);
      if (!note) {
        return res.status(404).send("Note not found");
      }
      res.render("edit", { note }); 
    } catch (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
    }
  });
  app.post("/notes/edit/:id", async(req, res) => {
     const noteId = req.params.id;
     try {
      const updatedContent = req.body.editednote;
      const updatedNote = await Note.findByIdAndUpdate(
        noteId,
        { content: updatedContent },
        { new: true } 
      );
  
      if (!updatedNote) {
        return res.status(404).send("Note not found");
      }
      else{
        res.redirect("/notes");
      }
    } catch (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
    }
  });
  app.post("/notes/delete",async(req,res)=>{
    const itemtodelete = req.body.deletenote;
    const result = await Note.findByIdAndRemove(itemtodelete);
    res.redirect("/notes");
  });
app.listen(process.env.PORT, () => {
  console.log("listening to port");
});
