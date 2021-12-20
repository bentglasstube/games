import express, { Request, Response, NextFunction } from 'express';

import * as utils from './utils';
// import { getParams } from '../utils';
// import * as queries from './queries';
// import * as exceptions from '../exceptions';

export const router = express.Router();

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

  response.status(200).json(utils.evaluateGuess(expected, guess).join(''));
};

router.all('/check', wordleCheck);