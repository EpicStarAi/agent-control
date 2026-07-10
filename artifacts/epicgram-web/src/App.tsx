import { Route, Switch, Router as WouterRouter } from 'wouter';
import NotFound from '@/pages/not-found';
import OnlineDevBadge from '@/components/OnlineDevBadge';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Client from '@/pages/Client';
import Settings from '@/pages/Settings';
import Downloads from '@/pages/Downloads';
import Apps from '@/pages/Apps';
import Tma from '@/pages/Tma';
import Desktop from '@/pages/Desktop';
import Mobile from '@/pages/Mobile';
import ChannelOs from '@/pages/ChannelOs';
import { Redirect } from 'wouter';

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/client" component={Client} />
      <Route path="/workspace">{() => <Redirect to="/client" />}</Route>
      <Route path="/operator">{() => <Redirect to="/client" />}</Route>
      <Route path="/settings" component={Settings} />
      <Route path="/downloads" component={Downloads} />
      <Route path="/apps" component={Apps} />
      <Route path="/tma" component={Tma} />
      <Route path="/desktop" component={Desktop} />
      <Route path="/mobile" component={Mobile} />
      <Route path="/channel-os" component={ChannelOs} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <OnlineDevBadge />
      <Router />
    </WouterRouter>
  );
}

export default App;
