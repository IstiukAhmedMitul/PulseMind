"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "bn";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header
    appName: "PulseMind",
    appSubtitle: "Real-Time ECG Monitor & AI Health Assistant",
    dashboard: "Dashboard",
    education: "Educational Guide",
    liveStatus: "Live Monitor",
    connecting: "Connecting...",
    disconnected: "Disconnected",
    
    // Actions
    exportPdf: "Export PDF",
    shareReport: "Share Report",
    analyze: "Analyze",
    analyzing: "Analyzing...",
    copyLink: "Copy Share Link",
    linkCopied: "Link Copied!",
    
    // Monitor
    ecgWaveform: "Real-time ECG Trace",
    waitingData: "Waiting for ECG data from ESP8266...",
    
    // Stats & Vitals
    heartRate: "Heart Rate",
    rhythmStatus: "Rhythm Status",
    rhythmNormal: "Rhythm Normal",
    sdnnHrv: "SDNN (HRV)",
    rmssdHrv: "RMSSD (HRV)",
    sampleCount: "Samples Analyzed",

    // Panels
    aiAnalysisTitle: "AI Health Analysis",
    chatTitle: "PulseMind AI Assistant",
    chatPlaceholder: "Ask anything about heart rate, ECG, or your live metrics...",
    chatSend: "Send",
    liveContextBadge: "Live Data Linked",
    
    // Education
    eduTitle: "ECG Educational Guide & Learning Center",
    eduSubtitle: "Learn how Electrocardiograms work, sensor placement, and understanding heart rate metrics.",
    anatomyTitle: "Anatomy of an ECG Wave (P-QRS-T)",
    pWave: "P Wave: Atrial depolarization (atria contraction).",
    qrsComplex: "QRS Complex: Ventricular depolarization (ventricles pump blood).",
    tWave: "T Wave: Ventricular repolarization (ventricles recovery & relax).",
    
    hrvGuideTitle: "Heart Rate Variability (HRV) Explained",
    sdnnDesc: "SDNN measures overall beat-to-beat variability over time. Higher variability generally indicates better cardiovascular fitness.",
    rmssdDesc: "RMSSD evaluates short-term variations between consecutive heartbeats, reflecting autonomic nervous system balance.",
    
    sensorSetupTitle: "AD8232 Hardware Setup Guide",
    sensorPlacement: "3-Lead Electrode Placement: Red (Right Arm/Chest), Yellow (Left Arm/Chest), Green (Right Leg/Lower abdomen for Ground).",
    
    // Shared Report Page
    sharedReportTitle: "Public ECG Measurement Snapshot",
    sharedReportSub: "Non-authenticated educational health report summary.",
    generatedAt: "Report Generated At",
    backToDashboard: "Go to Main Dashboard",
  },
  bn: {
    // Header
    appName: "পালসমাইন্ড (PulseMind)",
    appSubtitle: "রিয়েল-টাইম ইসিজি মনিটর এবং এআই হেলথ অ্যাসিস্ট্যান্ট",
    dashboard: "ড্যাশবোর্ড",
    education: "শিক্ষা গাইড",
    liveStatus: "লাইভ লাইভ মনিটর",
    connecting: "সংযুক্ত হচ্ছে...",
    disconnected: "বিচ্ছিন্ন",

    // Actions
    exportPdf: "পিডিএফ ডাউনলোড",
    shareReport: "রিপোর্ট শেয়ার করুন",
    analyze: "বিশ্লেষণ করুন",
    analyzing: "বিশ্লেষণ হচ্ছে...",
    copyLink: "লিঙ্ক কপি করুন",
    linkCopied: "লিঙ্ক কপি হয়েছে!",

    // Monitor
    ecgWaveform: "রিয়েল-টাইম ইসিজি ওয়েভফর্ম",
    waitingData: "ESP8266 ডেটার জন্য অপেক্ষা করা হচ্ছে...",

    // Stats & Vitals
    heartRate: "হৃদস্পন্দন (BPM)",
    rhythmStatus: "ছন্দের অবস্থা",
    rhythmNormal: "ছন্দ স্বাভাবিক",
    sdnnHrv: "SDNN (এইচআরভি)",
    rmssdHrv: "RMSSD (এইচআরভি)",
    sampleCount: "বিশ্লেষিত স্যাম্পল",

    // Panels
    aiAnalysisTitle: "এআই স্বাস্থ্য বিশ্লেষণ",
    chatTitle: "পালসমাইন্ড এআই অ্যাসিস্ট্যান্ট",
    chatPlaceholder: "ইসিজি, হৃদস্পন্দন বা আপনার লাইভ মেট্রিক্স সম্পর্কে প্রশ্ন করুন...",
    chatSend: "পাঠান",
    liveContextBadge: "লাইভ ডেটা সংযুক্ত",

    // Education
    eduTitle: "ইসিজি শিক্ষা কেন্দ্র ও টিউটোরিয়াল",
    eduSubtitle: "ইসিজি তরঙ্গ, সেন্সর সেটআপ এবং হৃদস্পন্দনের পরিমাপ সম্পর্কে শিখুন।",
    anatomyTitle: "ইসিজি তরঙ্গের অঙ্গসংস্থান (P-QRS-T)",
    pWave: "P তরঙ্গ: অ্যাট্রিয়ামের সংকোচন (Atrial Depolarization)",
    qrsComplex: "QRS কমপ্লেক্স: ভেন্ট্রিকলের রক্ত পাম্পকরণ (Ventricular Depolarization)",
    tWave: "T তরঙ্গ: ভেন্ট্রিকলের বিশ্রাম অবস্থা (Ventricular Repolarization)",

    hrvGuideTitle: "হার্ট রেট ভ্যারিয়েবিলিটি (HRV) ব্যাখ্যা",
    sdnnDesc: "SDNN হৃদস্পন্দনের সামগ্রিক তারতম্য পরিমাপ করে। বেশি তারতম্য ভালো ফিটনেস নির্দেশ করে।",
    rmssdDesc: "RMSSD পর পর হৃদস্পন্দনের স্বল্পমেয়াদী তারতম্য পরিমাপ করে।",

    sensorSetupTitle: "AD8232 সেন্সর সেটআপ নির্দেশিকা",
    sensorPlacement: "৩-লিড ইলেকট্রোড বসানো: লাল (ডান বুক/হাত), হলুদ (বাম বুক/হাত), সবুজ (ডান তলপেট/গ্রাউন্ড)।",

    // Shared Report Page
    sharedReportTitle: "পাবলিক ইসিজি রিপোর্ট স্ন্যাপশট",
    sharedReportSub: "শিক্ষা ও তথ্যের জন্য উন্মুক্ত ইসিজি হেলথ রিপোর্ট।",
    generatedAt: "রিপোর্ট তৈরির সময়",
    backToDashboard: "মূল ড্যাশবোর্ডে ফিরে যান",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("pulsemind_lang") as Language;
    if (saved === "en" || saved === "bn") {
      setLangState(saved);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("pulsemind_lang", newLang);
  };

  const t = (key: string): string => {
    return translations[lang][key] || translations["en"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
