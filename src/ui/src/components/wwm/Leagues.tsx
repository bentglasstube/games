import { useEffect } from 'react';
import { useGetAndSet } from 'react-context-hook';
import { Typography, Paper, Link } from '@mui/material';
import { formatDistance } from 'date-fns';
import * as eht from '../EnhancedTable';
import { ActivePuzzle, League } from '../../../types/wwm';
import * as constants from '../../constants';

const genUrl = (fn = '') => `${constants.BASE_URL}/api/games/wwm/${fn}`;

export async function getPuzzles(active = true): Promise<ActivePuzzle[]> {
  const data = await fetch(genUrl('puzzles/'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': localStorage.getItem('api-key'),
    },
    body: JSON.stringify({
      active,
    })
  });
  return data.json();
}


function dateFormatter(row: League, d: string) {
  return formatDistance(new Date(d), new Date(), { addSuffix: true });
}

// move this to utils or something
export async function getLeagues(): Promise<League[]> {
  const data = await fetch(genUrl('leagues'), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': localStorage.getItem('api-key'),
    },
  });
  return data.json();
}

function leagueFormatter(row: League, d: string) {
  return <Link href={`/wwm/leagues/${row.league_slug}`}>{d}</Link>;
}

const ourheadCells: eht.HeadCell<League>[] = [
  {
    id: 'league_name',
    numeric: false,
    disablePadding: false,
    label: 'League',
    formatter: leagueFormatter,
  },
  {
    id: 'letters',
    numeric: true,
    disablePadding: false,
    label: '# letters',
  },
  {
    id: 'max_guesses',
    numeric: true,
    disablePadding: false,
    label: '# guesses',
  },
  {
    id: 'series_days',
    numeric: true,
    disablePadding: false,
    label: 'Days in series',
  },
  {
    id: 'time_to_live_hours',
    numeric: true,
    disablePadding: false,
    label: 'TTL (hours)',
  },
  // { id: 'create_date', numeric: false, disablePadding: false, label: 'Created', formatter: dateFormatter },
  {
    id: 'start_date',
    numeric: false,
    disablePadding: false,
    label: 'Starts',
    formatter: dateFormatter,
  },
];

/// ///////////////////////

const WWMLeaguesX = () => {
  const [leagues, setLeagues] = useGetAndSet<League[]>('leagues');
  const [user, setUser]: [{ username: string }, any] = useGetAndSet('user');

  async function joinLeague(row: League): Promise<void> {
    const data = await fetch(genUrl('leagues/join'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': localStorage.getItem('api-key'),
      },
      body: JSON.stringify({
        league_slug: row.league_slug,
      }),
    });
    setLeagues(await getLeagues());
  }

  async function leaveLeague(row: League): Promise<void> {
    const data = await fetch(genUrl('leagues/leave'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': localStorage.getItem('api-key'),
      },
      body: JSON.stringify({
        league_slug: row.league_slug,
      }),
    });
    setLeagues(await getLeagues());
  }

  function canLeave(row: League): boolean {
    return row.is_member && user !== null;
  }

  function canJoin(row: League): boolean {
    return !row.is_member && user !== null;
  }

  useEffect(() => {
    (async () => {
      setLeagues(await getLeagues());
    })();
  }, [user]);

  if (!leagues) {
    return <Typography variant="h3">Loading...</Typography>;
  }

  function buttonCallback(row: League): eht.ButtonInfo<League> {
    if (canLeave(row)) {
      return { label: 'Leave', callback: leaveLeague, activeCallback: () => canLeave(row) || canJoin(row) };
    }
    return { label: 'Join', callback: joinLeague, activeCallback: () => canLeave(row) || canJoin(row) };
  }

  return (
    <Paper sx={{ width: '100%', mb: 2 }}>
      <div>
        <Typography sx={{ padding: '10px' }}>
          These are all the available leagues that you can join, along with details about the conditions of the league. You need to have an
          account and be logged in to join a league. Once you join a league new puzzles will appear on the league's schedule and will remain
          active for the period defined for the league.
        </Typography>
      </div>
      <eht.EnhancedTable
        rows={leagues}
        headCells={ourheadCells}
        mainColumn={'league_slug'}
        initialSortColumn={'league_name'}
        rowButtons={[buttonCallback]}
      />
    </Paper>
  );
};

export const Leagues = WWMLeaguesX;