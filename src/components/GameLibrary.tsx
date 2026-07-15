'use client';

import { useEffect, useReducer, useState } from 'react';
import { filterGames, sortGames } from '@/lib/filters';
import type { FilterState, Library, SortKey } from '@/lib/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import FilterBar from './FilterBar';
import GameGrid from './GameGrid';

type Action = { type: 'SET_QUERY'; query: string } | { type: 'SET_SORT'; sort: SortKey };

const initialState: FilterState = {
  query: '',
  chips: [],
  tags: [],
  deck: -1,
  minScore: 0,
  sort: 'name',
};

function reducer(state: FilterState, action: Action): FilterState {
  switch (action.type) {
    case 'SET_QUERY':
      return { ...state, query: action.query };
    case 'SET_SORT':
      return { ...state, sort: action.sort };
    default:
      return state;
  }
}

interface GameLibraryProps {
  library: Library;
}

export default function GameLibrary({ library }: GameLibraryProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [raw, setRaw] = useState('');
  const debouncedQuery = useDebouncedValue(raw, 160);

  useEffect(() => {
    dispatch({ type: 'SET_QUERY', query: debouncedQuery });
  }, [debouncedQuery]);

  const filtered = sortGames(filterGames(library.games, state), state.sort);

  return (
    <>
      <FilterBar
        query={raw}
        onQueryChange={setRaw}
        sort={state.sort}
        onSortChange={(sort) => dispatch({ type: 'SET_SORT', sort })}
        totalCount={library.games.length}
      />

      <div className="meta">
        <span>
          Showing <b>{filtered.length}</b> of <b>{library.games.length}</b>
        </span>
        <button className="clear">✕ Clear all filters</button>
      </div>

      <GameGrid games={filtered} totalCount={library.games.length} />
    </>
  );
}
