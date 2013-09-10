var passport = require('passport'),
    pass = require('../config/pass');

exports.account = function(req, res) {
  res.render('account', { user: req.user, message: req.session.messages});
};

exports.getlogin = function(req, res) {
  res.render('index', { user: req.user, message: req.session.messages });
};

exports.admin = function(req, res) {
  res.send('access granted admin!');
};


  
// POST /login
//   This is an alternative implementation that uses a custom callback to
//   acheive the same functionality.
exports.postlogin = function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err) }
    if (!user) {
      req.session.messages =  [info.message];
      return res.redirect('/')
    }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      return res.redirect('/');
    });
  })(req, res, next);
};

exports.logout = function(req, res) {
  req.logout();
  res.redirect('/');
};

exports.getsignup = function(req, res) {
    res.render('signup', { user: req.user, message: req.session.messages });
};

exports.signup = function (req, res) {
    var body = req.body;
    pass.createUser(
        body.username,
        body.name,
        body.contact,
        body.school,
        body.skills,
        body.email,
        body.password,
        body.password2,
        false,
        function (err, user) {
            if (err) return res.render('index', {user: req.user, message: err.code === 11000 ? "User already exists" : err.message});
            req.login(user, function (err) {
                if (err) return next(err);
                // successful login
                res.redirect('/');
            })
        })
}

exports.update = function (req, res) {
    var body = req.body;
    pass.updateUser(
        req.user.username,
        body.name,
        body.contact,
        body.school,
        body.skills,
        body.email,
        body.passwordA,      
        function (err, user) {
            if (err) return res.render('account');
                res.redirect('/');
        })
}