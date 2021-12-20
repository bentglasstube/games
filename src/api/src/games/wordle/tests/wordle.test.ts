import * as utils from '../utils';
import * as queries from '../queries';
import * as db from '../../../db';
import * as migrations from '../../../../scripts/migrations';

let mockRoundedNow: jest.SpyInstance;

describe('Test utils', () => {
  it('test_evaluateGuess', async () => {
    expect(utils.evaluateGuess('masse', 'basse')).toStrictEqual([' ', '+', '+', '+', '+']);
    expect(utils.evaluateGuess('masse', 'masse')).toStrictEqual(['+', '+', '+', '+', '+']);
    expect(utils.evaluateGuess('masse', 'xmass')).toStrictEqual([' ', '-', '-', '+', '-']);
    expect(utils.evaluateGuess('masse', 'sasas')).toStrictEqual(['-', '+', '+', ' ', ' ']);
    expect(utils.evaluateGuess('guest', 'xgues')).toStrictEqual([' ', '-', '-', '-', '-']);
  });
});

describe('Test league series', () => {
  beforeEach(async () => {});

  afterAll(async () => {
    mockRoundedNow.mockRestore();
    db.SQL.pool.end();
  });

  it('test_generateAllSeries', async () => {
    mockRoundedNow = jest.spyOn(queries, 'roundedNow');
    await migrations.bootstrapLeagues();
  });
});