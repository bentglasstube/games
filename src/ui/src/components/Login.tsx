import * as React from 'react';

import { withStyles } from '@material-ui/core/styles';
import { withStore, useGetAndSet } from 'react-context-hook';

import * as material from '@material-ui/core';
import * as constants from '../constants';

const style = (theme: any) => {
  const x: any = {
    root: {
      maxWidth: 600,
      minWidth: 400,
      float: 'left',
    },

    formControl: {
      margin: theme.spacing(1),
      minWidth: 120,
    },

    button: {
      margin: theme.spacing(1),
    },
  };
  return x;
};

const genUrl = (fn = '') => `${constants.BASE_URL}/user/${fn}`;

function LoginX({ classes, updateUser }: { classes: any; updateUser: any }) {
  const [tab, setTab] = React.useState('login');
  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [password2, setPassword2] = React.useState('');
  const [errors, setErrors]: [{ username?: string; email?: string; password?: string; password2?: string }, any] = React.useState({});

  const [loginOpen, setLoginOpen] = useGetAndSet('login-open');

  const handleTabChange = (event: any, newTab: any) => {
    setTab(newTab);
  };

  function closeDrawer() {
    console.log('closing drawer');
    setLoginOpen(false);
  }

  function doCancel() {
    closeDrawer();
  }

  const doLogin = async () => {
    const result = await fetch(genUrl('login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });
    if (result.status === 403) {
      localStorage.setItem('api-key', null);
      setErrors({ ...errors, password: 'Error logging in' });
    } else {
      setErrors({});
      localStorage.setItem('api-key', await result.json());
      closeDrawer();
      updateUser();
    }
  };

  const doSignup = async () => {
    const result = await fetch(genUrl('signup'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        email,
        password,
        password2,
      }),
    });
    if (result.status === 400) {
      setErrors((await result.json()).details);
    } else {
      setErrors({});
      localStorage.setItem('api-key', await result.json());
      closeDrawer();
    }
  };

  return (
    <div className={classes.root}>
      <material.Tabs value={tab} onChange={handleTabChange}>
        <material.Tab label="Login" value="login" />
        <material.Tab label="Signup" value="signup" />
      </material.Tabs>

      <material.Box component="div" display={tab === 'signup' ? 'block' : 'none'}>
        <material.FormGroup>
          <material.FormControl className={classes.formControl}>
            <material.TextField
              error={Boolean(errors.username)}
              helperText={errors.username}
              id="susername"
              label="Username"
              onChange={event => setUsername(event.target.value)}
            />
          </material.FormControl>

          <material.FormControl className={classes.formControl}>
            <material.TextField
              error={Boolean(errors.email)}
              helperText={errors.email}
              id="semail"
              label="Email"
              onChange={event => setEmail(event.target.value)}
            />
          </material.FormControl>

          <material.FormControl className={classes.formControl}>
            <material.TextField
              error={Boolean(errors.password)}
              helperText={errors.password}
              id="spassword"
              label="Password"
              type="password"
              onChange={event => setPassword(event.target.value)}
            />
          </material.FormControl>

          <material.FormControl className={classes.formControl}>
            <material.TextField
              error={Boolean(errors.password2)}
              helperText={errors.password2}
              id="spassword2"
              label="Confirm Password"
              type="password"
              onChange={event => setPassword2(event.target.value)}
            />
          </material.FormControl>
        </material.FormGroup>

        <material.Button className={classes.button} onClick={doCancel} variant="contained">
          Cancel
        </material.Button>
        <material.Button className={classes.button} onClick={doSignup} variant="contained" color="primary">
          Sign up
        </material.Button>
      </material.Box>

      <material.Box component="div" display={tab === 'login' ? 'block' : 'none'}>
        <material.FormGroup>
          <material.FormControl className={classes.formControl}>
            <material.TextField
              error={Boolean(errors.username)}
              helperText={errors.username}
              id="username"
              label="Username"
              onChange={event => setUsername(event.target.value)}
            />
          </material.FormControl>

          <material.FormControl className={classes.formControl}>
            <material.TextField
              error={Boolean(errors.password)}
              helperText={errors.password}
              id="password"
              label="Password"
              type="password"
              onChange={event => setPassword(event.target.value)}
            />
          </material.FormControl>
        </material.FormGroup>

        <material.Button className={classes.button} onClick={doCancel} variant="contained">
          Cancel
        </material.Button>
        <material.Button className={classes.button} onClick={doLogin} variant="contained" color="primary">
          Login
        </material.Button>
      </material.Box>
    </div>
  );
}

export const Login = withStyles(style)(LoginX);