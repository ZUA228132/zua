import React, { useState } from 'react';
import { useTranslation } from '../lib/i18n';

interface ConsentScreenProps {
  onConsent: () => void;
}

export const ConsentScreen: React.FC<ConsentScreenProps> = ({ onConsent }) => {
  const [isChecked, setIsChecked] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-tg-bg to-tg-secondary-bg">
      <div className="w-full max-w-md bg-tg-secondary-bg/50 border border-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 space-y-6 text-center transform transition-all hover:scale-105 duration-500">
        <h1 className="text-3xl font-bold text-tg-text">{t('consentTitle')}</h1>
        <p className="text-tg-hint">{t('consentIntro')}</p>
        
        <div className="text-left bg-tg-bg/50 p-4 rounded-lg text-sm text-tg-hint space-y-2 border border-white/10">
          <p>{t('consentDataListHeader')}</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>{t('consentDataItem1')}</li>
            <li>{t('consentDataItem2')}</li>
            <li>{t('consentDataItem3')}</li>
          </ul>
        </div>
        
        <label htmlFor="consent-checkbox" className="flex items-center justify-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-tg-bg/30 transition-colors">
          <input
            id="consent-checkbox"
            type="checkbox"
            checked={isChecked}
            onChange={() => setIsChecked(!isChecked)}
            className="h-6 w-6 rounded-md border-gray-400 bg-tg-bg text-tg-button focus:ring-tg-link focus:ring-offset-tg-secondary-bg"
          />
          <span className="text-tg-text">{t('consentCheckboxLabel')}</span>
        </label>
        
        <button
          onClick={onConsent}
          disabled={!isChecked}
          className={`w-full py-3 px-4 text-lg font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 ${
            isChecked 
              ? 'bg-tg-button text-tg-button-text shadow-lg hover:shadow-xl' 
              : 'bg-gray-500 text-gray-300 cursor-not-allowed opacity-50'
          }`}
        >
          {t('proceedButton')}
        </button>
      </div>
    </div>
  );
};