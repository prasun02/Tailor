import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Loading } from '../components/ui/Loading';
import { router } from '../routes/router';

export default function App() {
  return (
    <Suspense fallback={<Loading label="Loading page" className="m-4" />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
