import React, { useState } from 'react';
import { I18nProvider, useTranslation } from './lib/i18n';
import { ConsentScreen } from './components/ConsentScreen';
import { UserForm } from './components/UserForm';
import { AdminPanel } from './components/AdminPanel';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { useTelegram } from './hooks/useTelegram';

const ADMIN_TELEGRAM_ID = 7264453091;

const AdminView: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="max-w-4xl mx-auto">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-tg-text drop-shadow-lg">{t('adminTitle')}</h1>
                <LanguageSwitcher />
            </header>
            <main>
                <AdminPanel />
            </main>
        </div>
    );
};

const UserView: React.FC = () => {
    const [hasConsented, setHasConsented] = useState(false);

    if (!hasConsented) {
        return <ConsentScreen onConsent={() => setHasConsented(true)} />;
    }

    return (
         <div className="max-w-md mx-auto relative">
             <header className="absolute top-0 right-0 z-10 h-12">
                 <LanguageSwitcher />
             </header>
             <main>
                <UserForm />
             </main>
         </div>
    );
};

const AppContent: React.FC = () => {
  const { user } = useTelegram();
  const { t } = useTranslation();

  if (!user) {
    return (
        <div className="min-h-screen flex items-center justify-center text-tg-hint">
            <p>{t('telegramDataLoading')}</p>
        </div>
    );
  }

  const isAdmin = user.id === ADMIN_TELEGRAM_ID;

  return (
    <div className="min-h-screen bg-gradient-to-br from-tg-bg to-tg-secondary-bg text-tg-text font-sans p-4 antialiased">
      {isAdmin ? <AdminView /> : <UserView />}
    </div>
  );
};

const App: React.FC = () => (
  <I18nProvider>
    <AppContent />
  </I18nProvider>
);

export default App;