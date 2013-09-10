var passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  db = require('./dbschema'),
  zxcvbn = require("zxcvbn");

// Minimum password score based on scale from zxcvbn:
// [0,1,2,3,4] if crack time (in seconds) is less than
// [10**2, 10**4, 10**6, 10**8, Infinity].
// (useful for implementing a strength bar.)
const MIN_PASSWORD_SCORE = 2;

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  db.userModel.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(new LocalStrategy(function(username, password, done) {
  db.userModel.findOne({ username: username }, function(err, user) {
    if (err) { return done(err); }
    if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
    user.comparePassword(password, function(err, isMatch) {
      if (err) return done(err);
      if(isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Invalid password' });
      }
    });
  });
}));

// Simple route middleware to ensure user is authenticated.  Otherwise send to login page.
exports.ensureAuthenticated = function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/')
};


// Check for admin middleware, this is unrelated to passport.js
// You can delete this if you use different method to check for admins or don't need admins
exports.ensureAdmin = function ensureAdmin(req, res, next) {
        if(req.user && req.user.admin === true)
            next();
        else
            res.send(403);
};

// Helper function to create a new user
exports.createUser = function(username, name, contact, school, skills, emailaddress, password1, password2, adm, done) {
    // convert adm string to bool


    if (password1 !== password2) return done(new Error("Passwords must match"));

    var user = new db.userModel({ username: username      
        , name: name
        , contact: contact
        , school: school
        , skills: skills
        , email: emailaddress
        , password: password1
        , admin: adm });
 
    user.save(function(err) {
        if(err) {
            done(err);
        } else {
            done(null, user);
        }
    });

};

exports.updateUser = function(username, name, contact, school, skills, emailaddress, password, done) {
    // convert adm string to bool
    console.log("Beep Boop!: " + username + name + contact + school + skills + emailaddress + skills + password);


    db.userModel.findOne({username:username}, function(e, o){
      o.name    = name;
      o.contact   = contact;
      o.school   = school;
      o.skills = skills;
      o.emailaddress = emailaddress;
      if (password == ''){
          o.save();
          done(null, o);
      } else{
          o.password = password;
          o.save();
          done(null, o);
      }      

    });



};