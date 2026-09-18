import { WorkspaceApp } from '../App.jsx';
import { useDemoWorkspace } from './useDemoWorkspace.js';

export default function DemoApp() {
  const workspace = useDemoWorkspace();
  return <WorkspaceApp workspace={workspace} demoMode />;
}
