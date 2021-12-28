import { SQL } from '../../db';
import { ActivePuzzle, Guess, League } from '../../../../ui/types/wordle';
import * as utils from './utils';

export function roundedNow() {
  const d = new Date();
  d.setMinutes(60 * Math.round(d.getMinutes() / 60));
  d.setSeconds(0);
  d.setMilliseconds(0);
  return d;
}

/* ******* leagues ******** */
export async function leagues({
  wordle_league_id = null,
  league_slug = null,
  user_id = null,
  isMemberOnly = false,
  page = null,
  limit = null,
  sort = null,
}: {
  wordle_league_id?: number;
  league_slug?: string;
  user_id?: number;
  isMemberOnly?: boolean;
  page?: number;
  limit?: number;
  sort?: string[] | string;
} = {}): Promise<League[]> {
  const [where, bindvars] = SQL.autoWhere({ wordle_league_id, league_slug });

  const joins = [];
  const extraCols = [];
  if (user_id) {
    bindvars.user_id = user_id;
    extraCols.push('case when user_id is null or not active then false else true end as is_member');
    joins.push(
      `${
        isMemberOnly ? '' : 'left '
      }join wordle_league_members wlm on (wlm.wordle_league_id=wl.wordle_league_id and wlm.user_id=$(user_id))`,
    );
  }
  // console.log(extraCols, user_id);
  const query = `
      select wl.*${extraCols.length ? `, ${extraCols.join(', ')}` : ''}
      from wordle_leagues wl
      ${joins.join('\n')}
      ${SQL.whereClause(where)}
      ${SQL.orderBy(sort)}
      ${SQL.limit(page, limit)}
  `;
  // console.log(query);
  return SQL.select(query, bindvars);
}

export async function league(args: any) {
  const l = await leagues(args);
  if (l.length > 1) {
    throw new Error(`Expected only one league entry, found ${l.length}`);
  }
  return l.length ? l[0] : null;
}

/* ******* series ******** */
export async function leagueSeries({
  wordle_league_id = null,
  start_date_before = null,
  start_date_after = null,
  end_date_before = null,
  end_date_after = null,
  page = null,
  limit = null,
  sort = null,
}: {
  wordle_league_id?: number;
  start_date_before?: Date;
  start_date_after?: Date;
  end_date_before?: Date;
  end_date_after?: Date;
  page?: number;
  limit?: number;
  sort?: string[] | string;
} = {}) {
  const [where, bindvars] = SQL.autoWhere({ wordle_league_id });

  if (start_date_before) {
    where.push('start_date <= $(start_date_before)');
    bindvars.start_date_before = start_date_before;
  }

  if (start_date_after) {
    where.push('start_date >= $(start_date_after)');
    bindvars.start_date_after = start_date_after;
  }

  if (end_date_before) {
    where.push('end_date < $(end_date_before)');
    bindvars.end_date_before = end_date_before;
  }

  if (end_date_after) {
    where.push('end_date > $(end_date_after)');
    bindvars.end_date_after = end_date_after;
  }

  const query = `
        select *
        from wordle_league_series
        ${SQL.whereClause(where)}
        ${SQL.orderBy(sort)}
        ${SQL.limit(page, limit)}
  `;
  return SQL.select(query, bindvars);
}

export async function addLeagueSeries(data: { [id: string]: any }) {
  return SQL.insert('wordle_league_series', data, 200, false, true);
}

export async function generateSeries(league: League, now: Date) {
  console.log('generateSeries', league.league_slug, now);
  const lastSeries = await leagueSeries({
    wordle_league_id: league.wordle_league_id,
    page: 1,
    limit: 1,
    sort: '-start_date',
  });
  console.log('found last series', lastSeries);

  let start = league.start_date;
  if (lastSeries.length) {
    start = lastSeries[0].end_date;
  }

  const startCutoff = new Date(now);
  startCutoff.setDate(startCutoff.getDate() + 7);
  while (start < startCutoff) {
    const end = new Date(start);
    end.setDate(end.getDate() + league.series_days);
    console.log('Add league series', league.league_slug, now, start, end);
    await addLeagueSeries({
      wordle_league_id: league.wordle_league_id,
      create_date: now,
      start_date: start,
      end_date: end,
    });
    start = new Date(end);
  }
}

