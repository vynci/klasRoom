exports.index = function(req, res) {
  res.render('index', { user: req.user, message: req.session.messages});
};
