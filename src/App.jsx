import React, { useState, useEffect, useRef } from 'react';
import { CustomSpinner, ClockIcon, CheckCircleIcon, XCircleIcon, TrashIcon, SparklesIcon, Wand2Icon, PlayIcon, PauseIcon, DownloadIcon, FileTextIcon, EyeIcon, EditIcon, AlertTriangleIcon, ChevronDownIcon, PlusIcon, CopyIcon, UploadCloudIcon, CodeIcon, SendIcon, TypeIcon, FileIcon, BriefcaseIcon, CoffeeIcon, UndoIcon, RedoIcon, SettingsIcon } from './icons';
import { HUGGING_FACE_URLS, CATEGORIES, BUILTIN_STYLE_DETAILS, RATIOS, RESOLUTIONS, DIMENSIONS, DURATIONS, SYSTEM_LAYER_1, SYSTEM_LAYER_2, SYSTEM_LAYER_3, SYSTEM_LAYER_4, SYSTEM_LAYER_5, SYSTEM_LAYER_6, SYSTEM_LAYER_7 } from './constants';
import { R, getOpfsDir, saveToOpfs, getFromOpfs, deleteFromOpfs, fileToBase64, hslToHex, wrapSvgAsHtml, generateRandomTaskID, generateRandomSuffix } from './utils';

// =====================================================================
// === KONFIGURASI GOOGLE APPS SCRIPT (SATPAM LOGIN) ===
// Anda dapat mengedit URL Deployment Web App di bawah ini.
// =====================================================================
const GAS_AUTH_URL = "https://script.google.com/macros/s/AKfycbxkoD96dcvAmMs7X-yK_3N7W2aNlE4kdd6R3HHVm3BFxOCRQ7yFnILsdE2Pe3uKGI65Gw/exec";

// --- INDEXED DB UNTUK DEVICE ID & AUTO-SAVE ---
const META_STORE_NAME = 'meta_store';
const CARDS_STORE_NAME = 'cards_store';
const BLUEPRINTS_STORE_NAME = 'blueprints_store';
const UPLOADED_FILES_STORE_NAME = 'uploaded_files_store';

const initMetaDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('AmatiMetaDB', 2); // Versi dinaikkan ke 2
        request.onerror = (e) => reject("IndexedDB error: " + e.target.errorCode);
        request.onsuccess = (e) => resolve(e.target.result);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(META_STORE_NAME)) {
                db.createObjectStore(META_STORE_NAME, { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains(CARDS_STORE_NAME)) {
                db.createObjectStore(CARDS_STORE_NAME, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(BLUEPRINTS_STORE_NAME)) {
                db.createObjectStore(BLUEPRINTS_STORE_NAME, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(UPLOADED_FILES_STORE_NAME)) {
                db.createObjectStore(UPLOADED_FILES_STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

// --- HELPER CRUD DB ---
const saveDeviceIdToDB = async (id) => {
    try {
        const db = await initMetaDB();
        const tx = db.transaction(META_STORE_NAME, 'readwrite');
        tx.objectStore(META_STORE_NAME).put({ key: 'device_id', value: id });
    } catch (err) { console.error('Gagal simpan device id ke IndexedDB:', err); }
};
const loadDeviceIdFromDB = () => {
    return new Promise(async (resolve) => {
        try {
            const db = await initMetaDB();
            const tx = db.transaction(META_STORE_NAME, 'readonly');
            const req = tx.objectStore(META_STORE_NAME).get('device_id');
            req.onsuccess = () => resolve(req.result ? req.result.value : null);
            req.onerror = () => resolve(null);
        } catch (err) { resolve(null); }
    });
};

// Cards Helper (Text & File mode saja)
const saveCardToDB = async (card) => {
    if (card.mode === 'render') return;
    try {
        const db = await initMetaDB();
        const tx = db.transaction(CARDS_STORE_NAME, 'readwrite');
        tx.objectStore(CARDS_STORE_NAME).put(card);
    } catch (err) { console.error('Gagal simpan card:', err); }
};
const loadCardsFromDB = () => {
    return new Promise(async (resolve) => {
        try {
            const db = await initMetaDB();
            const tx = db.transaction(CARDS_STORE_NAME, 'readonly');
            const req = tx.objectStore(CARDS_STORE_NAME).getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        } catch (err) { resolve([]); }
    });
};
const deleteCardFromDB = async (id) => {
    try {
        const db = await initMetaDB();
        const tx = db.transaction(CARDS_STORE_NAME, 'readwrite');
        tx.objectStore(CARDS_STORE_NAME).delete(id);
    } catch (err) { console.error('Gagal hapus card:', err); }
};
const clearCardsFromDB = async () => {
    try {
        const db = await initMetaDB();
        const tx = db.transaction(CARDS_STORE_NAME, 'readwrite');
        tx.objectStore(CARDS_STORE_NAME).clear();
    } catch (err) { console.error('Gagal clear cards:', err); }
};

// Blueprints Helper
const saveBlueprintToDB = async (bp) => {
    try {
        const db = await initMetaDB();
        const tx = db.transaction(BLUEPRINTS_STORE_NAME, 'readwrite');
        tx.objectStore(BLUEPRINTS_STORE_NAME).put(bp);
    } catch (err) { console.error('Gagal simpan blueprint:', err); }
};
const loadBlueprintsFromDB = () => {
    return new Promise(async (resolve) => {
        try {
            const db = await initMetaDB();
            const tx = db.transaction(BLUEPRINTS_STORE_NAME, 'readonly');
            const req = tx.objectStore(BLUEPRINTS_STORE_NAME).getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        } catch (err) { resolve([]); }
    });
};
const deleteBlueprintFromDB = async (id) => {
    try {
        const db = await initMetaDB();
        const tx = db.transaction(BLUEPRINTS_STORE_NAME, 'readwrite');
        tx.objectStore(BLUEPRINTS_STORE_NAME).delete(id);
    } catch (err) { console.error('Gagal hapus blueprint:', err); }
};
const clearBlueprintsFromDB = async () => {
    try {
        const db = await initMetaDB();
        const tx = db.transaction(BLUEPRINTS_STORE_NAME, 'readwrite');
        tx.objectStore(BLUEPRINTS_STORE_NAME).clear();
    } catch (err) { console.error('Gagal clear blueprints:', err); }
};

// Uploaded Files Helper
const saveUploadedFileToDB = async (file) => {
    try {
        const db = await initMetaDB();
        const tx = db.transaction(UPLOADED_FILES_STORE_NAME, 'readwrite');
        const { url, ...storable } = file; // Buang blob sementara
        tx.objectStore(UPLOADED_FILES_STORE_NAME).put(storable);
    } catch (err) { console.error('Gagal simpan file:', err); }
};
const loadUploadedFilesFromDB = () => {
    return new Promise(async (resolve) => {
        try {
            const db = await initMetaDB();
            const tx = db.transaction(UPLOADED_FILES_STORE_NAME, 'readonly');
            const req = tx.objectStore(UPLOADED_FILES_STORE_NAME).getAll();
            req.onsuccess = () => {
                const restored = (req.result || []).map(f => ({ ...f, url: f.base64 }));
                resolve(restored);
            };
            req.onerror = () => resolve([]);
        } catch (err) { resolve([]); }
    });
};
const deleteUploadedFileFromDB = async (id) => {
    try {
        const db = await initMetaDB();
        const tx = db.transaction(UPLOADED_FILES_STORE_NAME, 'readwrite');
        tx.objectStore(UPLOADED_FILES_STORE_NAME).delete(id);
    } catch (err) { console.error('Gagal hapus file:', err); }
};
const clearUploadedFilesFromDB = async () => {
    try {
        const db = await initMetaDB();
        const tx = db.transaction(UPLOADED_FILES_STORE_NAME, 'readwrite');
        tx.objectStore(UPLOADED_FILES_STORE_NAME).clear();
    } catch (err) { console.error('Gagal clear files:', err); }
};


// --- KOMPONEN PLAYER VIDEO OPFS KHUSUS ---
const OpfsVideoPlayer = ({ cardId }) => {
    const [videoUrl, setVideoUrl] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let localUrl = null;
        let cancelled = false;

        getFromOpfs('mp4', cardId)
            .then(file => {
                if (cancelled) return;
                localUrl = URL.createObjectURL(file);
                setVideoUrl(localUrl);
            })
            .catch(() => setError(true));

        return () => {
            cancelled = true;
            if (localUrl) URL.revokeObjectURL(localUrl);
        };
    }, [cardId]);

    if (error) return <div className="text-slate-500 text-xs flex items-center justify-center h-full w-full bg-slate-100">File tidak ditemukan.</div>;
    if (!videoUrl) return <div className="text-slate-500 text-xs flex items-center justify-center h-full w-full bg-slate-100">Memuat Video...</div>;

    return <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />;
};

export default function App() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [inputMode, setInputMode] = useState('text');

    // --- AUTH STATE ---
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authEmail, setAuthEmail] = useState('');
    const [loginEmail, setLoginEmail] = useState('');
    const [loginState, setLoginState] = useState('idle'); 
    const [deviceId, setDeviceId] = useState('');
    const [showFullEmail, setShowFullEmail] = useState(false);
    const [logoutConfirm, setLogoutConfirm] = useState(false);

    // --- TOAST STATE ---
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    const getMaskedEmail = (email) => {
        if (!email) return '';
        const [name, domain] = email.split('@');
        if (!domain) return email;
        return '*'.repeat(name.length) + '@' + domain;
    };

    const promptMediaInputRef = useRef(null);
    const [uploadedFilesData, setUploadedFilesData] = useState([]);
    const [selectedRatio, setSelectedRatio] = useState('16:9');
    const [selectedResolution, setSelectedResolution] = useState('1080');
    const [selectedDuration, setSelectedDuration] = useState(10);
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [magicKeyword, setMagicKeyword] = useState('');
    const [magicCount, setMagicCount] = useState(10);
    const [magicSuggestions, setMagicSuggestions] = useState([]);
    const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
    const [promptBuilders, setPromptBuilders] = useState([{ id: Date.now(), topic: '', categoryLeft: 'None', categoryRight: 'None', customStyle: null, customStyleDetail: null, amount: 1, duration: 10 }]);
    const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
    const [blueprints, setBlueprints] = useState([]);
    const [blueprintQuantity, setBlueprintQuantity] = useState(1);
    const [editingBlueprintId, setEditingBlueprintId] = useState(null);
    const [editBpForm, setEditBpForm] = useState({});
    const [instructions, setInstructions] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [workerCount, setWorkerCount] = useState(5); 
    const [workerDelay, setWorkerDelay] = useState(5);
    const [fileQuantity, setFileQuantity] = useState(1);

    const renderMediaInputRef = useRef(null);
    const [renderFps, setRenderFps] = useState(60);
    const [renderBitrate, setRenderBitrate] = useState(30); 
    const [renderImportType, setRenderImportType] = useState('txt'); 
    const [renderExportType, setRenderExportType] = useState('mp4'); 

    const [zipFilename, setZipFilename] = useState('');
    const [zipProgress, setZipProgress] = useState(null); 
    const [cards, setCards] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [activeProcessGroup, setActiveProcessGroup] = useState(null);
    
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    
    const [globalMessage, setGlobalMessage] = useState(null);
    const [previewModal, setPreviewModal] = useState(null);
    const [previewTab, setPreviewTab] = useState('motion'); 
    const [base64Preview, setBase64Preview] = useState('');
    const [editCardId, setEditCardId] = useState(null);
    const [editCode, setEditCode] = useState('');
    const [editChatInput, setEditChatInput] = useState('');
    const [editTab, setEditTab] = useState('code'); 
    const [isRevising, setIsRevising] = useState(false);
    const [editHistory, setEditHistory] = useState([]);
    const [editHistoryIndex, setEditHistoryIndex] = useState(-1);
    const [fileToDelete, setFileToDelete] = useState(null);
    const [clearAllConfirm, setClearAllConfirm] = useState(false);
    const [clearAllFilesConfirm, setClearAllFilesConfirm] = useState(false);
    const [fileToDeleteConfirm, setFileToDeleteConfirm] = useState(null);
    const [blueprintToDeleteConfirm, setBlueprintToDeleteConfirm] = useState(null);
    const [clearAllBlueprintsConfirm, setClearAllBlueprintsConfirm] = useState(false);
    const [filePreviewModal, setFilePreviewModal] = useState(null);
    
    const [editRatio, setEditRatio] = useState('16:9');

    const cardsRef = useRef([]);
    const isPausedRef = useRef(false);
    const isGeneratingRef = useRef(false);
    const abortControllerRef = useRef(null);
    const cardsSyncTimeout = useRef(null);

    // --- AUTO-SYNC KE DB ---
    useEffect(() => {
        cardsRef.current = cards;
        if (!isAuthenticated) return;
        clearTimeout(cardsSyncTimeout.current);
        cardsSyncTimeout.current = setTimeout(() => {
            cards.filter(c => c.mode !== 'render').forEach(c => saveCardToDB(c));
        }, 800);
    }, [cards, isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) return;
        blueprints.forEach(bp => saveBlueprintToDB(bp));
    }, [blueprints, isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) return;
        uploadedFilesData.forEach(f => saveUploadedFileToDB(f));
    }, [uploadedFilesData, isAuthenticated]);

    useEffect(() => {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Share+Tech&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const loadInitialData = async () => {
        const [savedCards, savedBlueprints, savedFiles] = await Promise.all([
            loadCardsFromDB(),
            loadBlueprintsFromDB(),
            loadUploadedFilesFromDB(),
        ]);

        if (savedCards.length > 0) {
            const cleaned = savedCards.map(c => c.status === 'processing' ? { ...c, status: 'pending' } : c);
            setCards(cleaned);
        }
        if (savedBlueprints.length > 0) setBlueprints(savedBlueprints);
        if (savedFiles.length > 0) setUploadedFilesData(savedFiles);
    };

    // --- INIT AUTH & DEVICE ID ---
    useEffect(() => {
        const initAuth = async () => {
            let currentDeviceId = localStorage.getItem('amati_device_id');
            const dbDeviceId = await loadDeviceIdFromDB();

            if (!currentDeviceId && dbDeviceId) {
                currentDeviceId = dbDeviceId;
                localStorage.setItem('amati_device_id', currentDeviceId);
            } else if (!currentDeviceId) {
                currentDeviceId = 'dev_' + Math.random().toString(36).substring(2, 15);
                localStorage.setItem('amati_device_id', currentDeviceId);
            }
            saveDeviceIdToDB(currentDeviceId);
            setDeviceId(currentDeviceId);

            if (navigator.storage && navigator.storage.persist) {
                navigator.storage.persist().then((granted) => {
                    console.log('Persistent storage granted:', granted);
                });
            }

            const session = localStorage.getItem('amati_session');
            if (session) {
                const parsedSession = JSON.parse(session);
                setIsAuthenticated(true);
                setAuthEmail(parsedSession.email);
                loadInitialData(); // Load Data setelah login terverifikasi
            }
        };
        initAuth();
    }, []);

    useEffect(() => {
        if (previewModal?.mode === 'render' && previewTab === 'base64') {
            setBase64Preview('Memuat...');
            getFromOpfs('base64', previewModal.id)
                .then(f => f.text())
                .then(setBase64Preview)
                .catch(async () => {
                    try {
                        const mp4File = await getFromOpfs('mp4', previewModal.id);
                        const b64 = await fileToBase64(mp4File);
                        setBase64Preview(b64);
                        await saveToOpfs('base64', previewModal.id, b64); 
                    } catch {
                        setBase64Preview('Gagal membuat data Base64 — file MP4 tidak ditemukan.');
                    }
                });
        }
    }, [previewModal?.id, previewTab]);

    const handleLogin = async () => {
        if (!loginEmail.trim()) {
            showToast("Masukkan email terlebih dahulu", "error");
            return;
        }
        setLoginState('loading');
        try {
            const res = await fetch(GAS_AUTH_URL, {
                method: 'POST',
                mode: 'cors',
                redirect: 'follow',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'login', email: loginEmail, deviceId: deviceId })
            });
            const data = await res.json();
            if (data.success) {
                setLoginState('success');
                showToast("Selamat Datang Kembali", "success");
                localStorage.setItem('amati_session', JSON.stringify({ email: loginEmail }));
                setAuthEmail(loginEmail);
                setTimeout(() => {
                    setIsAuthenticated(true);
                    loadInitialData(); // Load Data saat login berhasil
                }, 800);
            } else {
                setLoginState('failed');
                if (data.message === "Max Device Terpakai") {
                    showToast("Max Device Terpakai", "error");
                } else if (data.message === "Email Tidak Terdaftar") {
                    showToast("Email Tidak Terdaftar", "error");
                } else {
                    showToast(data.message || "Gagal Login", "error");
                }
                setTimeout(() => setLoginState('idle'), 1500);
            }
        } catch (err) {
            setLoginState('failed');
            showToast("Koneksi gagal. Cek internet atau URL Satpam.", "error");
            setTimeout(() => setLoginState('idle'), 1500);
        }
    };

    const handleLogout = () => {
        fetch(GAS_AUTH_URL, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'logout', email: authEmail, deviceId })
        }).catch(err => console.error("Gagal logout:", err));

        clearCardsFromDB();
        clearBlueprintsFromDB();
        clearUploadedFilesFromDB();

        localStorage.removeItem('amati_session');
        setIsAuthenticated(false);
        setAuthEmail('');
        setCards([]);
        setBlueprints([]);
        setUploadedFilesData([]);
        window.location.reload();
    };

    const timeString = currentTime.toLocaleTimeString('id-ID', { hour12: false });
    const dateString = currentTime.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

    const activeCards = cards.filter(c => inputMode === 'render' ? c.mode === 'render' : c.mode !== 'render');

    const computedTaskCount = 
        inputMode === 'text' ? blueprints.length * (parseInt(blueprintQuantity) || 1) : 
        inputMode === 'file' ? uploadedFilesData.length * (parseInt(fileQuantity) || 1) :
        activeCards.length;

    const countPending = activeCards.filter(f => f.status === 'pending').length;
    const countProcessing = activeCards.filter(f => f.status === 'processing').length;
    const countSuccess = activeCards.filter(f => f.status === 'done').length;
    const countFailed = activeCards.filter(f => f.status === 'failed').length;

    const selectedDisplayCount = inputMode === 'render' 
        ? (countPending + countProcessing) 
        : (isGenerating || countPending > 0 ? (countPending + countProcessing) : computedTaskCount);

    const currentContextGroup = inputMode === 'render' ? 'render' : 'generate';
    const isProcessMismatch = activeProcessGroup !== null && activeProcessGroup !== currentContextGroup;
    const isTabGenerating = isGenerating && !isProcessMismatch;
    const isTabPaused = isPaused && !isProcessMismatch;
    const isTabProcessing = countProcessing > 0;

    const canGenerate = inputMode === 'render'
        ? (countPending > 0 || countFailed > 0) && !isTabGenerating && !isTabPaused && !isTabProcessing
        : (computedTaskCount > 0 || countPending > 0 || countFailed > 0) && !isTabGenerating && !isTabPaused && !isTabProcessing;
        
    const canPauseResume = isTabGenerating || isTabProcessing || isTabPaused;
    const isZipActive = countSuccess > 0;

    const inputClass = "w-full text-xs py-1.5 px-2 border border-gray-300 rounded bg-white text-gray-900 focus:ring-2 focus:ring-[#0891B3] focus:outline-none focus:border-[#0891B3] transition-all disabled:bg-gray-100 disabled:text-gray-400 h-[30px]";

    // --- SISTEM GATEWAY IFRAME (KUNCI API DIHAPUS DARI VERCEL) ---
    const callGeminiViaGateway = (payload, signal) => {
        return new Promise((resolve, reject) => {
            const id = Date.now().toString() + Math.random().toString(36).substring(2);
            
            const handleMessage = (event) => {
                const data = event.data;
                if (data && data.type === 'GEMINI_RESPONSE' && data.id === id) {
                    window.removeEventListener('message', handleMessage);
                    if (data.success) resolve(data.data);
                    else reject(new Error(data.error || "Gagal memanggil AI via Gateway"));
                }
            };
            
            window.addEventListener('message', handleMessage);
            
            if (signal) {
                signal.addEventListener('abort', () => {
                    window.removeEventListener('message', handleMessage);
                    reject(new DOMException('Aborted', 'AbortError'));
                });
            }
            
            window.parent.postMessage({ type: 'CALL_GEMINI', id, payload }, '*');
        });
    };

    // --- IDEAS & PROMPTS ---
    const handleGenerateIdeas = async () => {
        if (!magicKeyword.trim()) {
            setGlobalMessage({ title: "Perhatian", type: "warning", text: "Silakan masukkan kata kunci utama untuk melacak ide!" });
            return;
        }
        setIsGeneratingIdeas(true);
        try {
            const totalAmount = parseInt(magicCount) || 10;
            const batchSize = 5;
            let remaining = totalAmount;
            let allSuggestions = [];

            while (remaining > 0) {
                const currentAmount = Math.min(remaining, batchSize);
                const existingStyles = allSuggestions.map(s => s.style).join(", ");
                const antiRepetition = allSuggestions.length > 0 ? `\n\nHindari penggunaan nama gaya visual (style) ini karena sudah dipakai sebelumnya: [${existingStyles}].` : "";
                const systemPrompt = `You are a Motion Graphic & UI Asset Analyst. Brainstorm EXACTLY ${currentAmount} highly profitable, creative, and specific ideas for individual web animation assets based on the provided base keyword.
CRITICAL RULE: All object/theme text ideas MUST BE IN INDONESIAN LANGUAGE (Bahasa Indonesia). 
Invent a HIGHLY UNIQUE and descriptive visual style name for each idea. DO NOT use generic terms like "Flat Design" or "Minimalist". Think outside the box.
CRITICAL RULE UNTUK VARIASI: Karena Anda diminta membuat ide, posisikan diri Anda sebagai ${currentAmount} Art Director eksentrik. Berikan gaya visual yang paling liar, di luar nalar, dan sangat spesifik untuk masing-masing ide!${antiRepetition}
Format strictly as a JSON object with a root key "suggestions": { "suggestions": [ { "text": "Ide spesifik dalam bahasa Indonesia", "style": "Custom Style Name Here", "styleDetail": "Deskripsi teknis visual singkat 1 kalimat (contoh: gradasi warna neon translucent dengan efek refraksi cahaya)" } ] }`;

                const payload = { contents: [{ parts: [{ text: `Kata Kunci Utama: ${magicKeyword.trim()}` }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json" } };
                const parsedData = await callGeminiViaGateway(payload);
                let textRes = parsedData.candidates[0].content.parts[0].text;
                const parsed = JSON.parse(textRes);
                if (parsed.suggestions) {
                    allSuggestions = [...allSuggestions, ...parsed.suggestions.map(s => ({ ...s, addedId: null }))];
                    setMagicSuggestions(allSuggestions);
                }
                remaining -= currentAmount;
            }
        } catch (err) {
            setGlobalMessage({ title: "Error Sistem", type: "error", text: "Gagal meracik ide: " + err.message });
        } finally { setIsGeneratingIdeas(false); }
    };

    const handleToggleIdea = (idx, idea) => {
        if (magicSuggestions[idx].addedId) {
            const idToRemove = magicSuggestions[idx].addedId;
            setPromptBuilders(prev => {
                if (prev.length === 1) return [{ id: Date.now() + R(), topic: '', categoryLeft: 'None', categoryRight: 'None', customStyle: null, customStyleDetail: null, amount: 1, duration: 10 }]; 
                return prev.filter(b => b.id !== idToRemove); 
            });
            setMagicSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, addedId: null } : s));
        } else {
            const newId = Date.now() + R();
            setPromptBuilders(prev => {
                const newRow = { id: newId, topic: idea.text, categoryLeft: 'None', categoryRight: idea.style, customStyle: idea.style, customStyleDetail: idea.styleDetail, amount: 1, duration: 10 };
                if (prev.length === 1 && prev[0].topic === '' && prev[0].categoryLeft === 'None' && prev[0].categoryRight === 'None') return [newRow];
                return [...prev, newRow];
            });
            setMagicSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, addedId: newId } : s));
        }
    };

    const addBuilder = () => setPromptBuilders([...promptBuilders, { id: Date.now() + R(), topic: '', categoryLeft: 'None', categoryRight: 'None', customStyle: null, customStyleDetail: null, amount: 1, duration: 10 }]);
    const removeBuilder = (id) => {
        setPromptBuilders(prev => {
            if (prev.length === 1) return [{ id: Date.now(), topic: '', categoryLeft: 'None', categoryRight: 'None', customStyle: null, customStyleDetail: null, amount: 1, duration: 10 }];
            return prev.filter(b => b.id !== id);
        });
        setMagicSuggestions(prev => prev.map(s => s.addedId === id ? { ...s, addedId: null } : s));
    };
    
    const updateBuilder = (id, field, value) => {
        setPromptBuilders(prev => prev.map(b => {
            if (b.id !== id) return b;
            let updated = { ...b, [field]: value };
            if (field === 'categoryLeft' && value !== 'None') updated.categoryRight = 'None';
            if (field === 'categoryRight' && value !== 'None') updated.categoryLeft = 'None';
            return updated;
        }));
        if (field === 'topic') setMagicSuggestions(prev => prev.map(s => s.addedId === id ? { ...s, addedId: null } : s));
    };

    const handleGeneratePrompts = async () => {
        for (const builder of promptBuilders) {
            if (builder.categoryLeft === 'None' && builder.categoryRight === 'None' && !builder.topic.trim()) {
                setGlobalMessage({ title: "Perhatian", type: "warning", text: "Topik WAJIB diisi jika kedua kategori None!" });
                return;
            }
        }
        setIsGeneratingPrompts(true);
        try {
            let newBlueprints = [...blueprints];
            for (const builder of promptBuilders) {
                const totalAmount = parseInt(builder.amount) || 1;
                const batchSize = 5;
                let remaining = totalAmount;

                while (remaining > 0) {
                    const currentAmount = Math.min(remaining, batchSize);
                    const randomSeed = Math.floor(Math.random() * 1000000);
                    const creativityBooster = `\n\nCRITICAL RULE UNTUK VARIASI: Karena Anda diminta membuat ${currentAmount} blueprint sekaligus, posisikan diri Anda sebagai ${currentAmount} Art Director berbeda. Pastikan setiap blueprint memiliki interpretasi visual, metafora, dan komposisi yang BERBEDA DRASTIS satu sama lain. Bebaskan imajinasi seliar mungkin selama tetap mematuhi Gaya Visual yang diminta!`;
                    const baseInstruction = `Buatkan TEPAT ${currentAmount} prompt instruksi animasi. Topik: "${builder.topic || 'Random'}". Durasi target: ${builder.duration} detik. WAJIB tuliskan instruksi dan warna dalam Bahasa Indonesia.
ATURAN WARNA MUTLAK (DESAIN PROFESIONAL): Wajib gunakan prinsip 60-30-10 (60% warna dominan/background, 30% sekunder, 10% aksen sangat kontras sesuai standar visibilitas WCAG).
FOKUS UTAMA: Output HARUS dalam format JSON murni dengan struktur array "blueprints". Jangan berikan deskripsi nilai jual. Susun secara vertikal:
{ "blueprints": [ { "topic": "Topik Singkat", "visual": "Ringkasan Visual", "scene": "Bagi total durasi (WAJIB sesuai ${builder.duration} detik, JANGAN patokan ke 10 detik) menjadi 3 babak proporsional, sertakan buffer transisi 0.2-0.4 detik di tiap pergantian babak agar mengalir mulus, contoh format: '0-Xs: aksi, X-Ys: aksi, Y-Zs: aksi'", "colors": "Detailkan Proporsi 60-30-10 (Dominan, Sekunder, Aksen)", "background": "Warna dominan 60%..." } ] }`;
                    const activeCategory = builder.categoryRight !== 'None' ? builder.categoryRight : builder.categoryLeft;

                    let styleDetailStr = "";
                    if (activeCategory === builder.categoryRight && builder.customStyleDetail) styleDetailStr = builder.customStyleDetail;
                    else styleDetailStr = BUILTIN_STYLE_DETAILS[activeCategory] || "Sesuaikan instruksi, warna, dan pergerakan agar mencerminkan gaya ini.";
                    const finalStyleString = `${activeCategory} - ${styleDetailStr}`;

                    const systemPrompt = `[SEED: ${randomSeed}] ${baseInstruction}\nGAYA VISUAL WAJIB: ${finalStyleString}${creativityBooster}`;
                    const payload = { contents: [{ parts: [{ text: systemPrompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.9 } };
                    const parsedData = await callGeminiViaGateway(payload);
                    const text = parsedData.candidates[0].content.parts[0].text;
                    const parsed = JSON.parse(text);
                    
                    if (parsed.blueprints) {
                        const cardsWithData = parsed.blueprints.map(bp => ({ ...bp, id: Date.now() + R().toString(36).substr(2, 5), duration: builder.duration, style: finalStyleString }));
                        newBlueprints = [...newBlueprints, ...cardsWithData];
                        setBlueprints(newBlueprints);
                    }
                    remaining -= currentAmount;
                }
            }
        } catch (err) { 
            setGlobalMessage({ title: "Error Sistem", type: "error", text: "Gagal meracik blueprint: " + err.message });
        } finally { setIsGeneratingPrompts(false); }
    };

    // --- UPLOAD FILE & RENDER ---
    const handleMediaUpload = async (e) => {
        let files = [];
        if (e.target.files && e.target.files.length > 0) files = Array.from(e.target.files);
        else if (e.dataTransfer && e.dataTransfer.files.length > 0) files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        const newFilesData = [];
        for (const file of files) {
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target.result);
                reader.readAsDataURL(file);
            });
            newFilesData.push({ id: Date.now() + Math.random(), name: file.name, type: file.type, base64, url: URL.createObjectURL(file) });
        }
        setUploadedFilesData(prev => [...prev, ...newFilesData]);
        if (e.target) e.target.value = '';
    };

    const handleRenderUpload = async (e) => {
        let files = [];
        if (e.target.files && e.target.files.length > 0) files = Array.from(e.target.files);
        else if (e.dataTransfer && e.dataTransfer.files.length > 0) files = Array.from(e.dataTransfer.files);
        const txtFiles = files.filter(f => f.type === 'text/plain' || f.name.endsWith('.txt'));
        if (txtFiles.length === 0) return;

        // IMPORT LOGIC: TXT BASE64 (OPFS CACHE MATCHING)
        if (renderImportType === 'base64') {
            const updatedCards = [...cardsRef.current];
            let matchedCount = 0;
            
            for (const file of txtFiles) {
                let content = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsText(file);
                });
                
                let cleanB64 = content.trim();
                if (!cleanB64.startsWith('data:video/mp4;base64,')) {
                    cleanB64 = 'data:video/mp4;base64,' + cleanB64.replace(/^data:.*base64,/, '');
                }

                const baseName = file.name.replace(/_B64\.txt$/i, '').replace(/\.txt$/i, '');
                const cardIdx = updatedCards.findIndex(c => c.mode === 'render' && c.title === baseName);
                if (cardIdx !== -1) {
                    try {
                        const b64Data = cleanB64.replace(/^data:video\/mp4;base64,/, '');
                        const vidResponse = await fetch(`data:video/mp4;base64,${b64Data}`);
                        const videoBlob = await vidResponse.blob();

                        const targetId = updatedCards[cardIdx].id;
                        await saveToOpfs('mp4', targetId, videoBlob);
                        await saveToOpfs('base64', targetId, b64Data);

                        updatedCards[cardIdx] = {
                            ...updatedCards[cardIdx],
                            status: 'done',
                            hasFile: true,
                            error: null,
                            renderProgress: null
                        };
                        matchedCount++;
                    } catch(e) {
                        console.error("Base64 import error", e);
                    }
                }
            }
            setCards(updatedCards);
            if (matchedCount > 0) setGlobalMessage({ title: "Impor Caching Berhasil", type: "success", text: `${matchedCount} file Base64 berhasil disuntikkan ke dalam kartu!` });
            else setGlobalMessage({ title: "Tidak Ada Kecocokan", type: "warning", text: "Tidak ada nama kartu di layar yang cocok dengan nama file Base64 yang diunggah." });
            
            if (e.target) e.target.value = '';
            return;
        }

        // IMPORT LOGIC: TXT KODE JS (LANGSUNG JADI KARTU DI KANAN)
        const newFiles = await Promise.all(txtFiles.map(async (file) => {
            let content = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target.result);
                reader.readAsText(file);
            });

            let width = 1920, height = 1080, dur = 10, ratioStr = '16:9';
            const metaMatch = content.match(/\/\/\s*\[META\]\s*RES:(\d+x\d+)\s*DUR:(\d+)/i);
            if (metaMatch) {
                const resParts = metaMatch[1].toLowerCase().split('x');
                width = parseInt(resParts[0]); height = parseInt(resParts[1]); dur = parseInt(metaMatch[2]);
            } else {
                const vbMatch = content.match(/viewBox["']?\s*,\s*["']0\s+0\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)["']/i);
                if(vbMatch) { width = parseFloat(vbMatch[1]); height = parseFloat(vbMatch[2]); }
                const durMatch = content.match(/duration\s*=\s*(\d+(?:\.\d+)?)/i);
                if(durMatch) dur = parseFloat(durMatch[1]);
            }

            let aspect = width / height;
            if (aspect > 1.3) ratioStr = '16:9'; else if (aspect < 0.75) ratioStr = '9:16'; else ratioStr = '1:1';
            const finalResString = `${width}x${height}`;
            const jsMatch = content.match(/```(?:javascript|js)?\s*([\s\S]*?)```/i);
            if (jsMatch) content = jsMatch[1].trim();

            const baseName = file.name.replace(/\.txt$/i, '').replace(/_B64$/i, '');

            return { 
                id: Date.now() + Math.random(), 
                title: baseName, 
                code: content, 
                status: 'pending', 
                error: null, 
                ratio: ratioStr, 
                resolution: finalResString, 
                duration: dur, 
                mode: 'render', 
                hasFile: false, 
                renderProgress: null 
            };
        }));

        setCards(prev => [...newFiles, ...prev]);
        if(currentPage !== 1) setCurrentPage(1); 
        if (e.target) e.target.value = '';
    };

    const handleDragOver = (e) => { e.preventDefault(); };
    const handleDropFile = (e) => { e.preventDefault(); handleMediaUpload(e); };
    const handleDropRender = (e) => { e.preventDefault(); handleRenderUpload(e); };

    // --- GENERATION CALLS (AI & HF) ---
    const callAI = async (task, signal) => {
        let finalPrompt = "";
        let finalNegative = negativePrompt.trim();

        if (task.mode === 'text') finalPrompt = `Konsep Utama: ${task.basePrompt.topic}\nGaya Visual WAJIB: ${task.basePrompt.style || 'Bebas'}\nRingkasan: ${task.basePrompt.visual}\nStruktur Scene: ${task.basePrompt.scene}\nWarna: ${task.basePrompt.colors}\nBackground: ${task.basePrompt.background}`;
        else finalPrompt = task.basePrompt; 

        if (instructions.trim()) finalPrompt = `${instructions}. ${finalPrompt}`;
        if (finalNegative) finalPrompt += `. DILARANG mengandung: ${finalNegative}`;

        const isLineDrawing = finalPrompt.toLowerCase().includes("line drawing") || finalPrompt.toLowerCase().includes("line-drawing");
        const isSequential = finalPrompt.toLowerCase().includes("sequential") || finalPrompt.toLowerCase().includes("phase 1");
        
        let dynamicSystemLayer3 = SYSTEM_LAYER_3;
        if (task.media) dynamicSystemLayer3 += `\n- ATURAN TRACING GAMBAR (MUTLAK): JIPLAK gambar referensi jadi elemen SVG murni menggunakan JS create(). ANIMASIKAN hasil jiplakan tersebut di update() menjadi motion graphic.\n- EKSTRAKSI WARNA BACKGROUND (WAJIB): Gunakan warna dominan gambar referensi sebagai background solid bersih, JANGAN jiplak background asli secara literal jika kompleks atau berisi noise.\n- DETEKSI TEKS (WAJIB JIKA ADA): Jika ada teks di gambar referensi, rekonstruksi ulang menggunakan elemen <text> SVG, JANGAN pernah dijiplak sebagai path vektor agar teks tetap rapi dan terbaca.\n- FOKUS OBJEK UTAMA (WAJIB): Jiplak & animasikan HANYA subjek/objek utama, abaikan dan buang elemen latar yang tidak relevan (seperti foto asli, watermark, atau tekstur pengganggu).`;
        if (isLineDrawing) dynamicSystemLayer3 += `\n- Aturan Line Drawing: Gunakan pathLength="100" dan animasikan atribut stroke-dashoffset di fungsi update. DILARANG fill warna.`;
        if (isSequential) dynamicSystemLayer3 += `\n- Aturan Berantai: Gunakan matematika percabangan pada waktu \`t\` untuk membagi gerakan elemen (misal: if t < 3 { animasi A } else { animasi B }). Gerakan tidak serentak.`;

        const systemInstruction = `Anda adalah Arsitek Motion JS tingkat dewa. Tugas Anda adalah membuat kode JavaScript murni sesuai permintaan.\n\n${SYSTEM_LAYER_1}\n\n${SYSTEM_LAYER_2}\n\n${dynamicSystemLayer3}\n\n${SYSTEM_LAYER_4}\n\n${SYSTEM_LAYER_5}\n\n${SYSTEM_LAYER_6}\n\n${SYSTEM_LAYER_7}`;

        const parts = [];
        parts.push({ text: `Buat animasi ini HANYA dengan kode JS murni (DURASI SIKLUS MUTLAK HARUS ${task.duration} DETIK. JANGAN GUNAKAN 10 DETIK JIKA SAYA MINTA ${task.duration} DETIK! Rancang desain viewBox proporsional untuk rasio ${task.ratio || '16:9'} dengan resolusi tepat ${task.resolution.toLowerCase()}): ${finalPrompt}` });

        if (task.media && task.media.base64) {
            const base64Data = task.media.base64.split(',')[1];
            parts.push({ inlineData: { data: base64Data, mimeType: task.media.type } });
        }

        const payload = { contents: [{ parts: parts }], systemInstruction: { parts: [{ text: systemInstruction }] } };
        const result = await callGeminiViaGateway(payload, signal);
        
        let resultText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!resultText) throw new Error("Gagal mengambil kode dari API.");
        
        let cleanCode = resultText.trim();
        const codeMatch = resultText.match(/```(?:javascript|js)?\s*([\s\S]*?)```/i);
        if (codeMatch) cleanCode = codeMatch[1].trim();
        
        if (!cleanCode.includes('function create') || !cleanCode.includes('function update')) throw new Error("AI tidak mengembalikan struktur fungsi create dan update yang valid.");
        return cleanCode;
    };

    const handleReviseCode = async () => {
        if (!editChatInput.trim() || !editCode) return;
        setIsRevising(true);
        try {
            const systemInstruction = `Anda adalah Arsitek Motion JS tingkat dewa. Modifikasi kode JavaScript ini persis sesuai instruksi user.\n\n${SYSTEM_LAYER_1}\n\nPertahankan durasi infinite loop t = time % DURATION kecuali diminta diubah.`;
            const payload = { contents: [{ parts: [{ text: `Berikut adalah kodenya:\n\n${editCode}\n\nInstruksi perbaikan: ${editChatInput}` }]}], systemInstruction: { parts: [{ text: systemInstruction }] } };
            const result = await callGeminiViaGateway(payload);
            
            let resultText = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!resultText) throw new Error("Gagal mengambil revisi kode dari API.");
            
            let cleanCode = resultText.trim();
            const codeMatch = resultText.match(/```(?:javascript|js)?\s*([\s\S]*?)```/i);
            if (codeMatch) cleanCode = codeMatch[1].trim();
            
            setEditCode(cleanCode); setEditChatInput('');
            const newHistory = [...editHistory.slice(0, editHistoryIndex + 1), cleanCode];
            setEditHistory(newHistory); setEditHistoryIndex(newHistory.length - 1);
        } catch (err) { setGlobalMessage({ title: "Error Revisi", type: "error", text: "Gagal revisi: " + err.message }); } finally { setIsRevising(false); }
    };

    const handleSettingsChange = (type, value, oldMatch = null) => {
        let newCode = editCode;
        const editCard = cards.find(c => c.id === editCardId);
        
        if (type === 'color') {
            const regex = new RegExp(value.old, 'gi');
            newCode = newCode.replace(regex, value.new);
        } else if (type === 'text') {
            if (oldMatch) {
                if (oldMatch.quote === '>') {
                    // Replace teks di dalam tag XML/SVG
                    const newTag = oldMatch.full.replace(new RegExp(`>\\s*${oldMatch.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*<`), `>${value}<`);
                    newCode = newCode.replace(oldMatch.full, newTag);
                } else {
                    // Replace teks di properti JS biasa (mendukung backticks `` ` ``)
                    newCode = newCode.replace(oldMatch.full, `.${oldMatch.prop} = ${oldMatch.quote}${value}${oldMatch.quote}`);
                }
            }
        } else if (type === 'thumb') {
            // Logika baru untuk mengubah meta-tag THUMB
            if (/\/\/\s*\[META\].*THUMB:/i.test(newCode)) {
                newCode = newCode.replace(/THUMB:(\d+(?:\.\d+)?)/i, `THUMB:${value}`);
            } else if (/\/\/\s*\[META\]/i.test(newCode)) {
                newCode = newCode.replace(/\/\/\s*\[META\](.*)/i, `// [META]$1 THUMB:${value}`);
            }
        } else {
            // Logika untuk rasio, resolusi, dan durasi tetap utuh
            let currentRes = editCard?.resolution || '1920x1080';
            let currentDur = editCard?.duration || 10;
            let currentRatio = editRatio;
            
            if (type === 'ratio') {
                currentRatio = value;
                currentRes = DIMENSIONS[value]['1080']; 
                setEditRatio(value);
            }
            if (type === 'resolution') currentRes = value;
            if (type === 'duration') currentDur = value;

            if (/\/\/\s*\[META\]\s*RES:(\d+x\d+)\s*DUR:(\d+)/i.test(newCode)) {
                // Pertahankan properti THUMB jika sebelumnya ada
                const oldThumbMatch = newCode.match(/THUMB:(\d+(?:\.\d+)?)/i);
                const thumbString = oldThumbMatch ? ` THUMB:${oldThumbMatch[1]}` : '';
                newCode = newCode.replace(/\/\/\s*\[META\].*/i, `// [META] RES:${currentRes} DUR:${currentDur}${thumbString}`);
            } else {
                newCode = `// [META] RES:${currentRes} DUR:${currentDur}\n` + newCode;
            }
            setCards(prev => prev.map(c => c.id === editCardId ? { ...c, resolution: currentRes, duration: currentDur, ratio: currentRatio } : c));
        }

        setEditCode(newCode);
        const newHistory = [...editHistory.slice(0, editHistoryIndex + 1), newCode];
        setEditHistory(newHistory);
        setEditHistoryIndex(newHistory.length - 1);
    };

    const startGeneration = async (isResume = false) => {
        if (isGeneratingRef.current) return;
        let newTasks = [];
        if (!isResume) {
            if (inputMode === 'text') {
                if (blueprints.length === 0) return;
                const qty = parseInt(blueprintQuantity) || 1;
                blueprints.forEach(bp => {
                    for(let i=0; i<qty; i++) {
                        newTasks.push({ id: R().toString(36).substr(2, 9), title: bp.topic, basePrompt: bp, code: '', status: 'pending', error: null, ratio: selectedRatio, resolution: DIMENSIONS[selectedRatio][selectedResolution].toLowerCase(), duration: bp.duration || selectedDuration, mode: 'text' });
                    }
                });
            } else if (inputMode === 'file') {
                if (uploadedFilesData.length === 0) return;
                const qty = parseInt(fileQuantity) || 1;
                uploadedFilesData.forEach((file) => {
                    for(let i = 0; i < qty; i++) {
                        newTasks.push({ id: R().toString(36).substr(2, 9), title: `Trace: ${file.name.substring(0,12)}...`, basePrompt: 'Jiplay, rekonstruksi, dan animasikan gambar referensi ini secara presisi tanpa bantuan teks.', code: '', status: 'pending', error: null, ratio: selectedRatio, resolution: DIMENSIONS[selectedRatio][selectedResolution].toLowerCase(), duration: selectedDuration, media: file, mode: 'file' });
                    }
                });
            } 
            const updatedOldCards = cardsRef.current.map(f => f.status === 'failed' && f.mode !== 'render' ? { ...f, status: 'pending', error: null } : f);
            const nextCards = [...newTasks, ...updatedOldCards];
            setCards(nextCards); cardsRef.current = nextCards; setCurrentPage(1); 
        }

        isGeneratingRef.current = true; setIsGenerating(true); setIsPaused(false); isPausedRef.current = false;
        setActiveProcessGroup('generate');
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;
        
        const runWorkers = async () => {
            const requestedWorkers = parseInt(workerCount) || 5;
            const filesToProcess = cardsRef.current.filter(f => f.status === 'pending' && f.mode !== 'render').length;
            const concurrency = Math.max(1, Math.min(requestedWorkers, filesToProcess));
            const delayMs = (parseInt(workerDelay) || 0) * 1000;
            const workers = [];

            for (let workerId = 0; workerId < concurrency; workerId++) {
                workers.push((async () => {
                    if (workerId > 0 && delayMs > 0 && !isPausedRef.current) await new Promise(r => setTimeout(r, delayMs * workerId));
                    while (!isPausedRef.current) {
                        let taskToProcess = null;
                        for (let j = 0; j < cardsRef.current.length; j++) {
                            if (cardsRef.current[j].status === 'pending' && cardsRef.current[j].mode !== 'render') {
                                taskToProcess = cardsRef.current[j];
                                cardsRef.current[j] = { ...taskToProcess, status: 'processing', error: null };
                                break; 
                            }
                        }
                        if (!taskToProcess) break; 
                        
                        setCards(prev => prev.map(f => f.id === taskToProcess.id ? { ...f, status: 'processing', error: null } : f));
                        try {
                            const generatedCode = await callAI(taskToProcess, signal);
                            const finalCodeWithMeta = `// [META] RES:${taskToProcess.resolution} DUR:${taskToProcess.duration}\n${generatedCode}`;
                            setCards(prev => prev.map(f => f.id === taskToProcess.id ? { ...f, status: 'done', code: finalCodeWithMeta } : f));
                        } catch (error) {
                            if (error.name === 'AbortError') setCards(prev => prev.map(f => f.id === taskToProcess.id ? { ...f, status: 'pending' } : f));
                            else setCards(prev => prev.map(f => f.id === taskToProcess.id ? { ...f, status: 'failed', error: error.message } : f));
                        }
                        if (delayMs > 0 && !isPausedRef.current) await new Promise(r => setTimeout(r, delayMs));
                    }
                })());
            }
            await Promise.all(workers);
        };

        while (!isPausedRef.current) {
            await runWorkers();
            await new Promise(r => {
                const check = setInterval(() => {
                    if (!cardsRef.current.some(f => f.status === 'processing') || cardsRef.current.some(f => f.status === 'pending' && f.mode !== 'render')) { clearInterval(check); r(); } 
                }, 500);
            });
            if (!cardsRef.current.some(f => f.status === 'pending' && f.mode !== 'render')) break; 
        }
        
        if (!isPausedRef.current) { setIsGenerating(false); isGeneratingRef.current = false; setActiveProcessGroup(null); }
    };

    const startRenderAction = async (isResume = false) => {
        if (isGeneratingRef.current) return;
        if (HUGGING_FACE_URLS.length === 0 || HUGGING_FACE_URLS[0] === "URL_HUGGING_FACE_ANDA_DISINI") {
             setGlobalMessage({ title: "URL Belum Disetting", type: "error", text: "Silakan masukkan URL Hugging Face di dalam kode App.jsx." });
             return;
        }

        if (!isResume) {
            const updatedOldCards = cardsRef.current.map(f => f.status === 'failed' && f.mode === 'render' ? { ...f, status: 'pending', error: null, hasFile: false, renderProgress: null } : f);
            setCards(updatedOldCards); cardsRef.current = updatedOldCards; 
            if(currentPage !== 1) setCurrentPage(1); 
        }

        isGeneratingRef.current = true; setIsGenerating(true); setIsPaused(false); isPausedRef.current = false;
        setActiveProcessGroup('render');
        
        try {
            const pendingTasksCount = cardsRef.current.filter(f => (f.status === 'pending' || (isResume && f.status === 'processing')) && f.mode === 'render').length;
            const activeWorkerCount = Math.min(pendingTasksCount, HUGGING_FACE_URLS.length);
            
            if (activeWorkerCount > 0) {
                const workers = Array.from({ length: activeWorkerCount }).map(async (_, index) => {
                    const workerUrl = HUGGING_FACE_URLS[index]; 
                    
                    while (!isPausedRef.current) {
                        let task = null;
                        for (let j = 0; j < cardsRef.current.length; j++) {
                            if ((cardsRef.current[j].status === 'pending' || (isResume && cardsRef.current[j].status === 'processing')) && cardsRef.current[j].mode === 'render') {
                                task = cardsRef.current[j];
                                cardsRef.current[j] = { ...task, status: 'processing', renderProgress: null, fps: renderFps };
                                break; 
                            }
                        }
                        if (!task) break; 
                        
                        setCards(prev => prev.map(f => f.id === task.id ? { ...f, status: 'processing', renderProgress: { frame: 0, total: task.duration * renderFps }, fps: renderFps } : f));
                        try {
                            // --- KODE BARU LOGIKA PAUSE RESUME ---
                            let jobId = task.jobId || null;
                            let activeWorkerUrl = task.workerUrl || workerUrl;

                            // TAHAP 1: START RENDER (Hanya jika belum punya Job ID)
                            if (!jobId) {
                                const randomHFId = generateRandomTaskID();
                                const startRes = await fetch(`${activeWorkerUrl.replace(/\/$/, '')}/start-render`, {
                                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
                                    body: JSON.stringify({ data: [task.code, task.resolution.toLowerCase(), task.duration, renderFps, randomHFId, renderBitrate] })
                                });
                                
                                if (!startRes.ok) throw new Error(`Start Error: ${startRes.status}`);
                                const startData = await startRes.json();
                                jobId = startData.job_id;
                                if (!jobId) throw new Error("Gagal mendapatkan job_id dari server.");
                                
                                // Simpan jobId dan worker ke state kartu agar aman walau dipause
                                setCards(prev => prev.map(c => c.id === task.id ? { ...c, jobId, workerUrl: activeWorkerUrl } : c));
                            }

                            // TAHAP 2: POLLING STATUS
                            let isDone = false;
                            let lastFrame = -1;
                            let lastProgressTime = Date.now();
                            const timeoutMs = 180000; 
                            let consecutiveMisses = 0;

                            while (!isDone && !isPausedRef.current) {
                                await new Promise(r => setTimeout(r, 3000)); 
                                
                                let statusData = null;
                                try {
                                    const statusRes = await fetch(`${activeWorkerUrl.replace(/\/$/, '')}/status/${jobId}`, { headers: { 'Bypass-Tunnel-Reminder': 'true' } });
                                    if (!statusRes.ok) {
                                        consecutiveMisses++;
                                        if (consecutiveMisses > 20) throw new Error("Job hilang dari server.");
                                        continue;
                                    }
                                    consecutiveMisses = 0;
                                    statusData = await statusRes.json();
                                } catch (fetchErr) {
                                    continue; 
                                }

                                if (statusData.status === 'failed' || statusData.status === 'cancelled') {
                                    throw new Error(statusData.error || `Render server ${statusData.status}`);
                                }
                                if (statusData.status === 'done') {
                                    isDone = true;
                                    break;
                                }
                                if (statusData.progress) {
                                    const { frame, total } = statusData.progress;
                                    setCards(prev => prev.map(f => f.id === task.id ? { ...f, renderProgress: { frame, total } } : f));
                                    if (frame > lastFrame) {
                                        lastFrame = frame;
                                        lastProgressTime = Date.now();
                                    } else if (Date.now() - lastProgressTime > timeoutMs) {
                                        throw new Error("Timeout: Render macet lebih dari 3 menit.");
                                    }
                                } else if (Date.now() - lastProgressTime > timeoutMs) {
                                    throw new Error("Timeout: Macet di antrean lebih dari 3 menit.");
                                }
                            }

                            if (isPausedRef.current) {
                                setCards(prev => prev.map(c => c.id === task.id ? { ...c, status: 'pending', renderProgress: null } : c));
                                break;
                            }

                            // TAHAP 3: AMBIL HASIL
                            const resultRes = await fetch(`${activeWorkerUrl.replace(/\/$/, '')}/result/${jobId}`, { headers: { 'Bypass-Tunnel-Reminder': 'true' } });
                            if (!resultRes.ok) throw new Error(`Result Error: ${resultRes.status}`);
                            const resultData = await resultRes.json();
                            
                            let base64String = null;
                            if (resultData && resultData.data && resultData.data[0]) base64String = resultData.data[0];

                            if (base64String) {
                                const b64Data = base64String.replace(/^data:video\/mp4;base64,/, '');
                                const vidResponse = await fetch(`data:video/mp4;base64,${b64Data}`);
                                const videoBlob = await vidResponse.blob();
                                
                                await saveToOpfs('mp4', task.id, videoBlob);
                                if (renderExportType === 'base64') {
                                    await saveToOpfs('base64', task.id, b64Data);
                                }
                                setCards(prev => prev.map(c => c.id === task.id ? { ...c, status: 'done', hasFile: true, renderProgress: null } : c));
                            } else { 
                                throw new Error("Format balasan Base64 kosong dari server."); 
                            }

                        } catch (error) { 
                            // Jika error total, hapus jobId agar mulai merender ulang dari 0 saat di-resume
                            setCards(prev => prev.map(f => f.id === task.id ? { ...f, status: 'failed', error: error.message, renderProgress: null, jobId: null } : f)); 
                        }
                    }
                });

                await Promise.all(workers);
            }
        } catch (globalErr) { 
            setGlobalMessage({ title: "Error Modul", type: "error", text: "Proses worker utama terhenti." }); 
        }
        
        if (!isPausedRef.current) { setIsGenerating(false); isGeneratingRef.current = false; setActiveProcessGroup(null); }
    };

    const handleStartAction = (isResume = false) => {
        if (inputMode === 'render') startRenderAction(isResume); else startGeneration(isResume);
    };

    const handlePauseResume = () => {
        if ((isGenerating || countProcessing > 0) && !isPaused) { 
            setIsPaused(true); isPausedRef.current = true; setIsGenerating(false); isGeneratingRef.current = false;
            setCards(prev => prev.map(c => c.status === 'processing' ? { ...c, status: 'pending' } : c));
        } else if (isPaused || (!isGenerating && countPending > 0)) { handleStartAction(true); }
    };

    const confirmClearAllAction = async () => {
        setIsPaused(false); isPausedRef.current = false; setIsGenerating(false); isGeneratingRef.current = false;
        setActiveProcessGroup(null);
        if (abortControllerRef.current) abortControllerRef.current.abort();
        
        const toDelete = cards.filter(c => inputMode === 'render' ? c.mode === 'render' : c.mode !== 'render');
        if (inputMode === 'render') {
            await Promise.all(toDelete.flatMap(c => [deleteFromOpfs('mp4', c.id), deleteFromOpfs('base64', c.id)]));
        } else {
            await clearCardsFromDB();
        }
        
        setCards(prev => prev.filter(c => inputMode === 'render' ? c.mode !== 'render' : c.mode === 'render')); 
        setClearAllConfirm(false); setCurrentPage(1); 
    };

    // GENERATOR OPFS SEQUENTIAL STREAMING
    async function* opfsEntryGenerator(kind, cardList, currentInputMode, onProgress) {
        let done = 0;
        for (const card of cardList) {
            try {
                let file;
                try {
                    file = await getFromOpfs(kind, card.id);
                } catch {
                    if (kind === 'base64') {
                        const mp4File = await getFromOpfs('mp4', card.id);
                        const b64 = await fileToBase64(mp4File);
                        await saveToOpfs('base64', card.id, b64);
                        file = await getFromOpfs('base64', card.id);
                    } else {
                        throw new Error('File MP4 tidak ditemukan di OPFS');
                    }
                }
                const ext = kind === 'mp4' ? 'mp4' : 'txt';
                const suffix = currentInputMode === 'render' ? (kind === 'base64' ? '_B64' : '') : `-${generateRandomSuffix()}`;
                yield { name: `${card.title}${suffix}.${ext}`, input: file };
            } catch (err) {
                console.warn(`Skip ${card.title}: file OPFS hilang`, err);
            } finally {
                done++;
                onProgress(done, cardList.length);
            }
        }
    }

    const handleDownloadZipStreamed = async () => {
        const doneCards = activeCards.filter(f => f.status === 'done' && (inputMode === 'render' ? f.hasFile : true));
        if (doneCards.length === 0) return;

        setIsZipping(true);
        setZipProgress({ done: 0, total: doneCards.length });

        try {
            if (inputMode !== 'render') {
                const JSZip = (await import('https://esm.sh/jszip')).default;
                const zip = new JSZip();
                for (let i = 0; i < doneCards.length; i++) {
                    const card = doneCards[i];
                    const suffix = `-${generateRandomSuffix()}`;
                    zip.file(`${card.title}${suffix}.txt`, card.code);
                }
                const content = await zip.generateAsync({ type: 'blob' });
                const zipUrl = URL.createObjectURL(content);
                const link = document.createElement('a');
                link.href = zipUrl; link.download = `${zipFilename.trim() || 'AMATI-Motion-Kode'}.zip`;
                document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(zipUrl);
            } else {
                const kind = renderExportType;
                const { downloadZip } = await import('https://esm.sh/client-zip');
                const defaultName = kind === 'mp4' ? 'AMATI-Motion-Video' : 'AMATI-Cache-Base64';
                const suggestedName = `${zipFilename.trim() || defaultName}.zip`;

                if ('showSaveFilePicker' in window) {
                    try {
                        const handle = await window.showSaveFilePicker({
                            suggestedName,
                            types: [{ description: 'ZIP Archive', accept: { 'application/zip': ['.zip'] } }]
                        });
                        const writable = await handle.createWritable();
                        const entries = opfsEntryGenerator(kind, doneCards, inputMode, (d, t) => setZipProgress({ done: d, total: t }));
                        await downloadZip(entries).body.pipeTo(writable);
                    } catch (pickerErr) {
                        if (pickerErr.name !== 'AbortError') throw pickerErr;
                    }
                } else {
                    const entries = opfsEntryGenerator(kind, doneCards, inputMode, (d, t) => setZipProgress({ done: d, total: t }));
                    const blob = await downloadZip(entries).blob();
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url; link.download = suggestedName;
                    document.body.appendChild(link); link.click(); document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('ZIP Export Error:', err); 
                setGlobalMessage({ 
                    title: "Error Sistem", 
                    type: "error", 
                    text: `Gagal mengemas file ZIP: ${err.message || err.name || 'Unknown error'}` 
                });
            }
        } finally {
            setIsZipping(false);
            setZipProgress(null);
        }
    };

    const handleDownloadSingleMP4 = async (cardData) => {
        if(!cardData.hasFile) return;
        try {
            const file = await getFromOpfs('mp4', cardData.id);
            const url = URL.createObjectURL(file);
            const link = document.createElement('a');
            link.href = url; link.download = `${cardData.title}.mp4`; 
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch(e) {
            setGlobalMessage({ title: "Error Ekspor", type: "error", text: "Gagal membaca file dari penyimpanan lokal." });
        }
    };

    const handleEditCodeChange = (e) => {
        const newCode = e.target.value;
        setEditCode(newCode);
        const newHistory = [...editHistory.slice(0, editHistoryIndex + 1)];
        newHistory[editHistoryIndex] = newCode;
        setEditHistory(newHistory);
    };

    const handleCopyText = (text) => {
        if (!text) return;
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try { document.execCommand('copy'); } catch (err) {}
        document.body.removeChild(textArea);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const CustomColorWheel = ({ color, onChange }) => {
        return (
            <div className="flex flex-col items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg shadow-sm hover:border-[#0891B3]/50 transition-colors">
                <div 
                    className="w-16 h-16 rounded-full relative cursor-crosshair shadow-inner border border-slate-300"
                    style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left - rect.width / 2;
                        const y = e.clientY - rect.top - rect.height / 2;
                        let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
                        if (angle < 0) angle += 360;
                        onChange(hslToHex(angle, 100, 50)); 
                    }}
                >
                    <div className="absolute inset-3 rounded-full border-2 border-white shadow-md pointer-events-none" style={{ backgroundColor: color }}></div>
                </div>
                <span className="text-[9px] font-mono font-bold text-slate-600 uppercase">{color}</span>
            </div>
        );
    };

    const totalPages = Math.ceil(activeCards.length / itemsPerPage);
    const paginatedCards = activeCards.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (!isAuthenticated) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-slate-100 overflow-hidden" style={{ fontFamily: "'Share Tech', sans-serif", backgroundImage: 'linear-gradient(rgba(8, 145, 179, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(8, 145, 179, 0.08) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                
                {/* TAMBAHKAN STYLE INI AGAR ANIMASI BISA JALAN DI HALAMAN LOGIN */}
                <style>{`
                    .dot-anim::after { content: ''; animation: dots 1.5s steps(4, end) infinite; }
                    @keyframes dots { 0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75% { content: '...'; } 100% { content: ''; } }
                `}</style>

                {/* GLOBAL TOAST NOTIFICATION LOGIN */}
                <div className={`fixed top-4 right-4 z-[9999] transition-all duration-500 transform ${toast.show ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
                    <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 border ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                        {toast.type === 'error' ? <AlertTriangleIcon className="w-5 h-5"/> : <CheckCircleIcon className="w-5 h-5"/>}
                        <span className="font-bold text-sm tracking-wide">{toast.message}</span>
                    </div>
                </div>

                <div className={`flex flex-col items-center justify-center w-full max-w-sm px-4 z-10 transition-all duration-500 ${loginState === 'success' ? 'opacity-0 scale-110' : 'opacity-100 scale-100'}`}>
                    <div className="w-full bg-white p-6 rounded-lg border border-[#0891B3]/30 shadow-md flex flex-col gap-4 relative z-10">
                        <div className="text-center mb-2">
                            <h1 className="text-2xl font-bold text-[#0891B3] tracking-widest">AMATI LOGIN</h1>
                        </div>
                        <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} className="w-full p-3 rounded-lg bg-white border border-slate-300 text-slate-800 font-bold text-center outline-none transition-all h-12 focus:ring-2 focus:ring-[#0891B3] focus:border-[#0891B3] disabled:opacity-50 disabled:bg-slate-100" placeholder="MASUKKAN EMAIL" disabled={loginState === 'loading' || loginState === 'success'} />
                        <button onClick={handleLogin} disabled={loginState === 'loading' || loginState === 'success'} className="bg-[#0891B3] hover:bg-[#06738F] text-white p-3 text-base font-bold rounded-lg cursor-pointer shadow-sm transition disabled:opacity-50">
                            {loginState === 'loading' ? <>MEMPROSES<span className="dot-anim inline-block w-3 text-left"></span></> : 'LOGIN'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{`
                body { font-family: 'Share Tech', sans-serif; overscroll-behavior: contain; margin: 0; padding: 0; background: #f1f5f9; }
                .custom-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .custom-scroll::-webkit-scrollbar-thumb:hover { background: #0891B3; }
                .dot-anim::after { content: ''; animation: dots 1.5s steps(4, end) infinite; }
                @keyframes dots { 0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75% { content: '...'; } 100% { content: ''; } }
            `}</style>
            
            {/* GLOBAL TOAST NOTIFICATION */}
            <div className={`fixed top-4 right-4 z-[9999] transition-all duration-500 transform ${toast.show ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
                <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 border ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                    {toast.type === 'error' ? <AlertTriangleIcon className="w-5 h-5"/> : <CheckCircleIcon className="w-5 h-5"/>}
                    <span className="font-bold text-sm tracking-wide">{toast.message}</span>
                </div>
            </div>

            <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-slate-100 text-slate-900 flex flex-col">
                <header className="bg-[#0f172a] border-b border-slate-800 sticky top-0 z-30 shadow-md h-14 flex items-center shrink-0">
                    <div className="w-full px-4 sm:px-6 flex justify-between items-center">
                        <div className="text-[28px] leading-none font-bold text-[#0891B3] tracking-widest flex items-center gap-2">AMATI</div>
                        <div className="text-right flex flex-col justify-center items-end text-slate-100">
                            <div className="text-[16px] leading-none font-bold tracking-[0.1em]">{timeString}</div>
                            <div className="text-[11px] leading-tight text-slate-400 tracking-wider mt-0.5">{dateString}</div>
                        </div>
                    </div>
                </header>

                <main className="w-full flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden relative min-h-0 bg-slate-100">
                    <aside className="w-full lg:w-[380px] bg-slate-50 lg:border-r border-slate-200 flex flex-col z-20 shrink-0 lg:h-full lg:overflow-hidden">
                        
                        <div className="flex-1 flex flex-col overflow-y-visible lg:overflow-y-auto overflow-x-hidden custom-scroll">
                            <div className="p-4 flex flex-col gap-4">

                                {/* ACTIVE USER PANEL */}
                                <div className="flex items-center justify-between p-3 bg-white border border-[#0891B3]/30 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="w-8 h-8 rounded-full bg-[#0891B3]/10 text-[#0891B3] flex items-center justify-center shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Email Aktif</span>
                                            <span className="text-xs font-bold text-slate-700 truncate pr-2">
                                                {showFullEmail ? authEmail : getMaskedEmail(authEmail)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button onClick={() => setShowFullEmail(!showFullEmail)} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-500 hover:bg-slate-200 hover:text-slate-700 rounded-md transition-colors shadow-sm shrink-0" title={showFullEmail ? "Sembunyikan Email" : "Tampilkan Email"}>
                                            <EyeIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setLogoutConfirm(true)} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-md transition-colors shadow-sm shrink-0" title="Logout">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-lg shadow-sm border border-[#0891B3]/30 flex flex-col text-left">
                                    
                                    <div className="flex items-center gap-2 mb-3 pb-1.5 border-b border-[#0891B3]/20">
                                        <h2 className="text-[14px] font-bold text-slate-700 uppercase tracking-wide">Pengaturan</h2>
                                    </div>

                                    {/* TABS SWITCHER */}
                                    <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-full h-[44px] shrink-0 border border-slate-200 mb-4">
                                        <button onClick={() => setInputMode('text')} disabled={isGenerating && !isPaused} className={`flex-1 flex items-center justify-center gap-2 py-1 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${inputMode === 'text' ? 'bg-white text-[#0891B3] shadow-sm border border-[#0891B3]/20' : 'text-slate-500 hover:bg-slate-200 border border-transparent'} ${(isGenerating && !isPaused) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                            <TypeIcon className={`w-3.5 h-3.5 ${inputMode === 'text' ? 'text-[#0891B3]' : 'text-slate-400'}`} /> <span>Text</span>
                                        </button>
                                        <button onClick={() => setInputMode('file')} disabled={isGenerating && !isPaused} className={`flex-1 flex items-center justify-center gap-2 py-1 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${inputMode === 'file' ? 'bg-white text-[#0891B3] shadow-sm border border-[#0891B3]/20' : 'text-slate-500 hover:bg-slate-200 border border-transparent'} ${(isGenerating && !isPaused) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                            <FileIcon className={`w-3.5 h-3.5 ${inputMode === 'file' ? 'text-[#0891B3]' : 'text-slate-400'}`} /> <span>File</span>
                                        </button>
                                        <button onClick={() => setInputMode('render')} disabled={isGenerating && !isPaused} className={`flex-1 flex items-center justify-center gap-2 py-1 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${inputMode === 'render' ? 'bg-white text-[#0891B3] shadow-sm border border-[#0891B3]/20' : 'text-slate-500 hover:bg-slate-200 border border-transparent'} ${(isGenerating && !isPaused) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                            <PlayIcon className={`w-3.5 h-3.5 ${inputMode === 'render' ? 'text-[#0891B3]' : 'text-slate-400'}`} /> <span>Render</span>
                                        </button>
                                    </div>

                                    {/* TAB: TEKS */}
                                    {inputMode === 'text' && (
                                        <>
                                            <div className="mb-4">
                                                <button onClick={() => setIsBuilderOpen(!isBuilderOpen)} className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-[#0891B3]/10 border border-slate-200 hover:border-[#0891B3]/30 text-slate-700 hover:text-[#0891B3] rounded transition-colors">
                                                    <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5"><SparklesIcon className="w-3 h-3" /> Buat Ide & Blueprint AI Otomatis</span>
                                                    <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${isBuilderOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                
                                                {isBuilderOpen && (
                                                    <div className="mt-2 flex flex-col gap-2">
                                                        <div className="bg-slate-50 border border-slate-200 rounded p-3 flex flex-col gap-2 shadow-sm">
                                                            <div className="flex gap-2">
                                                                <div className="flex-1">
                                                                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Ketik Tema/Keyword</label>
                                                                    <input type="text" value={magicKeyword} onChange={e => setMagicKeyword(e.target.value)} placeholder="e.g. Finance..." className={`${inputClass} !h-[28px]`} />
                                                                </div>
                                                                <div className="w-20 shrink-0">
                                                                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Jml Ide</label>
                                                                    <input type="number" min="1" value={magicCount} onChange={e => setMagicCount(e.target.value)} className={`${inputClass} !h-[28px]`} />
                                                                </div>
                                                            </div>
                                                            <button onClick={handleGenerateIdeas} disabled={isGeneratingIdeas} className="py-2 bg-[#0891B3] hover:bg-[#06738F] text-white text-[11px] font-bold uppercase tracking-wider rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-70 shadow-sm mt-1">
                                                                {isGeneratingIdeas ? <><CustomSpinner className="h-3.5 w-3.5 text-white" /> Memikirkan Ide...</> : <><SparklesIcon className="w-3 h-3" /> Buat Ide</>}
                                                            </button>
                                                        </div>

                                                        <div className="flex flex-col border border-slate-200 rounded bg-white shadow-sm overflow-hidden">
                                                            <div className="h-[120px] p-2 overflow-y-auto custom-scroll border-b border-slate-200 bg-slate-50">
                                                                {magicSuggestions.length > 0 ? (
                                                                    <div className="flex flex-col gap-1.5">
                                                                        {magicSuggestions.map((idea, idx) => (
                                                                            <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 gap-2">
                                                                                <div className="flex flex-col min-w-0 flex-1">
                                                                                    <span className="text-[10px] text-slate-800 font-medium leading-tight truncate" title={idea.text}>{idea.text}</span>
                                                                                    <span className="text-[8px] text-[#0891B3] font-bold tracking-wide uppercase truncate mt-0.5">{idea.style}</span>
                                                                                    {idea.styleDetail && <span className="text-[8px] text-slate-500 italic leading-tight mt-0.5 truncate" title={idea.styleDetail}>({idea.styleDetail})</span>}
                                                                                </div>
                                                                                <button onClick={() => handleToggleIdea(idx, idea)} className={`w-6 h-6 rounded flex items-center justify-center font-black text-sm shrink-0 transition-colors ${idea.addedId ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm' : 'bg-[#0891B3]/10 text-[#0891B3] hover:bg-[#0891B3]/20 shadow-sm'}`}>
                                                                                    {idea.addedId ? '-' : '+'}
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                                                        <SparklesIcon className="w-5 h-5 mb-1 opacity-50" />
                                                                        <span className="text-[10px] font-medium">Ide AI akan muncul di sini...</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="h-[120px] p-2 overflow-y-auto custom-scroll flex flex-col gap-2 bg-white">
                                                                {promptBuilders.map((builder) => (
                                                                    <div key={builder.id} className="relative p-2 bg-slate-50 border border-slate-200 rounded shrink-0 flex flex-col gap-1.5">
                                                                        {promptBuilders.length > 1 && (
                                                                            <button onClick={() => removeBuilder(builder.id)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-0.5 hover:bg-red-200 z-10 shadow-sm"><XCircleIcon className="w-4 h-4" /></button>
                                                                        )}
                                                                        <div className="flex gap-2 w-full">
                                                                            <div className="flex-1">
                                                                                <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Topik / Konsep</label>
                                                                                <input type="text" value={builder.topic} onChange={e => updateBuilder(builder.id, 'topic', e.target.value)} placeholder="Misal: Roket..." className={`${inputClass} !h-[24px] !text-[10px]`} />
                                                                            </div>
                                                                            <div className="w-[45px] shrink-0">
                                                                             <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Dur</label>
                                                                                <select value={builder.duration} onChange={e => updateBuilder(builder.id, 'duration', parseInt(e.target.value))} className={`${inputClass} !h-[24px] !text-[10px] !px-1`}>
                                                                                    {DURATIONS.map(d => <option key={d} value={d}>{d}s</option>)}
                                                                                </select>
                                                                            </div>
                                                                            <div className="w-[45px] shrink-0">
                                                                                <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Jml</label>
                                                                                <input type="number" min="1" max="20" value={builder.amount} onChange={e => updateBuilder(builder.id, 'amount', e.target.value)} className={`${inputClass} !h-[24px] !text-[10px] !px-1`} />
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex gap-2 w-full">
                                                                            <div className="flex-1 min-w-0">
                                                                                <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase truncate">Kategori (Bawaan)</label>
                                                                                <select value={builder.categoryLeft} onChange={e => updateBuilder(builder.id, 'categoryLeft', e.target.value)} disabled={builder.categoryRight !== 'None'} className={`${inputClass} !h-[24px] !text-[9px] !px-1 truncate bg-white w-full ${builder.categoryRight !== 'None' ? 'opacity-40' : ''}`}>
                                                                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                                                </select>
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase truncate">Kategori (Hasil Ide)</label>
                                                                                <select value={builder.categoryRight} onChange={e => updateBuilder(builder.id, 'categoryRight', e.target.value)} disabled={builder.categoryLeft !== 'None'} className={`${inputClass} !h-[24px] !text-[9px] !px-1 truncate bg-amber-50 border-amber-200 text-amber-900 w-full ${builder.categoryLeft !== 'None' ? 'opacity-40' : ''}`}>
                                                                                    <option value="None">None</option>
                                                                                    {builder.customStyle && <option value={builder.customStyle}>{builder.customStyle}</option>}
                                                                                </select>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="bg-slate-50 border border-slate-200 rounded p-3 flex flex-col gap-2 shadow-sm">
                                                            <button onClick={addBuilder} className="py-1.5 border border-dashed border-slate-300 text-slate-500 bg-white hover:bg-slate-100 hover:text-slate-700 text-[10px] font-bold rounded flex items-center justify-center gap-1 transition-colors shadow-sm"><PlusIcon /> Tambah Kategori Manual</button>
                                                            <button onClick={handleGeneratePrompts} disabled={isGeneratingPrompts} className="py-2 bg-[#0891B3] hover:bg-[#06738F] text-white text-[11px] font-bold uppercase tracking-wider rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-70 shadow-sm mt-1">
                                                                {isGeneratingPrompts ? <><CustomSpinner className="w-4 h-4 text-white" /> Meracik Blueprint...</> : <><SparklesIcon className="w-3 h-3" /> Buat Blueprint</>}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mb-4 shrink-0 flex flex-col">
                                                <div className="flex justify-between items-end mb-1">
                                                    <label className="block text-[11px] font-bold text-slate-600">Daftar Blueprint Animasi</label>
                                                </div>
                                                <div className={`border rounded flex flex-col bg-slate-50 transition-all overflow-hidden relative ${isGenerating && !isPaused ? 'border-gray-200' : 'border-gray-300 focus-within:ring-2 focus-within:ring-[#0891B3] focus-within:border-[#0891B3]'}`}>
                                                    <div className="w-full h-[150px] p-2 overflow-y-auto custom-scroll bg-white flex flex-col gap-2 disabled:bg-gray-100">
                                                        {blueprints.length === 0 ? (
                                                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-[10px] font-medium uppercase tracking-widest text-center px-4">Belum ada Blueprint</div>
                                                        ) : (
                                                            blueprints.map((bp, idx) => (
                                                                <div key={bp.id} className="bg-slate-50 border border-slate-200 rounded p-2 relative shadow-sm flex flex-col gap-1 transition-all">
                                                                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                                                                        {editingBlueprintId === bp.id ? (
                                                                            <>
                                                                                <button onClick={() => setEditingBlueprintId(null)} className="bg-slate-200 text-slate-600 rounded-md px-2 py-0.5 text-[8px] font-bold hover:bg-slate-300 transition-colors">BATAL</button>
                                                                                <button onClick={() => { setBlueprints(prev => prev.map(b => b.id === bp.id ? { ...b, ...editBpForm } : b)); setEditingBlueprintId(null); }} className="bg-green-500 text-white rounded-md px-2 py-0.5 text-[8px] font-bold hover:bg-green-600 transition-colors">SIMPAN</button>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <button onClick={() => handleCopyText(`Topik: ${bp.topic}\nGaya Visual: ${bp.style}\nVisual: ${bp.visual}\nScene: ${bp.scene}\nWarna: ${bp.colors}\nBackground: ${bp.background}`)} disabled={isGenerating && !isPaused} className="bg-slate-100 text-slate-600 rounded-md px-1.5 py-0.5 hover:bg-slate-200 transition-colors disabled:opacity-50" title="Salin Blueprint"><CopyIcon /></button>
                                                                                <button onClick={() => { setEditingBlueprintId(bp.id); setEditBpForm(bp); }} disabled={isGenerating && !isPaused} className="bg-[#0891B3]/10 text-[#0891B3] rounded-md px-1.5 py-0.5 hover:bg-[#0891B3] hover:text-white transition-colors disabled:opacity-50" title="Edit Blueprint"><EditIcon /></button>
                                                                                <button onClick={() => setBlueprintToDeleteConfirm(bp.id)} disabled={isGenerating && !isPaused} className="bg-red-100 text-red-600 rounded-md px-1.5 py-0.5 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50" title="Hapus"><TrashIcon /></button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    <h4 className="text-[10px] font-bold text-[#0891B3] truncate pr-20"><span className="uppercase">{idx + 1}. {bp.topic}</span> <span className="text-slate-400 normal-case">({bp.duration}s)</span></h4>
                                                                    {editingBlueprintId === bp.id ? (
                                                                        <div className="flex flex-col gap-1.5 mt-1">
                                                                            <input type="text" value={editBpForm.topic} onChange={e => setEditBpForm({...editBpForm, topic: e.target.value})} className="w-full text-[9px] p-1 border rounded bg-white" placeholder="Topik" />
                                                                            <input type="text" value={editBpForm.style} onChange={e => setEditBpForm({...editBpForm, style: e.target.value})} className="w-full text-[9px] p-1 border rounded bg-white" placeholder="Gaya Visual" />
                                                                            <textarea value={editBpForm.visual} onChange={e => setEditBpForm({...editBpForm, visual: e.target.value})} className="w-full text-[9px] p-1 border rounded bg-white h-10 resize-none custom-scroll" placeholder="Ringkasan Visual" />
                                                                            <textarea value={editBpForm.scene} onChange={e => setEditBpForm({...editBpForm, scene: e.target.value})} className="w-full text-[9px] p-1 border rounded bg-white h-10 resize-none custom-scroll" placeholder="Struktur Scene" />
                                                                            <input type="text" value={editBpForm.colors} onChange={e => setEditBpForm({...editBpForm, colors: e.target.value})} className="w-full text-[9px] p-1 border rounded bg-white" placeholder="Warna Utama" />
                                                                            <input type="text" value={editBpForm.background} onChange={e => setEditBpForm({...editBpForm, background: e.target.value})} className="w-full text-[9px] p-1 border rounded bg-white" placeholder="Background" />
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            <div className="text-[9px] text-slate-700 leading-tight"><span className="font-bold text-slate-500 block">Gaya Visual:</span> {bp.style}</div>
                                                                            <div className="text-[9px] text-slate-700 leading-tight"><span className="font-bold text-slate-500 block">Visual:</span> {bp.visual}</div>
                                                                            <div className="text-[9px] text-slate-700 leading-tight"><span className="font-bold text-slate-500 block">Scene:</span> {bp.scene}</div>
                                                                            <div className="text-[9px] text-slate-700 leading-tight"><span className="font-bold text-slate-500 block">Warna:</span> {bp.colors}</div>
                                                                            <div className="text-[9px] text-slate-700 leading-tight"><span className="font-bold text-slate-500 block">Background:</span> {bp.background}</div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between items-center border-t border-gray-200 px-2 py-1.5 shrink-0 bg-white z-10">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Qty:</span>
                                                            <input type="number" min="1" max="100" value={blueprintQuantity} onChange={e => setBlueprintQuantity(e.target.value)} disabled={isGenerating && !isPaused} className={`${inputClass} !h-[22px] !w-12 !px-1 !py-0 !text-center text-[10px] font-bold`} />
                                                            <span className="text-[10px] font-bold text-slate-400 tracking-widest ml-1 uppercase">TOTAL: {blueprints.length} x {blueprintQuantity || 1} = <span className="text-[#0891B3] ml-1">{blueprints.length * (parseInt(blueprintQuantity) || 1)}</span></span>
                                                        </div>
                                                        <button onClick={() => setClearAllBlueprintsConfirm(true)} disabled={(isGenerating && !isPaused) || blueprints.length === 0} className="flex items-center gap-1 text-[10px] font-bold text-red-600 hover:text-red-700 transition disabled:opacity-50"><TrashIcon /> CLEAR</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* TAB: FILE */}
                                    {inputMode === 'file' && (
                                        <div className="mb-4 shrink-0 flex flex-col">
                                            <div className="flex justify-between items-end mb-1">
                                                <label className="block text-[11px] font-bold text-slate-600">Daftar File Media (Batch Vektor Tracing)</label>
                                            </div>
                                            <input type="file" ref={promptMediaInputRef} multiple accept="image/*,video/*,.svg" onChange={handleMediaUpload} className="hidden" />
                                            <button onClick={() => promptMediaInputRef.current?.click()} disabled={isGenerating && !isPaused} className="w-full h-10 mb-2 border-2 border-dashed border-[#0891B3]/30 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 bg-[#0891B3]/5 text-[#0891B3] hover:bg-[#0891B3]/10 disabled:opacity-50 disabled:cursor-wait shadow-sm">
                                                <UploadCloudIcon className="w-4 h-4 opacity-80" /> <span>Upload Media File</span>
                                            </button>
                                            <div className={`border rounded flex flex-col bg-slate-50 transition-all overflow-hidden relative ${isGenerating && !isPaused ? 'border-gray-200' : 'border-gray-300 focus-within:ring-2 focus-within:ring-[#0891B3] focus-within:border-[#0891B3]'}`} onDragOver={handleDragOver} onDrop={handleDropFile}>
                                                <div className="w-full h-[150px] p-2 overflow-y-auto custom-scroll bg-white">
                                                    {uploadedFilesData.length === 0 ? (
                                                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-[10px] font-medium pointer-events-none uppercase tracking-widest text-center px-4">Tarik gambar ke sini (Drag & Drop) untuk dijiplak AI</div>
                                                    ) : (
                                                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                                                            {uploadedFilesData.map((file) => (
                                                                <div key={file.id} className="relative aspect-square shrink-0 group">
                                                                    <div className="w-full h-full bg-slate-100 rounded border border-slate-200 overflow-hidden shadow-sm flex items-center justify-center relative">
                                                                        {file.type.startsWith('image/') ? <img src={file.url} alt={file.name} className="w-full h-full object-cover" /> : <div className="text-slate-400 text-[8px] font-bold flex flex-col items-center"><FileIcon className="w-4 h-4 mb-0.5" />VID</div>}
                                                                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                                                            <button onClick={() => setFilePreviewModal(file)} disabled={isGenerating && !isPaused} className="text-white hover:text-[#0891B3] transition-colors"><EyeIcon className="w-6 h-6" /></button>
                                                                        </div>
                                                                    </div>
                                                                    <button onClick={() => setFileToDeleteConfirm(file.id)} disabled={isGenerating && !isPaused} className="absolute -top-2 -right-2 w-[22px] h-[22px] bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] shadow-md hover:bg-red-600 hover:scale-110 transition-transform z-10 disabled:opacity-50 border border-white"><XCircleIcon className="w-4 h-4" /></button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-center border-t border-gray-200 px-2 py-1.5 shrink-0 bg-white z-10">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Qty:</span>
                                                        <input type="number" min="1" max="100" value={fileQuantity} onChange={e => setFileQuantity(e.target.value)} disabled={isGenerating && !isPaused} className={`${inputClass} !h-[22px] !w-12 !px-1 !py-0 !text-center text-[10px] font-bold`} />
                                                        <span className="text-[10px] font-bold text-slate-400 tracking-widest ml-1 uppercase">TOTAL: {uploadedFilesData.length} x {fileQuantity || 1} = <span className="text-[#0891B3] ml-1">{uploadedFilesData.length * (parseInt(fileQuantity) || 1)}</span></span>
                                                    </div>
                                                    <button onClick={() => setClearAllFilesConfirm(true)} disabled={(isGenerating && !isPaused) || uploadedFilesData.length === 0} className="flex items-center gap-1 text-[10px] font-bold text-red-600 hover:text-red-700 transition disabled:opacity-50"><TrashIcon /> CLEAR</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB: RENDER (Direct Card Upload & Dropdowns) */}
                                    {inputMode === 'render' && (
                                        <div className="mb-4 shrink-0 flex flex-col border-b border-slate-200 pb-4">
                                            
                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Impor</label>
                                                    <select value={renderImportType} onChange={(e) => setRenderImportType(e.target.value)} disabled={isGenerating && !isPaused} className={`${inputClass} font-bold text-slate-700`}>
                                                        <option value="txt">TXT Kode</option>
                                                        <option value="base64">TXT Base64</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Ekspor</label>
                                                    <select value={renderExportType} onChange={(e) => setRenderExportType(e.target.value)} disabled={isGenerating && !isPaused} className={`${inputClass} font-bold text-slate-700`}>
                                                        <option value="mp4">MP4</option>
                                                        <option value="base64">Base64</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <input type="file" ref={renderMediaInputRef} multiple accept=".txt" onChange={handleRenderUpload} className="hidden" />
                                            <button onClick={() => renderMediaInputRef.current?.click()} disabled={isGenerating && !isPaused} onDragOver={handleDragOver} onDrop={handleDropRender} className="w-full h-12 border-2 border-dashed border-[#0891B3]/40 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 bg-[#0891B3]/5 text-[#0891B3] hover:bg-[#0891B3]/10 disabled:opacity-50 disabled:cursor-wait shadow-sm">
                                                <UploadCloudIcon className="w-5 h-5 opacity-80" /> 
                                                <span className="tracking-widest">Upload File .TXT</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* GLOBAL SETTINGS - DYNAMIC */}
                                    {inputMode !== 'render' && (
                                        <div className="grid grid-cols-2 gap-2 mb-1.5 shrink-0">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Instruksi Tambahan</label>
                                                <textarea value={instructions} onChange={e => setInstructions(e.target.value)} disabled={isGenerating && !isPaused} className="w-full text-xs p-2 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-[#0891B3] outline-none h-16 resize-none custom-scroll leading-tight" />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-red-600 mb-0.5">Negatif Kode</label>
                                                <textarea value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} disabled={isGenerating && !isPaused} className="w-full text-xs p-2 border border-red-200 rounded bg-red-50/50 focus:ring-2 focus:ring-red-500 outline-none h-16 resize-none custom-scroll leading-tight" />
                                            </div>
                                        </div>
                                    )}

                                    <div className={`grid grid-cols-6 gap-2 shrink-0 ${inputMode === 'render' ? 'mt-1' : ''}`}>
                                        
                                        {/* TEXT MODE */}
                                        {inputMode === 'text' && (
                                            <>
                                                <div className="col-span-3">
                                                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Rasio</label>
                                                    <select value={selectedRatio} onChange={(e) => setSelectedRatio(e.target.value)} disabled={isGenerating && !isPaused} className={`${inputClass} font-bold cursor-pointer disabled:opacity-60 px-1 bg-slate-50 border-slate-200 text-slate-700`}>
                                                        {RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                                                    </select>
                                                </div>
                                                <div className="col-span-3">
                                                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Resolusi</label>
                                                    <select value={selectedResolution} onChange={(e) => setSelectedResolution(e.target.value)} disabled={isGenerating && !isPaused} className={`${inputClass} font-bold cursor-pointer disabled:opacity-60 px-1`}>
                                                        {RESOLUTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                                    </select>
                                                </div>
                                            </>
                                        )}

                                        {/* FILE MODE */}
                                        {inputMode === 'file' && (
                                            <>
                                                <div className="col-span-2">
                                                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Rasio</label>
                                                    <select value={selectedRatio} onChange={(e) => setSelectedRatio(e.target.value)} disabled={isGenerating && !isPaused} className={`${inputClass} font-bold cursor-pointer disabled:opacity-60 px-1 bg-slate-50 border-slate-200 text-slate-700`}>
                                                        {RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                                                    </select>
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Resolusi</label>
                                                    <select value={selectedResolution} onChange={(e) => setSelectedResolution(e.target.value)} disabled={isGenerating && !isPaused} className={`${inputClass} font-bold cursor-pointer disabled:opacity-60 px-1`}>
                                                        {RESOLUTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                                    </select>
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Durasi</label>
                                                    <select value={selectedDuration} onChange={(e) => setSelectedDuration(parseInt(e.target.value))} disabled={isGenerating && !isPaused} className={`${inputClass} font-bold cursor-pointer disabled:opacity-60 px-1`}>
                                                        {DURATIONS.map(d => <option key={d} value={d}>{d}s</option>)}
                                                    </select>
                                                </div>
                                            </>
                                        )}

                                        {/* RENDER MODE */}
                                        {inputMode === 'render' && (
                                            <>
                                                <div className="col-span-3">
                                                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Bitrate Render</label>
                                                    <select value={renderBitrate} onChange={(e) => setRenderBitrate(parseInt(e.target.value))} disabled={isGenerating && !isPaused} className={`${inputClass} font-bold cursor-pointer disabled:opacity-60 px-1 bg-slate-50 border-slate-200 text-slate-700`}>
                                                        {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(b => <option key={b} value={b}>{b} Mbps</option>)}
                                                    </select>
                                                </div>
                                                <div className="col-span-3">
                                                    <label className="block text-[10px] font-bold text-slate-600 mb-1">FPS Render</label>
                                                    <select value={renderFps} onChange={(e) => setRenderFps(parseInt(e.target.value))} disabled={isGenerating && !isPaused} className={`${inputClass} font-bold cursor-pointer disabled:opacity-60 px-1 bg-slate-50 border-slate-200 text-slate-700`}>
                                                        <option value={30}>30 fps</option><option value={60}>60 fps</option>
                                                        <option value={90}>90 fps</option><option value={120}>120 fps</option>
                                                    </select>
                                                </div>
                                            </>
                                        )}
                                        
                                        {/* Workers & Delay */}
                                        {inputMode !== 'render' && (
                                            <>
                                                <div className="col-span-1 mt-1">
                                                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Worker</label>
                                                    <input type="number" min="1" value={workerCount} onChange={e => setWorkerCount(e.target.value)} disabled={isGenerating && !isPaused} className={inputClass} />
                                                </div>
                                                <div className="col-span-1 mt-1">
                                                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Delay</label>
                                                    <input type="number" min="0" value={workerDelay} onChange={e => setWorkerDelay(e.target.value)} disabled={isGenerating && !isPaused} className={inputClass} />
                                                </div>
                                            </>
                                        )}
                                        
                                        {/* Global ZIP Name */}
                                        <div className={`${inputMode === 'render' ? 'col-span-6 mt-2' : 'col-span-4 mt-1'}`}>
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <FileTextIcon />
                                                <label className="block text-[10px] font-bold text-slate-600 leading-none">Nama Ekspor ZIP {inputMode === 'render' ? (renderExportType === 'mp4' ? '(.mp4)' : '(_B64.txt)') : '(.txt)'}</label>
                                            </div>
                                            <input type="text" value={zipFilename} onChange={e => setZipFilename(e.target.value)} disabled={isGenerating && !isPaused} placeholder={inputMode === 'render' ? (renderExportType === 'mp4' ? 'AMATI-Motion-Video' : 'AMATI-Cache-Base64') : "AMATI-Motion-Kode"} className={`${inputClass} placeholder:text-slate-400`} />
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* PANEL BAWAH (STAT & BUTTONS) */}
                        <div className="shrink-0 p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-4 z-10">
                            <div className="bg-white rounded-lg border border-slate-200 shadow-sm transition-all overflow-hidden">
                                <div className="grid grid-cols-3 gap-0 border-b border-gray-100 p-2 bg-gray-50">
                                    <div className="flex flex-col items-center justify-center border border-[#0891B3]/20 rounded-lg bg-[#0891B3]/5 py-1.5 shadow-sm transition-all">
                                        <div className="flex items-center gap-1 mb-1 text-[#0891B3]"><ClockIcon /> <span className="text-xs font-medium uppercase leading-none">Selected</span></div>
                                        <span className="text-xs font-black text-[#0891B3] tabular-nums">{selectedDisplayCount}</span>
                                    </div>
                                    <div className="mx-1.5 flex flex-col items-center justify-center border border-green-200 rounded-lg bg-green-50 py-1.5 shadow-sm transition-all">
                                        <div className="flex items-center gap-1 mb-1 text-green-600"><CheckCircleIcon /> <span className="text-xs font-medium uppercase leading-none">Completed</span></div>
                                        <span className="text-xs font-black text-green-700 tabular-nums">{countSuccess}</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center border border-red-200 rounded-lg bg-red-50 py-1.5 shadow-sm transition-all">
                                        <div className="flex items-center gap-1 mb-1 text-red-600"><XCircleIcon className="w-3 h-3" /> <span className="text-xs font-medium uppercase leading-none">Failed</span></div>
                                        <span className="text-xs font-black text-red-700 tabular-nums">{countFailed}</span>
                                    </div>
                                </div>
                                <div className="p-2 bg-white flex items-center justify-between gap-3">
                                    <button onClick={() => setClearAllConfirm(true)} disabled={(isGenerating && !isPaused) || activeCards.length === 0} className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold uppercase tracking-wide rounded border transition-colors ${activeCards.length > 0 && (!isGenerating || isPaused) ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'}`}>
                                        <TrashIcon /> CLEAR ALL KARTU
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex gap-1.5 h-10">
                                    {isTabGenerating || isTabPaused || isTabProcessing ? (
                                        <div className={`flex-1 border text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm select-none transition-all ${isTabPaused ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-[#0891B3]/10 text-[#0891B3] border-[#0891B3]/30'}`}>
                                            <SparklesIcon className={`w-4 h-4 ${isTabPaused ? '' : 'animate-spin'} ${isTabPaused ? 'text-amber-600' : 'text-[#0891B3]'}`} />
                                            <span className="uppercase tracking-wide">{isTabPaused ? 'Terhenti' : <>Memproses<span className="dot-anim inline-block w-3 text-left"></span></>}</span>
                                        </div>
                                    ) : (
                                        <button onClick={() => handleStartAction(false)} disabled={!canGenerate || isProcessMismatch} className={`flex-1 text-xs font-bold rounded-lg border shadow transition-colors flex items-center justify-center gap-2 uppercase tracking-wide truncate ${canGenerate && !isProcessMismatch ? 'bg-[#0891B3] hover:bg-[#06738F] text-white border-[#06738F] hover:-translate-y-0.5' : 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400'}`}>
                                            <Wand2Icon /> {inputMode === 'render' ? 'RENDER' : 'GENERATE'}
                                        </button>
                                    )}
                                    <button onClick={handlePauseResume} disabled={!canPauseResume || isProcessMismatch} className={`w-10 flex items-center justify-center rounded-lg border shadow-sm transition-all active:scale-95 shrink-0 ${(!canPauseResume || isProcessMismatch) ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : isTabPaused ? 'bg-green-600 border-green-700 text-white hover:bg-green-700 hover:-translate-y-0.5' : 'bg-amber-100 border-amber-300 text-amber-600 hover:bg-amber-200 hover:-translate-y-0.5'}`}>
                                        {isTabPaused ? <PlayIcon /> : <PauseIcon />}
                                    </button>
                                    
                                    <button onClick={handleDownloadZipStreamed} disabled={!isZipActive || isZipping || isProcessMismatch} className={`flex-1 text-xs font-bold rounded-lg border shadow transition-colors flex items-center justify-center gap-2 uppercase tracking-wide truncate ${(isZipping) ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : (isZipActive && !isProcessMismatch) ? 'bg-green-600 hover:bg-green-700 text-white border-green-700 hover:-translate-y-0.5' : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-80'}`}>
                                        {isZipping ? <SparklesIcon className="w-4 h-4 animate-spin text-emerald-600" /> : <DownloadIcon />}
                                        <span className="truncate">{isZipping ? 'EKSTRAK...' : 'Ekspor ZIP'}</span>
                                    </button>
                                </div>
                                {isZipping && zipProgress && (
                                    <div className="text-[10px] text-slate-500 font-mono text-right pr-2">
                                        Mengemas {zipProgress.done} / {zipProgress.total} file...
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>

                    {/* AREA KANAN: Kartu dan Pagination */}
                    <section className="flex-1 flex flex-col lg:overflow-hidden relative min-h-0 bg-slate-100">
                        
                        {/* HEADER PAGINATION */}
                        <div className="bg-white border-b border-slate-200 p-3 flex justify-between items-center shrink-0 shadow-sm z-10">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                {[50, 100, 150, 200, 250].map(num => (
                                    <button key={num} onClick={() => { setItemsPerPage(num); setCurrentPage(1); }} className={`px-2 py-1 rounded border transition ${itemsPerPage === num ? 'bg-[#0891B3]/10 text-[#0891B3] border-[#0891B3]/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-200'}`}>
                                        {num}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-1">
                                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50 border border-slate-200 transition"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
                                <span className="text-sm font-bold text-slate-700 tracking-widest px-2">{currentPage} / {totalPages || 1}</span>
                                <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50 border border-slate-200 transition"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>
                            </div>
                        </div>

                        {/* LIST KARTU */}
                        <div className="flex-1 p-4 lg:overflow-y-auto custom-scroll pb-20 lg:pb-4">
                            {activeCards.length > 0 ? (
                                <div className="grid gap-4 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                                    {paginatedCards.map(f => {
                                        return (
                                        <div key={f.id} className={`bg-white hover:shadow-md rounded-lg shadow-sm border flex flex-col transition-all duration-300 ${f.status === 'processing' ? 'border-[#0891B3] ring-2 ring-[#0891B3]/20' : f.status === 'failed' ? 'border-red-300' : 'border-slate-200'}`}>
                                            
                                            <div className="grid grid-cols-4 gap-2 p-2 bg-[#0891B3]/5 border-b border-[#0891B3]/10 rounded-t-lg shrink-0">
                                                
                                                <button onClick={() => { setPreviewModal(f); setPreviewTab('motion'); }} disabled={f.mode !== 'render' && f.status !== 'done'} className="flex flex-row items-center justify-center gap-1.5 py-1.5 rounded border bg-white border-[#0891B3]/20 text-[#0891B3] hover:bg-[#0891B3]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                                                    <EyeIcon /> <span className="text-[10px] font-bold uppercase tracking-tight truncate">Prev</span>
                                                </button>
                                                
                                                <button onClick={() => handleCopyText(f.code)} disabled={!f.code} className="flex flex-row items-center justify-center gap-1.5 py-1.5 rounded border bg-white border-[#0891B3]/20 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                                                    <CopyIcon /> <span className="text-[10px] font-bold uppercase tracking-tight truncate">Copy</span>
                                                </button>

                                                {/* Edit vs Download sesuai Mode */}
                                                {f.mode === 'render' ? (
                                                    <button onClick={() => handleDownloadSingleMP4(f)} disabled={f.status !== 'done' || !f.hasFile} className="flex flex-row items-center justify-center gap-1.5 py-1.5 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-50 text-emerald-600 border-emerald-200 hover:brightness-95">
                                                        <DownloadIcon /> <span className="text-[10px] font-bold uppercase tracking-tight truncate">DWN</span>
                                                    </button>
                                                ) : (
                                                    <button onClick={() => { setEditCardId(f.id); setEditRatio(f.ratio || '16:9'); setEditCode(f.code); setEditHistory([f.code]); setEditHistoryIndex(0); setEditTab('code'); }} disabled={f.status !== 'done'} className="flex flex-row items-center justify-center gap-1.5 py-1.5 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-amber-50 text-amber-600 border-amber-200 hover:brightness-95">
                                                        <EditIcon /> <span className="text-[10px] font-bold uppercase tracking-tight truncate">Edit</span>
                                                    </button>
                                                )}
                                                
                                                <button onClick={() => setFileToDelete(f.id)} disabled={f.status === 'processing'} className="flex flex-row items-center justify-center gap-1.5 py-1.5 rounded border bg-white border-[#0891B3]/20 text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                                                    <TrashIcon /> <span className="text-[10px] font-bold uppercase tracking-tight truncate">Del</span>
                                                </button>
                                            </div>

                                            <div className="p-2 border-b border-slate-100 flex justify-between items-center gap-2 shrink-0 bg-white">
                                                <p className="text-[11px] font-bold text-slate-800 truncate" title={f.title}>{f.title}</p>
                                                <span className={`text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded border whitespace-nowrap ${f.status === 'done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : f.status === 'processing' ? 'bg-[#0891B3]/10 text-[#0891B3] border-[#0891B3]/20' : f.status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                                    {f.status.toUpperCase()}
                                                </span>
                                            </div>

                                            <div className="p-2 flex gap-2 h-[150px] bg-white rounded-b-lg relative">
                                                <div className="flex-1 rounded-lg overflow-hidden bg-slate-50 relative flex items-center justify-center group cursor-pointer border border-slate-200" onClick={() => { if (f.status === 'done' || (f.mode === 'render' && f.code)) { setPreviewModal(f); setPreviewTab('motion'); } }}>
                                                    {f.status === 'done' || (f.mode === 'render' && f.code) ? (
                                                        <>
                                                            <div className="absolute inset-0 bg-transparent w-full h-full">
                                                                <iframe title={`Thumb-${f.id}`} srcDoc={wrapSvgAsHtml(f.code, f.resolution, f.duration, 'thumbnail')} sandbox="allow-scripts" className="absolute inset-0 w-full h-full border-none pointer-events-none" scrolling="no" />
                                                            </div>
                                                            <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/40 transition-all flex items-center justify-center">
                                                                <PlayIcon className="text-white w-8 h-8 drop-shadow-lg opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                                                            </div>
                                                        </>
                                                    ) : f.status === 'failed' ? (
                                                        <div className="p-2 text-center text-red-500"><AlertTriangleIcon className="w-6 h-6 mx-auto" /></div>
                                                    ) : f.status === 'processing' ? (
                                                        <div className="flex flex-col items-center text-[#0891B3]"><CustomSpinner className="w-5 h-5 mb-1" /></div>
                                                    ) : (
                                                        <div className="text-slate-400"><CodeIcon className="w-6 h-6" /></div>
                                                    )}
                                                </div>
                                                
                                                <div className="flex-1 border border-slate-200 rounded-lg bg-slate-50 flex flex-col overflow-hidden">
                                                    <div className="p-1 border-b border-slate-200 bg-slate-100 sticky top-0 shrink-0">
                                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block text-center">JS Code</span>
                                                    </div>
                                                    <div className="p-1.5 overflow-y-auto custom-scroll flex-1 bg-white">
                                                        {f.status === 'processing' ? (
                                                            <div className="h-full flex items-center justify-center">
                                                                {f.mode === 'render' ? (
                                                                    <span className="text-sm font-['Share_Tech'] font-bold text-[#0891B3] bg-[#0891B3]/10 px-3 py-1.5 rounded shadow-sm border border-[#0891B3]/20">
                                                                        {f.renderProgress ? `${f.renderProgress.frame} / ${f.renderProgress.total}` : `0 / ${f.duration * (f.fps || renderFps)}`}
                                                                    </span>
                                                                ) : (
                                                                    <p className="text-[12px] text-slate-500 font-['Share_Tech'] tracking-wide text-center">
                                                                        Memproses<span className="dot-anim inline-block w-4 text-left"></span>
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ) : f.code ? (
                                                            <pre className="text-[8px] text-slate-700 font-mono leading-tight whitespace-pre-wrap break-words">
                                                                <code>{f.code}</code>
                                                            </pre>
                                                        ) : (
                                                            <div className="h-full flex items-center justify-center">
                                                                <p className="text-[12px] text-slate-500 font-['Share_Tech'] tracking-wide text-center">
                                                                    Memproses<span className="dot-anim inline-block w-4 text-left"></span>
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    )})}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center w-full h-full min-h-[50vh]">
                                    <div className="w-20 h-20 bg-[#0891B3]/5 border border-[#0891B3]/20 text-[#0891B3]/60 rounded-full flex items-center justify-center mb-4">
                                        <Wand2Icon className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-700 mb-2">Belum Ada Antrean</h3>
                                    <p className="text-slate-500 text-sm max-w-md">Masukkan prompt, unggah file, atau gunakan Mode Render untuk mengubah ke MP4.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </main>

                {/* MODAL PREVIEW RENDER/TEXT */}
                {previewModal && (() => {
                    const resStr = previewModal.resolution || '1920x1080';
                    const parts = resStr.split('x').map(Number);
                    const resW = parts[0] || 1920;
                    const resH = parts[1] || 1080;
                    const aspect = (resW && resH) ? (resW / resH) : 16/9;
                    const dynamicVh = aspect < 1 ? '95vh' : '85vh';

                    return (
                        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/80 p-2 sm:p-4 md:p-8 backdrop-blur-sm transition-opacity" onClick={() => setPreviewModal(null)}>
                            <div className="relative flex flex-col w-full mx-auto transition-all duration-300" style={{ maxWidth: `min(100%, calc((${dynamicVh} - 150px) * ${aspect}))` }} onClick={e => e.stopPropagation()}>
                                <button className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 shadow-xl hover:bg-red-600 hover:scale-110 transition-transform z-[110]" onClick={() => setPreviewModal(null)}><XCircleIcon className="w-5 h-5" /></button>
                                
                                <div className="bg-white shadow-2xl flex flex-col rounded-xl overflow-hidden w-full relative">
                                    
                                    {previewModal.mode === 'render' && (
                                        <div className="bg-white p-3 border-b border-slate-200 shrink-0">
                                            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-full h-[40px] border border-slate-200">
                                                <button onClick={() => setPreviewTab('motion')} className={`flex-1 flex items-center justify-center gap-2 py-1 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${previewTab === 'motion' ? 'bg-white text-[#0891B3] shadow-sm border border-[#0891B3]/20' : 'text-slate-500 hover:bg-slate-200 border border-transparent'}`}>Motion</button>
                                                <button onClick={() => setPreviewTab('mp4')} disabled={previewModal.status !== 'done'} className={`flex-1 flex items-center justify-center gap-2 py-1 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${previewTab === 'mp4' ? 'bg-white text-[#0891B3] shadow-sm border border-[#0891B3]/20' : 'text-slate-500 hover:bg-slate-200 border border-transparent'} disabled:opacity-50 disabled:cursor-not-allowed`}>MP4</button>
                                                <button onClick={() => setPreviewTab('base64')} disabled={previewModal.status !== 'done' || !previewModal.hasFile} className={`flex-1 flex items-center justify-center gap-2 py-1 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${previewTab === 'base64' ? 'bg-white text-[#0891B3] shadow-sm border border-[#0891B3]/20' : 'text-slate-500 hover:bg-slate-200 border border-transparent'} disabled:opacity-50 disabled:cursor-not-allowed`}>Base64</button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-3 w-full bg-white">
                                        <div className="w-full relative" style={{ paddingBottom: `calc(${1 / aspect * 100}% + 56px)` }}>
                                            <div className="absolute inset-0 w-full h-full flex flex-col">
                                                {previewModal.mode === 'render' && previewTab === 'mp4' ? (
                                                    <>
                                                        <div className="flex-1 w-full bg-black rounded-lg overflow-hidden flex items-center justify-center relative shadow-inner border border-slate-300">
                                                            <OpfsVideoPlayer cardId={previewModal.id} />
                                                        </div>
                                                        <div className="h-[44px] bg-white border border-[#0891B3] rounded-lg px-4 flex items-center gap-3 mt-[12px] shrink-0 opacity-60 pointer-events-none">
                                                            <div className="w-6 h-6 bg-[#0891B3] rounded-full flex items-center justify-center text-white"><PlayIcon className="w-2.5 h-2.5 ml-0.5" /></div>
                                                            <div className="flex-1 h-[6px] bg-slate-200 rounded-full relative">
                                                                <div className="absolute top-0 left-0 h-full bg-[#0891B3] w-full rounded-full"></div>
                                                                <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-[#0891B3] rounded-full shadow-sm"></div>
                                                            </div>
                                                            <div className="text-[11px] font-bold text-slate-600 font-mono tabular-nums">{previewModal.duration.toFixed(1)}s</div>
                                                        </div>
                                                    </>
                                                ) : previewModal.mode === 'render' && previewTab === 'base64' ? (
                                                    <>
                                                        <div className="flex-1 w-full bg-slate-50 border border-slate-300 rounded-lg overflow-hidden relative shadow-inner p-3">
                                                            <textarea readOnly value={base64Preview} spellCheck="false" className="w-full h-full bg-transparent resize-none text-[9px] font-mono leading-relaxed text-slate-600 custom-scroll outline-none" />
                                                        </div>
                                                        <div className="h-[44px] bg-slate-50 border border-[#0891B3] rounded-lg px-3 flex items-center justify-between gap-3 mt-[12px] shrink-0 shadow-sm">
                                                            <span className="text-[11px] font-bold text-slate-500 font-mono">Len: {base64Preview?.length?.toLocaleString()} char</span>
                                                            <button onClick={() => handleCopyText(base64Preview)} className="bg-[#0891B3] hover:bg-[#06738F] text-white text-[11px] font-bold px-4 py-1.5 rounded-md flex items-center gap-2 transition-colors shadow-sm"><CopyIcon className="w-3.5 h-3.5" /> Copy Base64</button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <iframe srcDoc={wrapSvgAsHtml(previewModal.code, resStr, previewModal.duration, 'preview')} className="w-full h-full border-none block" sandbox="allow-scripts" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* MODAL EDIT KODE (TEKS & FILE) */}
                {editCardId && (() => {
                    const editCard = activeCards.find(c => c.id === editCardId);
                    const resStr = editCard?.resolution || '1920x1080';
                    const parts = resStr.split('x').map(Number);
                    const resW = parts[0] || 1920;
                    const resH = parts[1] || 1080;
                    const aspect = (resW && resH) ? (resW / resH) : 16/9;
                    const dynamicVh = aspect < 1 ? '95vh' : '85vh';
            
                    return (
                        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/80 p-2 sm:p-4 md:p-8 backdrop-blur-sm transition-opacity" onClick={() => !isRevising && setEditCardId(null)}>
                            <div className="relative flex flex-col w-full mx-auto transition-all duration-300" style={{ maxWidth: `min(100%, calc((${dynamicVh} - 150px) * ${aspect}))` }} onClick={e => e.stopPropagation()}>
                                <div className="flex justify-between items-end mb-2 px-1">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => { const newIndex = editHistoryIndex - 1; setEditHistoryIndex(newIndex); setEditCode(editHistory[newIndex]); }} disabled={editHistoryIndex <= 0 || isRevising} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition shadow-sm disabled:opacity-30 disabled:cursor-not-allowed" title="Undo"><UndoIcon /></button>
                                        <button onClick={() => { const newIndex = editHistoryIndex + 1; setEditHistoryIndex(newIndex); setEditCode(editHistory[newIndex]); }} disabled={editHistoryIndex >= editHistory.length - 1 || isRevising} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition shadow-sm disabled:opacity-30 disabled:cursor-not-allowed" title="Redo"><RedoIcon /></button>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditCardId(null)} className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 transition shadow-md disabled:opacity-50" disabled={isRevising}>Batal</button>
                                        <button onClick={() => { setCards(prev => prev.map(c => c.id === editCardId ? { ...c, code: editCode } : c)); setEditCardId(null); }} className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-[#0891B3] hover:bg-[#06738F] shadow-md transition disabled:opacity-50" disabled={isRevising}>Simpan</button>
                                    </div>
                                </div>
                                <div className="bg-white shadow-2xl flex flex-col rounded-xl overflow-hidden w-full relative">
                                    <div className="bg-white p-3 border-b border-slate-200 shrink-0">
                                        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-full h-[40px] border border-slate-200">
                                            <button onClick={() => setEditTab('settings')} className={`w-[40px] shrink-0 flex items-center justify-center py-1 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${editTab === 'settings' ? 'bg-white text-[#0891B3] shadow-sm border border-[#0891B3]/20' : 'text-slate-500 hover:bg-slate-200 border border-transparent'}`} title="Pengaturan Visual Manual"><SettingsIcon /></button>
                                            <button onClick={() => setEditTab('code')} className={`flex-1 flex items-center justify-center gap-2 py-1 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${editTab === 'code' ? 'bg-white text-[#0891B3] shadow-sm border border-[#0891B3]/20' : 'text-slate-500 hover:bg-slate-200 border border-transparent'}`}><CodeIcon className={`w-3.5 h-3.5 ${editTab === 'code' ? 'text-[#0891B3]' : 'text-slate-400'}`} /><span>Kode</span></button>
                                            <button onClick={() => setEditTab('preview')} className={`flex-1 flex items-center justify-center gap-2 py-1 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${editTab === 'preview' ? 'bg-white text-[#0891B3] shadow-sm border border-[#0891B3]/20' : 'text-slate-500 hover:bg-slate-200 border border-transparent'}`}><EyeIcon className={`w-3.5 h-3.5 ${editTab === 'preview' ? 'text-[#0891B3]' : 'text-slate-400'}`} /><span>Preview</span></button>
                                        </div>
                                    </div>
                                    <div className="p-3 w-full bg-white">
                                        <div className="w-full relative" style={{ paddingBottom: `calc(${1 / aspect * 100}% + 56px)` }}>
                                            <div className="absolute inset-0 w-full h-full flex flex-col">
                                                {isRevising && <div className="absolute inset-0 z-20 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg"><CustomSpinner className="w-10 h-10 text-[#0891B3] mb-3" /><p className="text-sm font-bold text-slate-700 tracking-wider">AI sedang merevisi kode...</p></div>}
                                                
                                                {editTab === 'settings' ? (
                                                    <div className="flex-1 w-full bg-slate-50 border border-[#cbd5e1] rounded-lg overflow-y-auto custom-scroll p-4 shadow-inner flex flex-col gap-6">
                                                        
                                                        {/* --- SECTION: DIMENSI & WAKTU --- */}
                                                        <div>
                                                            <h3 className="text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-widest border-b border-slate-200 pb-2">Pengaturan Dimensi & Waktu</h3>
                                                            <div className="grid grid-cols-3 gap-3">
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Rasio Kanvas</label>
                                                                    <select value={editRatio} onChange={e => handleSettingsChange('ratio', e.target.value)} className="w-full text-xs py-2 px-2 border border-slate-300 rounded bg-white text-slate-700 focus:ring-2 focus:ring-[#0891B3] outline-none shadow-sm">
                                                                        {RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Resolusi Render</label>
                                                                    <select value={resStr} onChange={e => handleSettingsChange('resolution', e.target.value)} className="w-full text-xs py-2 px-2 border border-slate-300 rounded bg-white text-slate-700 focus:ring-2 focus:ring-[#0891B3] outline-none shadow-sm">
                                                                        {Object.values(DIMENSIONS[editRatio]).map(res => (
                                                                            <option key={res} value={res}>{res}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Durasi Loop</label>
                                                                    <select value={editCard?.duration || 10} onChange={e => handleSettingsChange('duration', parseInt(e.target.value))} className="w-full text-xs py-2 px-2 border border-slate-300 rounded bg-white text-slate-700 focus:ring-2 focus:ring-[#0891B3] outline-none shadow-sm">
                                                                        {DURATIONS.map(d => <option key={d} value={d}>{d} Detik</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* --- SECTION: EKSTRAKSI WARNA --- */}
                                                        <div>
                                                            <h3 className="text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-widest border-b border-slate-200 pb-2">Ekstraksi Warna</h3>
                                                            <div className="flex flex-wrap gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                                {Array.from(new Set(editCode.match(/#[0-9a-fA-F]{3,8}\b/g) || [])).map(c => (
                                                                    <CustomColorWheel key={c} color={c.substring(0,7)} onChange={(newColor) => handleSettingsChange('color', { old: c, new: newColor })} />
                                                                ))}
                                                                {(editCode.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length === 0 && (
                                                                    <span className="text-[10px] text-slate-400 italic">Tidak ada kode warna HEX ditemukan.</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* BAGIAN THUMBNAIL (STRUKTUR DIV DISAMAKAN DENGAN EKSTRAKSI WARNA) */}
                                                        <div className="mt-5">
                                                            <h3 className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest border-b border-slate-200 pb-1">Pemilihan Thumbnail</h3>
                                                            <div className="flex flex-col gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                                
                                                                {/* Live Preview Iframe */}
                                                                <div className="w-full relative bg-slate-100 rounded-lg overflow-hidden shadow-inner border border-slate-300" style={{ paddingBottom: `calc(${1 / aspect * 100}%)` }}>
                                                                    <iframe srcDoc={wrapSvgAsHtml(editCode, resStr, editCard?.duration || 10, 'thumbnail')} className="absolute inset-0 w-full h-full border-none pointer-events-none" sandbox="allow-scripts" scrolling="no" />
                                                                </div>
                                                                
                                                                {/* Slider ala Player Bar (Tanpa Tombol Play) */}
                                                                {(() => {
                                                                    const currentDur = editCard?.duration || 10;
                                                                    const thumbMatch = editCode.match(/THUMB:(\d+(?:\.\d+)?)/i);
                                                                    const thumbVal = thumbMatch ? parseFloat(thumbMatch[1]) : (currentDur * 0.40);
                                                                    const thumbPercent = Math.min(100, Math.max(0, (thumbVal / currentDur) * 100));

                                                                    return (
                                                                        <div className="w-full h-[44px] bg-white border border-[#0891B3] rounded-lg px-4 flex items-center gap-3 shrink-0 shadow-sm relative z-10 box-border">
                                                                            
                                                                            {/* Garis Track & Slider */}
                                                                            <div className="flex-1 h-[6px] bg-slate-200 rounded-full relative flex items-center">
                                                                                <div className="absolute top-0 left-0 h-full bg-[#0891B3] rounded-full pointer-events-none" style={{ width: `${thumbPercent}%` }}></div>
                                                                                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-[#0891B3] rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] pointer-events-none" style={{ left: `calc(${thumbPercent}% - 6px)` }}></div>
                                                                                <input type="range" min="0" max={currentDur} step="0.1" 
                                                                                    value={thumbVal} 
                                                                                    onChange={e => handleSettingsChange('thumb', parseFloat(e.target.value))} 
                                                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer m-0 z-10" 
                                                                                />
                                                                            </div>
                                                                            
                                                                            {/* Label Waktu di Kanan */}
                                                                            <div className="text-[11px] font-bold text-slate-600 font-mono tabular-nums min-w-[38px] text-right shrink-0">
                                                                                {thumbVal.toFixed(1)}s
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}

                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : editTab === 'preview' ? (
                                                    <iframe srcDoc={wrapSvgAsHtml(editCode, resStr, editCard?.duration, 'preview')} className="w-full h-full border-none block" sandbox="allow-scripts" />
                                                ) : (
                                                    <>
                                                        <div className="flex-1 w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-lg overflow-hidden relative">
                                                            <textarea value={editCode} onChange={handleEditCodeChange} spellCheck="false" className="absolute inset-0 w-full h-full bg-transparent text-slate-700 font-mono text-[10px] sm:text-[11px] p-4 outline-none resize-none custom-scroll leading-relaxed" />
                                                        </div>
                                                        <div className="mt-[12px] h-[44px] w-full bg-white border border-[#0891B3] rounded-lg px-2 flex items-center gap-2 shrink-0 shadow-sm relative z-10 box-border">
                                                            <input type="text" value={editChatInput} onChange={e => setEditChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !isRevising && handleReviseCode()} placeholder="Instruksi revisi, misal: 'Ubah warna lingkarannya jadi merah'..." disabled={isRevising} className="flex-1 bg-transparent text-xs text-slate-700 outline-none px-2 placeholder:text-slate-400 h-full" />
                                                            <button onClick={handleReviseCode} disabled={!editChatInput.trim() || isRevising} className="w-[28px] h-[28px] shrink-0 flex items-center justify-center rounded-md bg-[#0891B3] text-white hover:bg-[#06738F] disabled:bg-slate-300 disabled:text-slate-500 transition-colors shadow-sm"><SendIcon className="w-3.5 h-3.5" /></button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* MODALS KONFIRMASI */}
                {fileToDelete && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm flex flex-col items-center text-center">
                            <div className="bg-red-100 p-3 rounded-full mb-3"><AlertTriangleIcon /></div>
                            <h3 className="text-lg font-bold text-slate-800">Hapus Kartu?</h3>
                            <p className="text-sm text-slate-600 mt-2 mb-6">Kartu dan kode ini akan dihapus permanen.</p>
                            <div className="flex w-full gap-3">
                                <button onClick={() => setFileToDelete(null)} className="flex-1 bg-slate-200 text-slate-700 font-bold py-2 rounded hover:bg-slate-300 transition text-xs shadow-sm">Batal</button>
                                <button onClick={async () => { 
                                    if(inputMode === 'render') {
                                        await deleteFromOpfs('mp4', fileToDelete);
                                        await deleteFromOpfs('base64', fileToDelete);
                                    } else {
                                        await deleteCardFromDB(fileToDelete);
                                    }
                                    setCards(prev => prev.filter(f => f.id !== fileToDelete)); 
                                    setFileToDelete(null); 
                                }} className="flex-1 bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700 transition shadow-sm text-xs">Ya, Hapus</button>
                            </div>
                        </div>
                    </div>
                )}

                {clearAllConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm flex flex-col items-center text-center">
                            <div className="bg-red-100 p-3 rounded-full mb-3"><AlertTriangleIcon /></div>
                            <h3 className="text-lg font-bold text-slate-800">Hapus Semua?</h3>
                            <p className="text-sm text-slate-600 mt-2 mb-6">Anda akan menghapus <b>seluruh antrean</b> secara permanen.</p>
                            <div className="flex w-full gap-3">
                                <button onClick={() => setClearAllConfirm(false)} className="flex-1 bg-slate-200 text-slate-700 font-bold py-2 rounded hover:bg-slate-300 transition text-xs shadow-sm">Batal</button>
                                <button onClick={confirmClearAllAction} className="flex-1 bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700 transition shadow-sm text-xs">Ya, Hapus Semua</button>
                            </div>
                        </div>
                    </div>
                )}

                {blueprintToDeleteConfirm && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm flex flex-col items-center text-center">
                            <div className="bg-red-100 p-3 rounded-full mb-3"><AlertTriangleIcon /></div>
                            <h3 className="text-lg font-bold text-slate-800">Hapus Blueprint?</h3>
                            <p className="text-sm text-slate-600 mt-2 mb-6">Anda yakin ingin menghapus blueprint ini dari daftar?</p>
                            <div className="flex w-full gap-3">
                                <button onClick={() => setBlueprintToDeleteConfirm(null)} className="flex-1 bg-slate-200 text-slate-700 font-bold py-2 rounded hover:bg-slate-300 transition text-xs shadow-sm">Batal</button>
                                <button onClick={async () => { 
                                    await deleteBlueprintFromDB(blueprintToDeleteConfirm);
                                    setBlueprints(prev => prev.filter(b => b.id !== blueprintToDeleteConfirm)); 
                                    setBlueprintToDeleteConfirm(null); 
                                }} className="flex-1 bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700 transition shadow-sm text-xs">Ya, Hapus</button>
                            </div>
                        </div>
                    </div>
                )}

                {clearAllBlueprintsConfirm && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm flex flex-col items-center text-center">
                            <div className="bg-red-100 p-3 rounded-full mb-3"><AlertTriangleIcon /></div>
                            <h3 className="text-lg font-bold text-slate-800">Kosongkan Blueprint?</h3>
                            <p className="text-sm text-slate-600 mt-2 mb-6">Seluruh blueprint yang ada di daftar akan dihapus permanen.</p>
                            <div className="flex w-full gap-3">
                                <button onClick={() => setClearAllBlueprintsConfirm(false)} className="flex-1 bg-slate-200 text-slate-700 font-bold py-2 rounded hover:bg-slate-300 transition text-xs shadow-sm">Batal</button>
                                <button onClick={async () => { 
                                    await clearBlueprintsFromDB();
                                    setBlueprints([]); 
                                    setClearAllBlueprintsConfirm(false); 
                                }} className="flex-1 bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700 transition shadow-sm text-xs">Ya, Kosongkan</button>
                            </div>
                        </div>
                    </div>
                )}

                {fileToDeleteConfirm && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm flex flex-col items-center text-center">
                            <div className="bg-red-100 p-3 rounded-full mb-3"><AlertTriangleIcon /></div>
                            <h3 className="text-lg font-bold text-slate-800">Hapus File?</h3>
                            <p className="text-sm text-slate-600 mt-2 mb-6">Anda yakin ingin menghapus referensi file ini dari antrean?</p>
                            <div className="flex w-full gap-3">
                                <button onClick={() => setFileToDeleteConfirm(null)} className="flex-1 bg-slate-200 text-slate-700 font-bold py-2 rounded hover:bg-slate-300 transition text-xs shadow-sm">Batal</button>
                                <button onClick={async () => {
                                    if(inputMode === 'file') {
                                        await deleteUploadedFileFromDB(fileToDeleteConfirm);
                                        setUploadedFilesData(prev => prev.filter(f => f.id !== fileToDeleteConfirm));
                                    }
                                    setFileToDeleteConfirm(null);
                                }} className="flex-1 bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700 transition shadow-sm text-xs">Ya, Hapus</button>
                            </div>
                        </div>
                    </div>
                )}

                {clearAllFilesConfirm && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm flex flex-col items-center text-center">
                            <div className="bg-red-100 p-3 rounded-full mb-3"><AlertTriangleIcon /></div>
                            <h3 className="text-lg font-bold text-slate-800">Kosongkan Wadah?</h3>
                            <p className="text-sm text-slate-600 mt-2 mb-6">Seluruh file di dalam kotak ini akan dihapus.</p>
                            <div className="flex w-full gap-3">
                                <button onClick={() => setClearAllFilesConfirm(false)} className="flex-1 bg-slate-200 text-slate-700 font-bold py-2 rounded hover:bg-slate-300 transition text-xs shadow-sm">Batal</button>
                                <button onClick={async () => {
                                    if(inputMode === 'file') {
                                        await clearUploadedFilesFromDB();
                                        setUploadedFilesData([]);
                                    }
                                    setClearAllFilesConfirm(false);
                                }} className="flex-1 bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700 transition shadow-sm text-xs">Ya, Kosongkan</button>
                            </div>
                        </div>
                    </div>
                )}

                {filePreviewModal && (
                    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/80 p-4 md:p-8 backdrop-blur-sm transition-opacity" onClick={() => setFilePreviewModal(null)}>
                        <div className="relative bg-white shadow-2xl flex flex-col rounded-xl p-2 mx-auto w-fit h-fit max-w-full max-h-full" onClick={e => e.stopPropagation()}>
                            <button className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 shadow-xl hover:bg-red-600 hover:scale-110 transition-transform z-[140]" onClick={() => setFilePreviewModal(null)}><XCircleIcon className="w-5 h-5" /></button>
                            <div className="relative rounded-lg overflow-hidden flex items-center justify-center bg-transparent">
                                {filePreviewModal.type && filePreviewModal.type.startsWith('image/') ? (
                                    <img src={filePreviewModal.url} alt="Preview" className="max-w-[90vw] max-h-[85vh] object-contain block" />
                                ) : (
                                    <video src={filePreviewModal.url} controls autoPlay loop className="max-w-[90vw] max-h-[85vh] object-contain block" />
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL LOGOUT */}
                {logoutConfirm && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm flex flex-col items-center text-center">
                            <div className="bg-red-100 p-3 rounded-full mb-3"><AlertTriangleIcon /></div>
                            <h3 className="text-lg font-bold text-slate-800">Keluar dari Akun?</h3>
                            <p className="text-sm text-slate-600 mt-2 mb-6">Apakah Anda yakin ingin logout? Anda harus login kembali untuk masuk ke sistem.</p>
                            <div className="flex w-full gap-3">
                                <button onClick={() => setLogoutConfirm(false)} className="flex-1 bg-slate-200 text-slate-700 font-bold py-2 rounded hover:bg-slate-300 transition text-xs shadow-sm">Batal</button>
                                <button onClick={() => { setLogoutConfirm(false); handleLogout(); }} className="flex-1 bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700 transition shadow-sm text-xs">Ya, Logout</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </>
    );
}
