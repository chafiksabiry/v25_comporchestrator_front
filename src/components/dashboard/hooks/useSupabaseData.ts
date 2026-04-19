import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseSupabaseDataOptions {
  realtime?: boolean;
}

export function useSupabaseData<T>(
  table: string,
  options: UseSupabaseDataOptions = {}
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const fetchData = async () => {
      try {
        const { data: result, error: queryError } = await supabase
          .from(table)
          .select('*');

        if (queryError) throw queryError;

        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (options.realtime) {
      channel = supabase
        .channel(`${table}_changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setData((current) => current ? [...current, payload.new as T] : [payload.new as T]);
            } else if (payload.eventType === 'UPDATE') {
              setData((current) =>
                current?.map((item) =>
                  (item as any).id === payload.new.id ? payload.new : item
                ) || null
              );
            } else if (payload.eventType === 'DELETE') {
              setData((current) =>
                current?.filter((item) => (item as any).id !== payload.old.id) || null
              );
            }
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [table, options.realtime]);

  return { data, loading, error };
}
