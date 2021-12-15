import express, { Request, Response } from 'express';
import cors from 'cors';
import * as users from './users/api';
import * as admin from './admin/api';

const app = express();
const port = 5000;

const corsOptions = {
  origin: 'http://localhost:3000',
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(express.json());
app.use(cors(corsOptions));
app.options('*', cors()); // include before other routes
app.listen(port, '0.0.0.0');

const wordleCheck = (request: Request, response: Response) => {
  const expected = 'masse';

  let guess = '';

  if (request.body && request.body.guess) {
    guess = request.body.guess;
  } else if (request.query && request.query.guess) {
    guess = request.query.guess.toString();
  }

  if (!guess) {
    response.status(400).json({
      detail: 'must pass field named "guess" containing guessed word',
    });
    return;
  }
  if (guess.length !== 5) {
    response.status(400).json({
      detail: 'guess must be 5 letters',
    });
  }

  const expectedCounts = expected.split('').reduce((prev: { [id: string]: number }, current) => {
    const prev2 = { ...prev };
    prev2[current] = (prev2[current] || 0) + 1;
    return prev2;
  }, {});
  const guessCounts = guess.split('').reduce((prev: { [id: string]: number }, current, i) => {
    const prev2 = { ...prev };
    if (expected[i] === current) {
      prev2[current] = (prev2[current] || 0) + 1;
    }
    return prev2;
  }, {});
  const out = guess.split('').map((l, i) => {
    if (l !== expected[i]) {
      guessCounts[l] += 1;
    }
    if (l === expected[i]) {
      return '+';
    }
    if (expected.includes(l) && guessCounts[l] <= expectedCounts[l]) {
      return '-';
    }
    return ' ';
  });

  response.status(200).json(out.join(''));
};

app.all('/wordle/check', wordleCheck);
app.use('/admin', admin.router);