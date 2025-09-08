import React from 'react';
import { useTranslation, availableLanguages } from '../lib/i18n';
import { GlobeIcon } from './icons';

export const LanguageSwitcher: React.FC = () => {
    const { language, setLanguage } = useTranslation();

    const cycleLanguage = () => {
        const currentIndex = availableLanguages.indexOf(language);
        const nextIndex = (currentIndex + 1) % availableLanguages.length;
        setLanguage(availableLanguages[nextIndex]);
    };

    return (
        <button
            onClick={cycleLanguage}
            className="flex items-center space-x-2 p-2 rounded-full text-sm font-medium transition-colors bg-tg-secondary-bg/50 text-tg-hint hover:bg-tg-bg/80 focus:outline-none focus:ring-2 focus:ring-tg-link backdrop-blur-sm border border-white/10"
            aria-label="Change language"
        >
            <GlobeIcon className="w-5 h-5" />
            <span className="font-semibold uppercase">{language}</span>
        </button>
    );
};