'use client';

import { useEffect, useReducer, useState } from 'react';
import { filterGames, sortGames } from '@/lib/filters';
import type { FilterState, Library, SortKey } from '@/lib/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import FilterBar from './FilterBar';
import GameGrid from './GameGrid';
import RandomiserOverlay from './RandomiserOverlay';

type Action =
  | { type: 'SET_QUERY'; query: string }
  | { type: 'SET_SORT'; sort: SortKey }
  | { type: 'TOGGLE_CHIP'; key: string }
  | { type: 'TOGGLE_TAG'; index: number }
  | { type: 'SET_DECK'; deck: -1 | 0 | 1 | 2 }
  | { type: 'SET_MIN_SCORE'; value: number }
  | { type: 'CLEAR_ALL' };

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
    case 'TOGGLE_CHIP':
      return {
        ...state,
        chips: state.chips.includes(action.key)
          ? state.chips.filter((k) => k !== action.key)
          : [...state.chips, action.key],
      };
    case 'TOGGLE_TAG':
      return {
        ...state,
        tags: state.tags.includes(action.index)
          ? state.tags.filter((t) => t !== action.index)
          : [...state.tags, action.index],
      };
    case 'SET_DECK':
      return { ...state, deck: action.deck };
    case 'SET_MIN_SCORE':
      return { ...state, minScore: action.value };
    case 'CLEAR_ALL':
      return initialState;
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rollOpen, setRollOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(raw, 160);

  useEffect(() => {
    dispatch({ type: 'SET_QUERY', query: debouncedQuery });
  }, [debouncedQuery]);

  const filtered = sortGames(filterGames(library.games, state), state.sort);

  const active =
    state.query !== '' ||
    state.chips.length > 0 ||
    state.tags.length > 0 ||
    state.deck >= 0 ||
    state.minScore > 0;

  const handleClearAll = () => {
    dispatch({ type: 'CLEAR_ALL' });
    setRaw('');
  };

  const handleRoll = () => {
    if (filtered.length > 0) setRollOpen(true);
  };

  return (
    <>
      <FilterBar
        query={raw}
        onQueryChange={setRaw}
        sort={state.sort}
        onSortChange={(sort) => dispatch({ type: 'SET_SORT', sort })}
        totalCount={library.games.length}
        chips={state.chips}
        onToggleChip={(key) => dispatch({ type: 'TOGGLE_CHIP', key })}
        drawerOpen={drawerOpen}
        onToggleDrawer={() => setDrawerOpen((open) => !open)}
        tags={library.tags}
        games={library.games}
        selectedTags={state.tags}
        onToggleTag={(index) => dispatch({ type: 'TOGGLE_TAG', index })}
        deck={state.deck}
        onDeckChange={(deck) => dispatch({ type: 'SET_DECK', deck })}
        minScore={state.minScore}
        onMinScoreChange={(value) => dispatch({ type: 'SET_MIN_SCORE', value })}
        onRoll={handleRoll}
      />

      <div className="meta">
        <span>
          Showing <b>{filtered.length}</b> of <b>{library.games.length}</b>
        </span>
        <button className={`clear ${active ? 'show' : ''}`} onClick={handleClearAll}>
          ✕ Clear all filters
        </button>
      </div>

      <GameGrid games={filtered} totalCount={library.games.length} />

      {rollOpen && <RandomiserOverlay pool={filtered} onClose={() => setRollOpen(false)} />}
    </>
  );
}
