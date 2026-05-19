import './App.css';
import Layout from './components/layout/Layout';
import { VideoPreview } from './components/preview/VideoPreview';
import { SourcesPanel } from './components/sources/SourcesPanel';
import { Backstage } from './components/guests/Backstage';
import { AudioMixer } from './components/audio/AudioMixer';
import { UnifiedChat } from './components/chat/UnifiedChat';
import { lazy, Suspense, useState, useEffect } from 'react';
import { SignIn, SignUp, UserButton, useAuth } from '@clerk/clerk-react';

const AnalyticsDashboard = lazy(() => import('./components/analytics/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
const TeamCollaboration = lazy(() => import('./components/team/TeamCollaboration').then(m => ({ default: m.TeamCollaboration })));
import { RecordingLibrary } from './components/recording/RecordingLibrary';
import { AudienceGrid } from './components/audience/AudienceGrid';
import { ViewerPage } from './components/audience/ViewerPage';
import { LiveKitProvider } from './components/stage/LiveKitProvider';
import { useStreamStore } from './hooks/useStreamStore';
import { EventCreator } from './components/events/EventCreator';
import { EventList } from './components/events/EventList';
import { EventDetail } from './components/events/EventDetail';
import { GuestRegistration } from './components/guests/GuestRegistration';
import { DonationFlow } from './components/donations/DonationFlow';

type Page = 'studio' | 'viewer' | 'dashboard' | 'events' | 'create-event' | 'event-detail' | 'guest-register' | 'donate' | 'auth';

function AppContent() {
  const { isLoaded, isSignedIn } = useAuth();
  const { appView, setAppView } = useStreamStore();
  const [page, setPage] = useState<Page>('studio');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [guestEventId, setGuestEventId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith('/watch/')) {
      const code = hash.replace('/watch/', '');
      setPage('viewer');
      setAppView('viewer');
      return;
    }
    if (hash.startsWith('/guest/')) {
      setGuestEventId(hash.replace('/guest/', ''));
      setPage('guest-register');
      return;
    }
    if (hash.startsWith('/events/new')) {
      setPage('create-event');
      return;
    }
    if (hash.startsWith('/events/')) {
      setSelectedEventId(hash.replace('/events/', ''));
      setPage('event-detail');
      return;
    }
    if (hash === '/events') {
      setPage('events');
      return;
    }
    if (hash === '/donate') {
      setPage('donate');
      return;
    }
    if (hash === '/auth') {
      setPage('auth');
      setAuthMode(window.location.hash.includes('signUp=true') ? 'signUp' : 'signIn');
      return;
    }
  }, []);

  const navigate = (newPage: Page) => {
    setPage(newPage);
    if (newPage === 'events') window.location.hash = '/events';
    else if (newPage === 'create-event') window.location.hash = '/events/new';
    else if (newPage === 'event-detail' && selectedEventId) window.location.hash = `/events/${selectedEventId}`;
    else if (newPage === 'studio') { window.location.hash = ''; setAppView('host'); }
    else if (newPage === 'dashboard') { window.location.hash = ''; setAppView('dashboard'); }
    else if (newPage === 'viewer') { window.location.hash = ''; setAppView('viewer'); }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!isSignedIn && page !== 'guest-register' && page !== 'viewer') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-white text-center mb-8">Stageroom</h1>
          <div className="bg-gray-800 rounded-lg p-6">
            {authMode === 'signUp' ? (
              <SignUp
                signInUrl="/#/auth"
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'shadow-none bg-transparent',
                  },
                }}
              />
            ) : (
              <SignIn
                signUpUrl="/#/auth?signUp=true"
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'shadow-none bg-transparent',
                  },
                }}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  if (page === 'guest-register' && guestEventId) {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white border-b py-4 px-6">
          <h1 className="text-xl font-bold">Stageroom</h1>
        </header>
        <GuestRegistration
          eventId={guestEventId}
          onSuccess={(guest) => {
            window.location.hash = `/watch/${guestEventId}`;
            setPage('viewer');
            setAppView('viewer');
          }}
        />
      </div>
    );
  }

  if (page === 'viewer' || appView === 'viewer') {
    return (
      <Layout>
        <ViewerPage />
      </Layout>
    );
  }

  if (page === 'create-event') {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white border-b py-4 px-6 flex items-center justify-between">
          <h1 className="text-xl font-bold">Stageroom</h1>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('events')} className="text-sm text-blue-600 hover:underline">
              ← Back to Events
            </button>
            <UserButton />
          </div>
        </header>
        <EventCreator
          onSuccess={() => navigate('events')}
          onCancel={() => navigate('events')}
        />
      </div>
    );
  }

  if (page === 'event-detail' && selectedEventId) {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white border-b py-4 px-6 flex items-center justify-between">
          <h1 className="text-xl font-bold">Stageroom</h1>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('events')} className="text-sm text-blue-600 hover:underline">
              ← Back to Events
            </button>
            <UserButton />
          </div>
        </header>
        <EventDetail
          eventId={selectedEventId}
          onBack={() => navigate('events')}
        />
      </div>
    );
  }

  if (page === 'events') {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white border-b py-4 px-6 flex items-center justify-between">
          <h1 className="text-xl font-bold">Stageroom</h1>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('studio')} className="text-sm text-blue-600 hover:underline">
              Go to Studio
            </button>
            <button
              onClick={() => navigate('create-event')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              + New Event
            </button>
            <UserButton />
          </div>
        </header>
        <EventList onSelectEvent={(event) => {
          setSelectedEventId(event.id);
          navigate('event-detail');
        }} />
      </div>
    );
  }

  if (page === 'dashboard') {
    return (
      <Layout>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        }>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalyticsDashboard />
            <TeamCollaboration />
          </div>
        </Suspense>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        <VideoPreview />
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-[70%] flex flex-col gap-4">
            <SourcesPanel />
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-1/2">
                <AudioMixer compact />
              </div>
              <div className="w-full md:w-1/2">
                <Backstage />
              </div>
            </div>
            <AudienceGrid />
          </div>
          <div className="w-full lg:w-[30%] flex flex-col gap-4">
            <RecordingLibrary />
            <UnifiedChat />
          </div>
        </div>
      </div>
    </Layout>
  );
}

function App() {
  return (
    <LiveKitProvider>
      <AppContent />
    </LiveKitProvider>
  );
}

export default App;
