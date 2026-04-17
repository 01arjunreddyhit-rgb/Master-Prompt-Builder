import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

/**
 * Fetches all elections and finds the current active/not-started one.
 * Used across admin pages to avoid repeating election-fetch logic.
 */
export function useElection() {
  const [elections, setElections] = useState([]);
  const [current, setCurrent]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    api.get('/elections')
      .then(r => {
        const list = r.data.data || [];
        setElections(list);
        const active = list.find(e =>
          ['NOT_STARTED', 'ACTIVE', 'PAUSED'].includes(e.status)
        );
        setCurrent(active || null);
      })
      .catch(() => setError('Failed to load elections.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { elections, current, loading, error, reload };
}
