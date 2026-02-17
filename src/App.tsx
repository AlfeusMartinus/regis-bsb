import { MainLayout } from './components/layout/MainLayout';
import { EventSidebar } from './components/features/registration/EventSidebar';
import { RegistrationForm } from './components/features/registration/RegistrationForm';

function App() {
  return (
    <MainLayout sidebar={<EventSidebar />}>
      <RegistrationForm />
    </MainLayout>
  );
}

export default App;
