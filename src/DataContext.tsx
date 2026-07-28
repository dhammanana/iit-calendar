import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadDataFile, updateDataFileInBackground } from './services/dataLoader';
import eventsDataDefault from './data/events.json';
import reflectionsDataDefault from './data/reflections.json';

export interface AppEvent {
  id?: string;
  category: string;
  calendar_type: string;
  event_name?: string;
  month?: number;
  day?: number;
  year?: number;
  day_of_week?: string;
  time?: string;
  subject?: string;
  language?: string;
}

export interface AppReflection {
  id: string;
  quote: string;
  author: string;
  source?: string;
}

interface DataContextType {
  events: AppEvent[];
  reflections: AppReflection[];
  config: any;
  loading: boolean;
  user: null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawEvents, setRawEvents] = useState<any>(() => loadDataFile('events.json', eventsDataDefault));
  const [rawReflections, setRawReflections] = useState<any>(() => loadDataFile('reflections.json', reflectionsDataDefault));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check for updates in the background once a day
    updateDataFileInBackground('events.json', (updatedEvents) => {
      setRawEvents(updatedEvents);
    });

    updateDataFileInBackground('reflections.json', (updatedReflections) => {
      setRawReflections(updatedReflections);
    });
  }, []);

  // Map events to the flat list expected by screens
  const events = React.useMemo(() => {
    const parsedEvents: AppEvent[] = [];
    // Dynamically detect categories from rawEvents keys that are arrays
    Object.keys(rawEvents).forEach(key => {
      if (['supported_calendar_types', 'version', 'calendar_name'].includes(key)) return;

      const items = rawEvents[key];
      if (Array.isArray(items)) {
        // Determine language prefix
        let language: string | undefined = undefined;
        let categoryName = key.replace(/_/g, ' ');

        if (key.startsWith('sinhala_')) {
          language = 'si';
          categoryName = key.substring(8).replace(/_/g, ' ');
        } else if (key.startsWith('english_')) {
          language = 'en';
          categoryName = key.substring(8).replace(/_/g, ' ');
        } else {
          // Other regional events (myanmar_, thai_, srilanka_, etc.) are shown for everyone
          const countryPrefixes = ['myanmar_', 'thai_', 'vietnam_', 'srilanka_'];
          const prefix = countryPrefixes.find(p => key.startsWith(p));
          if (prefix) {
            categoryName = key.substring(prefix.length).replace(/_/g, ' ');
          } else {
            categoryName = key.replace(/_/g, ' ');
          }
        }

        items.forEach((item: any, idx: number) => {
          parsedEvents.push({
            id: `${key}_${idx}`,
            ...item,
            category: categoryName,
            language
          });
        });
      }
    });
    return parsedEvents;
  }, [rawEvents]);

  // Map reflections to include default author if not present
  const reflections = React.useMemo(() => {
    return rawReflections.map((r: any, idx: number) => ({
      id: r.id || `reflection_${idx}`,
      quote: r.quote,
      author: r.author || 'Buddha',
      source: r.source || ''
    }));
  }, [rawReflections]);

  return (
    <DataContext.Provider value={{ events, reflections, config: null, loading, user: null }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
