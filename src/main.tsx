import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter,RouterProvider } from 'react-router-dom';
import Root from './app/Root';
import { UnsavedChangesProvider } from './features/access/useUnsavedChanges';
import './styles/global.css';

const router=createHashRouter([{path:'*',element:<UnsavedChangesProvider><Root/></UnsavedChangesProvider>}]);
createRoot(document.getElementById('root')!).render(<StrictMode><RouterProvider router={router}/></StrictMode>);
