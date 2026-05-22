import './App.css';
import Layout from './components/layout/Layout';
import { VideoPreview } from './components/preview/VideoPreview';
import { StudioPanel } from './components/sources/StudioPanel';
import { Backstage } from './components/guests/Backstage';
import { AudioMixer } from './components/audio/AudioMixer';
import { UnifiedChat } from './components/chat/UnifiedChat';
import { useState, useEffect } from 'react';
import { RecordingLibrary } from './components/recording/RecordingLibrary';
import { AudienceGrid } from './components/audience/AudienceGrid';
import { ViewerPage } from './components/audience/ViewerPage';
import { LiveKitProvider } from './components/stage/LiveKitProvider';
import { useStreamStore } from './hooks/useStreamStore';
import { useAuthStore } from './hooks/useAuthStore';
import { AuthPage } from './components/auth/AuthPage';
import { EventList } from './components/events/EventList';
import { EventDetail } from './components/events/EventDetail';
import { GuestRegistration } from './components/guests/GuestRegistration';
import { DashboardView } from './components/dashboard/DashboardView';
import { SetupModal } from './components/events/SetupModal';
import { ShareModal } from './components/events/ShareModal';
import { ScheduleStreamSidebar } from './components/events/ScheduleStreamSidebar';
import * as studioApi from './api/studio';

interface EventData {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  ticket_type: string;
  ticket_price: number;
  currency: string;
  category: string | null;
  poster_url: string | null;
  qr_code_url: string | null;
}

function AppContent() {
  const { user, loading, checkAuth, logout } = useAuthStore();
  const { appView, setAppView, stageMode, setStageMode } = useStreamStore();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [guestEventId, setGuestEventId] = useState<string | null>(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [shareEvent, setShareEvent] = useState<{ title: string; url: string } | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    checkAuth().finally(() => setInitialized(true));
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      const data = await studioApi.loadStudioConfig();
      if (data && (data.scenes?.length || data.sources?.length)) {
        useStreamStore.getState().loadFromDb(data);
        useStreamStore.getState().backfillRtmpSources();
      } else {
        const defaultSceneId = `scene_${Date.now()}`;
        await useStreamStore.getState().addScene('Scene 1', defaultSceneId);
        useStreamStore.setState({ selectedSceneId: defaultSceneId });
      }
    };
    loadData();
  }, [user]);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith('/watch/')) {
      setAppView('viewer');
      return;
    }
    if (hash.startsWith('/guest/')) {
      setGuestEventId(hash.replace('/guest/', ''));
      return;
    }
  }, []);

  if (!initialized || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!user && appView !== 'viewer' && !guestEventId) {
    return <AuthPage />;
  }

  if (guestEventId && appView !== 'viewer') {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white border-b py-4 px-6">
          <h1 className="text-xl font-bold">Stageroom</h1>
        </header>
        <GuestRegistration
          eventId={guestEventId}
          onSuccess={() => {
            window.location.hash = `/watch/${guestEventId}`;
            setAppView('viewer');
          }}
        />
      </div>
    );
  }

  if (appView === 'viewer') {
    return (
      <Layout>
        <ViewerPage />
      </Layout>
    );
  }

  if (appView === 'events') {
    return (
      <Layout>
        {selectedEventId ? (
          <EventDetail
            eventId={selectedEventId}
            onBack={() => setSelectedEventId(null)}
            onShare={(event: EventData) => setShareEvent({ title: event.title, url: event.qr_code_url || '' })}
          />
        ) : (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">My Events</h2>
              <button
                onClick={() => setShowCreateEvent(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                + Schedule Stream
              </button>
            </div>
            <EventList
              onSelectEvent={(event) => setSelectedEventId(event.id)}
              onDeleteEvent={async (id) => {
                if (!confirm('Delete this event?')) return;
                try {
                  const token = useAuthStore.getState().token;
                  await fetch(`/api/events/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` },
                  });
                  window.location.reload();
                } catch (err) {
                  console.error(err);
                }
              }}
              onShareEvent={(event) => setShareEvent({ title: event.title, url: event.qr_code_url || '' })}
            />
          </div>
        )}

        <ScheduleStreamSidebar
          isOpen={showCreateEvent}
          onClose={() => setShowCreateEvent(false)}
          onSuccess={() => {
            setShowCreateEvent(false);
            window.location.reload();
          }}
        />
      </Layout>
    );
  }

  if (appView === 'dashboard') {
    return (
      <Layout>
        <DashboardView />
      </Layout>
    );
  }

  return (
    <Layout onSetup={() => setShowSetupModal(true)}>
      <div className="flex flex-col gap-4">
        <VideoPreview />
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-[70%] flex flex-col gap-4">
            <StudioPanel />
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

      <SetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onSuccess={(data) => {
          setStageMode(data.event.category || stageMode);
          setShareEvent({ title: data.event.title, url: data.qr_url });
          useStreamStore.getState().setSetupDone(true);
          setShowSetupModal(false);
        }}
      />

      {shareEvent && (
        <ShareModal
          isOpen={!!shareEvent}
          onClose={() => setShareEvent(null)}
          eventTitle={shareEvent.title}
          shareUrl={shareEvent.url}
        />
      )}
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
