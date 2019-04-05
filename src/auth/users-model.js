'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// const randtoken = require('rand-token'); //needed to generate a random token

const users = new mongoose.Schema({
  username: {type:String, required:true, unique:true},
  password: {type:String, required:true},
  email: {type: String},
  role: {type: String, default:'user', enum: ['admin','editor','user']},
});

users.pre('save', function(next) {
  bcrypt.hash(this.password, 10)
    .then(hashedPassword => {
      this.password = hashedPassword;
      next();
    })
    .catch(console.error);
});

users.statics.createFromOauth = function(email) {

  if(! email) { return Promise.reject('Validation Error'); }

  return this.findOne( {email} )
    .then(user => {
      if( !user ) { throw new Error('User Not Found'); }
      console.log('Welcome Back', user.username);
      return user;
    })
    .catch( error => {
      console.log('Creating new user');
      let username = email;
      let password = 'none';
      return this.create({username, password, email});
    });

};

users.statics.authenticateBearer = 
function(token) {
  let parsedToken = jwt.verify( token, process.env.SECRET);
  let id = parsedToken.id;
  return this.findOne({_id:id});
};

users.statics.authenticateBasic = function(auth) {
  let query = {username:auth.username};
  return this.findOne(query)
    .then( user => user && user.comparePassword(auth.password) )
    .catch(error => {throw error;});
};

users.methods.comparePassword = function(password) {
  return bcrypt.compare( password, this.password )
    .then( valid => valid ? this : null);
};

users.methods.generateToken = function() {
  // let refreshToken = {};
  let token = {
    id: this._id,
    role: this.role,
  };

  let tokenOptions = {
    expiresIn: '15min', //15 min timeout (300 sec)
    algorithm:  'HS256', //hash algorithm
  };
  
  // let refreshToken = randtoken.uid;
  return jwt.sign(token, process.env.SECRET, tokenOptions);
};
/**
 * Method to generate an eternal access token
 * @method 
 */
users.methods.generateEternalToken = function() {
  let token = {
    id: this._id,
    role: this.role,
  };

  let tokenOptions = {
    algorithm: 'HS256',
    //does not expire
  };

  return jwt.sign(token, process.env.SECRET, tokenOptions);
};

module.exports = mongoose.model('users', users);