export async function generateAllSeries(now: Date) {
  console.log(new Date(), 'generateAllSeries');
  for (const l of await leagues()) {
    await generateSeries(l, now);
  }
}

/* ******* answers ******** */

export async function answers({
  wordle_league_id = null,
  wordle_answer_id = null,
  league_slug = null,
  active_after = null,
  active_between = null,
  page = null,
  limit = null,
  sort = null,
}: {
  wordle_league_id?: number;
  wordle_answer_id?: number;
  league_slug?: string;
  active_after?: Date;
  active_between?: Date;
  page?: number;
  limit?: number;
  sort?: string | string[];
} = {}) {
  const [where, bindvars] = SQL.autoWhere({ wordle_league_id, wordle_answer_id, league_slug, active_after });

  if (active_between) {
    where.push('$(active_between) between active_after and active_before');
    bindvars.active_between = active_between;
  }

  const query = `
    select a.* 
    from wordle_answers a
    join wordle_league_series ls using (wordle_league_series_id)
    join wordle_leagues l using (wordle_league_id)
    ${SQL.whereClause(where)}
    ${SQL.orderBy(sort)}
    ${SQL.limit(page, limit)}
  `;
  // console.log(query, bindvars);
  return SQL.select(query, bindvars);
}

export async function answer(args: any) {
  const l = await answers(args);
  if (l.length > 1) {
    throw new Error(`Expected only one answer entry, found ${l.length}`);
  }
  return l.length ? l[0] : null;
}

export async function generateAnswer(league: any, activeAfter: Date) {
  console.log(new Date(), 'Generate answer', activeAfter, league);
  const activeBefore = new Date(activeAfter);
  activeBefore.setHours(activeBefore.getHours() + league.time_to_live_hours);
  const series = await leagueSeries({
    wordle_league_id: league.wordle_league_id,
    start_date_before: activeAfter,
    end_date_after: activeAfter,
    page: 1,
    limit: 1,
    sort: '-start_date',
  });
  console.log('answer found series', series);
  if (!series.length) {
    // console.log('No series for league, not creating answer', league);
    return null;
  }

  const a = await answers({
    wordle_league_id: league.wordle_league_id,
    active_after: activeAfter,
    page: 1,
    limit: 1,
  });
  if (a.length) return a[0];

  const rando = utils.randomWord(league.letters).toLowerCase();
  console.log('Adding', activeAfter, activeBefore, rando);
  return SQL.insert(
    'wordle_answers',
    {
      wordle_league_series_id: series[0].wordle_league_series_id,
      answer: rando,
      create_date: new Date(),
      active_after: activeAfter,
      active_before: activeBefore,
    },
    '*',
  );
}

export async function generateAnswers(league: League, now: Date) {
  const lastAnswer = await answers({
    wordle_league_id: league.wordle_league_id,
    page: 1,
    limit: 1,
    sort: '-active_after',
  });
  console.log('last answer', league.wordle_league_id, league.league_slug, lastAnswer);

  let start = league.start_date;
  if (lastAnswer.length) {
    start = lastAnswer[0].active_after;
    start.setHours(start.getHours() + league.answer_interval_hours);
  }

  const startCutoff = new Date(now);
  startCutoff.setDate(startCutoff.getDate() + 7);
  while (start < startCutoff) {
    console.log('genAnswer', league.league_slug, start, startCutoff);
    await generateAnswer(league, start);
    start.setHours(start.getHours() + league.answer_interval_hours);
  }
}

export async function generateAllAnswers(now: Date) {
  console.log(new Date(), 'generateAllAnswers');
  for (const l of await leagues()) {
    await generateAnswers(l, now);
  }
}

