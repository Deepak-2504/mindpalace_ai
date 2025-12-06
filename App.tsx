import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TextInput from './components/TextInput';
import MindMap from './components/MindMap';
import PalaceOverview from './components/PalaceOverview';
import RoomView from './components/RoomView';
import { AppRoute } from './types';

const App: React.FC = () => {
  const [route, setRoute] = useState<AppRoute>(AppRoute.DASHBOARD);
  const [params, setParams] = useState<any>({});

  // Hash-based routing simulation to keep it simple and within single-file/component limits effectively
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // remove #
      if (!hash) {
        setRoute(AppRoute.DASHBOARD);
        return;
      }

      const parts = hash.split('/');
      const page = parts[0] as AppRoute;
      
      const newParams: any = {};
      if (page === AppRoute.MINDMAP) newParams.id = parts[1];
      if (page === AppRoute.PALACE_OVERVIEW) newParams.id = parts[1];
      if (page === AppRoute.ROOM_VIEW) {
        newParams.palaceId = parts[1];
        newParams.roomId = parts[2];
      }

      setRoute(page);
      setParams(newParams);
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Init

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (newRoute: AppRoute, newParams?: any) => {
    let hash = `#${newRoute}`;
    if (newRoute === AppRoute.MINDMAP || newRoute === AppRoute.PALACE_OVERVIEW) {
      if (newParams?.id) hash += `/${newParams.id}`;
    }
    if (newRoute === AppRoute.ROOM_VIEW) {
      if (newParams?.palaceId && newParams?.roomId) hash += `/${newParams.palaceId}/${newParams.roomId}`;
    }
    window.location.hash = hash;
  };

  const renderContent = () => {
    switch (route) {
      case AppRoute.DASHBOARD:
        return <Dashboard onNavigate={navigate} />;
      case AppRoute.CREATE:
        return <TextInput onNavigate={navigate} />;
      case AppRoute.MINDMAP:
        return <MindMap palaceId={params.id} onNavigate={navigate} />;
      case AppRoute.PALACE_OVERVIEW:
        return <PalaceOverview palaceId={params.id} onNavigate={navigate} />;
      case AppRoute.ROOM_VIEW:
        return <RoomView palaceId={params.palaceId} roomId={params.roomId} onNavigate={navigate} />;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <Layout currentRoute={route} onNavigate={navigate}>
      {renderContent()}
    </Layout>
  );
};

export default App;
