const express = require('express');
// const morgan = require('morgan');
const cors = require('cors');
const userRoute = require('./routes/userRoutes');
const foodRoute = require('./routes/foodRoutes');
const messageRoute = require('./routes/messageRoutes');
const session = require('express-session');
const passport = require('passport');
const OAuth2Strategy = require('passport-google-oauth2').Strategy;
const User = require('./Models/userModel');
const clientid =
  '790376637860-50fqhka8p9cks9glg1trtqn7vf4utu6l.apps.googleusercontent.com';
const clientsecret = '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';

const app = express();

app.use((req, res, next) => {
  res.status(201);
  console.log(' Hello from the middleWare awesome ');
  next();
});
// console.log(process.env.NODE_ENV);

// if (process.env.NODE_ENV === 'development') {
//   app.use(morgan('dev'));
// }
app.use(express.json());
app.use(cors());
app.use('/api/donate/user', userRoute);
app.use('/api/donate/food', foodRoute);
app.use('/api', messageRoute);
app.use('/uploads', express.static('uploads'));
app.use('/Images', express.static('Images'));

app.use(
  session({
    secret: 'murtesa0961806851',
    resave: false,
    saveUninitialized: true,
  })
);

// setuppassport
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new OAuth2Strategy(
    {
      clientID: clientid,
      clientSecret: clientsecret,
      callbackURL: '/auth/google/callback',
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = new User({
            googleId: profile.id,
            displayName: profile.displayName,
            email: profile.emails[0].value,
            image: profile.photos[0].value,
            // Set default values or handle missing fields gracefully
            fullName: profile.displayName || 'N/A',
            phone: 'N/A', // Set a default value or handle differently
            address: 'N/A', // Set a default value or handle differently
            password: 'N/A', // Example of setting a default password
            passwordConfirm: 'N/A', // Example of setting a default password
          });

          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// initial google ouath login
app.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    successRedirect: 'http://localhost:3000/donor-page',
    failureRedirect: 'http://localhost:3000/login',
  })
);

app.get('/login/sucess', async (req, res) => {
  if (req.user) {
    res.status(200).json({ message: 'user Login', user: req.user });
  } else {
    res.status(400).json({ message: 'Not Authorized' });
  }
});

app.get('/logout', (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect('http://localhost:3000');
  });
});

module.exports = app;