export async function activePuzzles({
  user_id,
  page = null,
  limit = null,
  sort = null,
}: {
  user_id: number;
  page?: number;
  limit?: number;
  sort?: string | string[];
}): Promise<ActivePuzzle> {
  const [where, bindvars] = SQL.autoWhere({ user_id });

  where.push('m.active');

  where.push('$(now) between active_after and active_before');
  bindvars.now = new Date();

  const query = `
      select league_slug, league_name, 
             wordle_answer_id, active_after, active_before, 
             s.start_date as series_start_date, s.end_date as series_end_date,
             g.guesses, g.correct,
             case when g.correct or g.guesses = l.max_guesses then g.answer else null end as correct_answer
      from wordle_league_members m
      join wordle_leagues l using (wordle_league_id)
      join wordle_league_series s using (wordle_league_id)
      join wordle_answers a using (wordle_league_series_id)
      left join (
          select wordle_answer_id, count(*) as guesses, 
                 max(correct::varchar(5))::boolean as correct, 
                 coalesce(max(case when correct then guess else null end), max(wa.answer)) as answer
          from wordle_answers wa 
          join wordle_guesses wg using (wordle_answer_id)
          where wg.user_id=$(user_id) and $(now) between active_after and active_before
          group by wordle_answer_id
      ) g using (wordle_answer_id)
      ${SQL.whereClause(where)}
      ${SQL.orderBy(sort)}
      ${SQL.limit(page, limit)}
  `;
  // console.log(query, bindvars);
  return SQL.select(query, bindvars);
}

/* ******* guesses ******** */

export async function addGuess({
  user_id,
  wordle_answer_id,
  guess,
  correct_placement,
  correct_letters,
  correct,
}: {
  user_id: number;
  wordle_answer_id: number;
  guess: string;
  correct_placement: number;
  correct_letters: number;
  correct: boolean;
}) {
  SQL.insert('wordle_guesses', {
    user_id,
    wordle_answer_id,
    guess: guess.toLowerCase(),
    correct_placement,
    correct_letters,
    correct,
    create_date: new Date(),
  });
}

export async function guesses({
  wordle_answer_id = null,
  user_id = null,
  page = null,
  limit = null,
  sort = null,
}: {
  wordle_answer_id?: number;
  user_id?: number;
  page?: number;
  limit?: number;
  sort?: string | string[];
} = {}): Promise<Guess[]> {
  const [where, bindvars] = SQL.autoWhere({ wordle_answer_id, user_id });
  const query = `
      select *
      from wordle_answers
      join wordle_guesses using (wordle_answer_id)
    ${SQL.whereClause(where)}
    ${SQL.orderBy(sort)}
    ${SQL.limit(page, limit)}
  `;
  return SQL.select(query, bindvars);
}

/* ******* league members ******** */

export async function leagueMembers({
  page = null,
  limit = null,
  sort = null,
}: {
  page?: number;
  limit?: number;
  sort?: string | string[];
} = {}) {
  const [where, bindvars] = SQL.autoWhere({});
  const query = `
      select * 
      from wordle_league_members
    ${SQL.whereClause(where)}
    ${SQL.orderBy(sort)}
    ${SQL.limit(page, limit)}
  `;
  return SQL.select(query, bindvars);
}

export async function addLeagueMember({ user_id, wordle_league_id }: { user_id: number; wordle_league_id: number }) {
  const now = new Date();
  SQL.insert(
    'wordle_league_members',
    {
      user_id,
      wordle_league_id,
      add_date: now,
      rejoin_date: now,
      active: true,
    },
    null,
    `
        on conflict (wordle_league_id, user_id) 
        do update set 
        active=true, 
        rejoin_date=case when wordle_league_members.active then wordle_league_members.rejoin_date else excluded.rejoin_date end`,
  );
}

export async function removeLeagueMember({ user_id, wordle_league_id }: { user_id: number; wordle_league_id: number }) {
  SQL.update(
    'wordle_league_members',
    'wordle_league_id=$(wordle_league_id) and user_id=$(user_id)',
    { wordle_league_id, user_id },
    {
      active: false,
      leave_date: new Date(),
    },
  );
}
