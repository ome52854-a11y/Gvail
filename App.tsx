import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  createAccount, 
  getToken, 
  getMessages, 
  getMessage, 
  deleteAccount, 
  generateRandomAccount, 
  getDomains
} from './services/mailTm';
import { Account, Message, ViewState, ToastNotification } from './types';
import { Button, Icon, ToastContainer, EmptyState, Header, Modal, Input } from './components/Components';
import { ABOUT_TEXT, PRIVACY_TEXT, VISION_TEXT, SOCIAL_LINKS, CONTACT_INFO } from './constants';

// --- Native Ad Component ---
const NativeAd = React.memo(() => {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bannerRef.current) {
      // Check if script is already present to avoid duplicates
      if (bannerRef.current.querySelector('script[src*="b003624bf66c49f5c8ce5bf03c352998"]')) {
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.src = '//pl28205652.effectivegatecpm.com/b003624bf66c49f5c8ce5bf03c352998/invoke.js';
      
      bannerRef.current.appendChild(script);
    }
  }, []);

  return (
    <div id="ad-banner" className="w-full flex justify-center my-4 min-h-[50px]" ref={bannerRef}>
      {/* Adsterra Native Banner */}
      <div id="container-b003624bf66c49f5c8ce5bf03c352998"></div>
    </div>
  );
});

function App() {
  // --- State ---
  const [view, setView] = useState<ViewState>(ViewState.SPLASH);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [account, setAccount] = useState<Account | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [showFollowDropdown, setShowFollowDropdown] = useState(false);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  
  // Custom Email State
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customUsername, setCustomUsername] = useState('');
  const [availableDomain, setAvailableDomain] = useState('');
  
  const pollingRef = useRef<number | null>(null);

  // --- Helpers ---
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ id: Date.now(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const renderEmailContent = (text: string) => {
    if (!text) return "No content.";
    
    // Split text by URLs
    const urlRegex = /((?:https?:\/\/|www\.)[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        // Handle trailing punctuation that shouldn't be part of the link
        const punctMatch = part.match(/^(.+?)([.,;:)\]?]+)$/);
        let urlPart = part;
        let suffix = '';

        if (punctMatch) {
            urlPart = punctMatch[1];
            suffix = punctMatch[2];
        }

        let href = urlPart;
        if (!href.startsWith('http')) href = `https://${href}`;
        
        return (
          <React.Fragment key={i}>
            <a 
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline break-all relative z-20 decoration-2 underline-offset-2"
              onClick={(e) => e.stopPropagation()}
            >
              {urlPart}
            </a>
            {suffix && <span>{suffix}</span>}
          </React.Fragment>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  // --- Effects ---
  
  // Theme & Initialization
  useEffect(() => {
    // Load theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    }

    // Load account
    const savedAccount = localStorage.getItem('gvail_account');
    
    // Splash Screen Timer
    setTimeout(() => {
      if (savedAccount) {
        setAccount(JSON.parse(savedAccount));
        setView(ViewState.HOME);
      } else {
        handleGenerateNewEmail(true); // Auto generate on first visit
      }
    }, 2200); // 2.2s splash

  }, []);

  // Theme Toggle
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Polling for messages
  const fetchMessages = useCallback(async (isAuto = false) => {
    if (!account?.token) return;
    if (!isAuto) setIsRefreshing(true);

    try {
      const msgs = await getMessages(account.token);
      // Determine if there are new messages
      if (isAuto && msgs.length > messages.length) {
        showToast('New email received!', 'success');
      }
      setMessages(msgs);
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED') {
        // Token expired
        showToast('Session expired, generating new email', 'info');
        handleGenerateNewEmail();
      }
    } finally {
      if (!isAuto) setIsRefreshing(false);
    }
  }, [account, messages.length]);

  useEffect(() => {
    if (view === ViewState.HOME && account?.token) {
      // Fetch immediately
      fetchMessages(true);
      // Poll every 10s
      pollingRef.current = window.setInterval(() => fetchMessages(true), 10000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [view, account, fetchMessages]);

  // Fetch domain when opening custom modal
  useEffect(() => {
    if (isCustomModalOpen && !availableDomain) {
      getDomains().then(domains => {
        if (domains.length > 0) setAvailableDomain(domains[0].domain);
      }).catch(() => {});
    }
  }, [isCustomModalOpen]);

  // --- Actions ---

  const handleGenerateNewEmail = async (isInitial = false) => {
    setIsLoading(true);
    try {
      // If existing account, clean up (fire and forget)
      if (account?.token && account?.id) {
        deleteAccount(account.token, account.id).catch(console.error);
      }
      localStorage.removeItem('gvail_account');
      setAccount(null);
      setMessages([]);

      const newAccount = await generateRandomAccount();
      setAccount(newAccount);
      localStorage.setItem('gvail_account', JSON.stringify(newAccount));
      
      if (!isInitial) {
         showToast('New temporary email generated', 'success');
         setView(ViewState.HOME);
      } else {
         setView(ViewState.HOME);
      }
    } catch (error) {
      console.error(error);
      showToast('Failed to generate email. Retrying...', 'error');
      // Retry logic for domain unavailability
      setTimeout(() => handleGenerateNewEmail(isInitial), 2000);
    } finally {
      setIsLoading(false);
      setIsMenuOpen(false);
    }
  };

  const handleCreateCustomEmail = async () => {
    const user = customUsername.trim().toLowerCase();
    
    // 1. Client-side format verification
    if (!user) {
      showToast('Please enter a username', 'error');
      return;
    }
    if (!/^[a-z0-9.]+$/.test(user)) {
      showToast('Only lowercase letters, numbers, and dots allowed', 'error');
      return;
    }

    setIsLoading(true);
    showToast('Verifying availability...', 'info');

    try {
      if (!availableDomain) {
         const domains = await getDomains();
         if (domains.length) setAvailableDomain(domains[0].domain);
         else throw new Error("No domains available");
      }

      const fullAddress = `${user}@${availableDomain}`;
      const password = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

      // 2. Server-side verification (Create)
      // This step acts as verification: if it succeeds, the email is valid and available.
      const acc = await createAccount(fullAddress, password);
      const token = await getToken(fullAddress, password);

      // Clean up old
      if (account?.token && account?.id) {
        deleteAccount(account.token, account.id).catch(() => {});
      }

      const newAccount = { ...acc, password, token };
      setAccount(newAccount);
      localStorage.setItem('gvail_account', JSON.stringify(newAccount));
      setMessages([]);

      // 3. Success Message
      showToast('Email verified and created successfully!', 'success');
      setIsCustomModalOpen(false);
      setCustomUsername('');
      
    } catch (error: any) {
      if (error.message?.includes('422') || error.message?.includes('Unprocessable')) {
         showToast('This username is already taken. Try another.', 'error');
      } else {
         showToast('Verification failed: ' + error.message, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMail = () => {
    if (confirm('Are you sure you want to delete this address?')) {
      handleGenerateNewEmail();
    }
  };

  const handleCopyEmail = () => {
    if (account?.address) {
      navigator.clipboard.writeText(account.address);
      showToast('Address copied to clipboard!', 'success');
    }
  };

  const handleOpenEmail = async (id: string) => {
    if (!account?.token) return;
    // Show local data first
    const msg = messages.find(m => m.id === id);
    if (msg) setSelectedMessage(msg);
    setView(ViewState.EMAIL_DETAIL);

    // Fetch full details (for body)
    setIsLoading(true);
    try {
      const fullMsg = await getMessage(account.token, id);
      setSelectedMessage(fullMsg);
    } catch (e) {
      showToast('Error loading message content', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedMessage(null);
    setView(ViewState.HOME);
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const safeDiff = Math.max(0, diffInSeconds);

    if (safeDiff < 60) return 'Just now';
    if (safeDiff < 3600) return `${Math.floor(safeDiff / 60)} min ago`;
    if (safeDiff < 86400) return `${Math.floor(safeDiff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  // --- Shared Navigation Content ---
  const renderNavItems = () => (
    <>
      <div className="flex-1 overflow-y-auto space-y-2 py-4">
        {[
          { label: 'Home', icon: 'home', view: ViewState.HOME },
          { label: 'About Us', icon: 'info', view: ViewState.ABOUT },
          { label: 'Privacy & Terms', icon: 'shield', view: ViewState.PRIVACY },
          { label: 'Our Vision', icon: 'visibility', view: ViewState.VISION },
          { label: 'Rate Us', icon: 'star', view: ViewState.RATE },
        ].map((item) => (
          <button 
            key={item.label}
            onClick={() => { setView(item.view); setIsMenuOpen(false); }}
            className={`w-full flex items-center gap-4 px-6 py-3 text-left transition-colors ${view === item.view ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border-r-4 border-primary-500' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <Icon name={item.icon} className={view === item.view ? 'text-primary-500' : 'text-slate-400'} />
            <span className={`font-medium ${view === item.view ? 'font-bold' : ''}`}>{item.label}</span>
          </button>
        ))}

        {/* Follow Us Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowFollowDropdown(!showFollowDropdown)}
            className="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-4">
              <Icon name="share" className="text-slate-400" />
              <span className="font-medium">Follow Us</span>
            </div>
            <Icon name={showFollowDropdown ? 'expand_less' : 'expand_more'} />
          </button>
          
          {showFollowDropdown && (
            <div className="pl-16 pr-6 mt-1 space-y-1 animate-slide-up">
              <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener" className="block py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500">Facebook</a>
              <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noopener" className="block py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500">TikTok</a>
              <a href={SOCIAL_LINKS.twitter} target="_blank" rel="noopener" className="block py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500">Twitter (X)</a>
            </div>
          )}
        </div>

        {/* Contact Us Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowContactDropdown(!showContactDropdown)}
            className="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-4">
              <Icon name="support_agent" className="text-slate-400" />
              <span className="font-medium">Contact Us</span>
            </div>
            <Icon name={showContactDropdown ? 'expand_less' : 'expand_more'} />
          </button>
          
          {showContactDropdown && (
            <div className="pl-16 pr-6 mt-1 space-y-1 animate-slide-up">
              <a href={`mailto:${CONTACT_INFO.email}`} className="flex items-center gap-2 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500">
                <Icon name="mail" className="text-sm" /> Email
              </a>
              <a href={CONTACT_INFO.whatsapp} target="_blank" rel="noopener" className="flex items-center gap-2 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-green-500">
                  <span className="material-symbols-outlined text-sm font-bold">chat</span> WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-6 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-center text-slate-400">v1.0.0 • Made with ❤️</p>
      </div>
    </>
  );

  // --- Views ---

  const renderSplashScreen = () => (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-slate-900 transition-colors">
      <div className="flex flex-col items-center animate-fade-in">
        <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/20 mb-6">
          <Icon name="mail" className="text-5xl text-white" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Gvail</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 font-light">Your Gateway to Privacy</p>
        
        <div className="w-64 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 animate-progress rounded-full"></div>
        </div>
      </div>
    </div>
  );

  const renderDrawer = () => (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMenuOpen(false)}
      />
      {/* Sidebar for Mobile */}
      <div className={`fixed inset-y-0 left-0 w-80 bg-white dark:bg-slate-900 z-50 shadow-2xl transform transition-transform duration-300 md:hidden ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 pb-2">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center text-white">
                  <Icon name="mail" />
                </div>
                <span className="text-2xl font-bold dark:text-white">Gvail</span>
             </div>
             <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
               <Icon name={theme === 'light' ? 'dark_mode' : 'light_mode'} />
             </button>
          </div>
          {renderNavItems()}
        </div>
      </div>
    </>
  );

  const renderHome = () => (
    <div className="animate-fade-in">
      <Header onMenuClick={() => setIsMenuOpen(true)} title="Gvail" />
      
      <main className="p-4 md:p-8 max-w-lg md:max-w-5xl mx-auto space-y-6 md:space-y-8">
        <div className="grid md:grid-cols-12 gap-6">
          {/* Main Card */}
          <div className="md:col-span-7 lg:col-span-8 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Icon name="mail" className="text-9xl transform translate-x-4 -translate-y-4" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-2">Current Address</p>
            <div className="flex items-center justify-between gap-2 relative z-10">
              <div className="truncate text-xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
                {account?.address || 'Generating...'}
              </div>
            </div>
            <div className="mt-6 flex flex-col md:flex-row gap-3">
               <Button variant="secondary" onClick={handleCopyEmail} className="flex-1" icon="content_copy">
                 Copy Address
               </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="md:col-span-5 lg:col-span-4">
             <div className="grid grid-cols-3 md:flex md:flex-col gap-2 md:gap-3 md:bg-white md:dark:bg-slate-800 md:p-6 md:rounded-2xl md:border md:border-slate-100 md:dark:border-slate-700 h-full md:justify-center">
                <Button variant="primary" onClick={() => handleGenerateNewEmail()} isLoading={isLoading} icon="autorenew" className="flex-1 w-full px-1 md:px-4 text-xs md:text-sm lg:text-base font-medium whitespace-nowrap overflow-hidden">
                   <span className="inline md:hidden">Change</span>
                   <span className="hidden md:inline">Change Mail</span>
                </Button>
                <Button variant="secondary" onClick={() => setIsCustomModalOpen(true)} icon="edit" className="flex-1 w-full px-1 md:px-4 text-xs md:text-sm lg:text-base font-medium whitespace-nowrap overflow-hidden">
                   <span className="inline md:hidden">Edit</span>
                   <span className="hidden md:inline">Customize</span>
                </Button>
                <Button variant="danger" onClick={handleDeleteMail} icon="delete" className="flex-1 w-full px-1 md:px-4 text-xs md:text-sm lg:text-base font-medium whitespace-nowrap overflow-hidden">
                   <span className="inline md:hidden">Delete</span>
                   <span className="hidden md:inline">Delete Mail</span>
                </Button>
             </div>
          </div>
        </div>

        {/* Native Ad Banner */}
        <NativeAd />

        {/* Inbox Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
             <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
               <Icon name="inbox" className="text-primary-500" /> Inbox
               {messages.length > 0 && <span className="bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs px-2.5 py-0.5 rounded-full font-bold">{messages.length}</span>}
             </h2>
             <button 
              onClick={() => fetchMessages()} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all ${isRefreshing ? 'text-primary-500' : ''}`}
             >
               <Icon name="refresh" className={`text-xl ${isRefreshing ? 'animate-spin' : ''}`} />
               <span className="text-sm font-medium hidden md:inline">Refresh</span>
             </button>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {messages.length === 0 ? (
              <EmptyState message="Your inbox is empty - Waiting for incoming emails..." />
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id}
                  onClick={() => handleOpenEmail(msg.id)}
                  className={`group relative p-4 rounded-2xl border transition-all cursor-pointer
                    ${!msg.seen 
                      ? 'bg-white dark:bg-slate-800 border-primary-200 dark:border-primary-900 shadow-md shadow-primary-500/5' 
                      : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:shadow-md'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors
                        ${!msg.seen 
                          ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/20' 
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {(msg.from.name || msg.from.address).charAt(0).toUpperCase()}
                      </div>
                      
                      {/* Sender Info */}
                      <div className="flex flex-col min-w-0">
                        <span className={`truncate text-sm md:text-base ${!msg.seen ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-200 font-medium'}`}>
                          {msg.from.name || msg.from.address.split('@')[0]}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                          {msg.from.address}
                        </span>
                      </div>
                    </div>

                    {/* Time */}
                    <span className={`text-xs whitespace-nowrap flex-shrink-0 mt-1 ${!msg.seen ? 'text-primary-600 dark:text-primary-400 font-bold' : 'text-slate-400'}`}>
                      {formatRelativeTime(msg.createdAt)}
                    </span>
                  </div>

                  {/* Subject & Preview */}
                  <div className="pl-[52px]">
                    <h3 className={`text-sm md:text-base mb-1 truncate ${!msg.seen ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                      {msg.subject || '(No Subject)'}
                    </h3>
                    <div className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed break-words relative z-10">
                      {renderEmailContent(msg.intro)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Custom Email Modal */}
      <Modal 
        isOpen={isCustomModalOpen} 
        onClose={() => setIsCustomModalOpen(false)} 
        title="Customize Address"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
             Enter a custom username. We'll verify if it's available and create it for you.
          </p>
          <div className="relative">
             <Input 
               placeholder="username" 
               value={customUsername}
               onChange={(e) => setCustomUsername(e.target.value.toLowerCase().trim())}
               autoFocus
               maxLength={30}
             />
             <div className="absolute right-4 top-3.5 text-slate-400 pointer-events-none select-none">
               @{availableDomain || '...'}
             </div>
          </div>
          <Button 
            onClick={handleCreateCustomEmail} 
            isLoading={isLoading} 
            disabled={!customUsername}
          >
            Verify & Create
          </Button>
        </div>
      </Modal>
    </div>
  );

  const renderEmailDetail = () => {
    if (!selectedMessage) return null;
    return (
      <div className="bg-white dark:bg-slate-900 animate-slide-up h-full flex flex-col">
        <header className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 p-4 flex items-center gap-4 z-20">
          <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Icon name="arrow_back" />
          </button>
          <h1 className="font-bold text-lg truncate flex-1">{selectedMessage.subject}</h1>
          <button onClick={() => {
              showToast('Message deleted locally', 'success');
              setMessages(prev => prev.filter(m => m.id !== selectedMessage.id));
              handleBack();
           }} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-full" title="Delete Message">
             <Icon name="delete" />
          </button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
           <div className="max-w-3xl mx-auto">
             {/* Sender Info */}
             <div className="flex items-center gap-4 mb-8">
               <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold uppercase shadow-lg shadow-primary-500/20">
                 {(selectedMessage.from.name || selectedMessage.from.address).charAt(0)}
               </div>
               <div className="flex-1 overflow-hidden">
                 <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">
                   {selectedMessage.from.name || 'Unknown Sender'}
                 </h3>
                 <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 text-sm text-slate-500 dark:text-slate-400">
                   <span className="truncate">{selectedMessage.from.address}</span>
                   <span className="hidden md:inline">•</span>
                   <span>{new Date(selectedMessage.createdAt).toLocaleString()}</span>
                 </div>
               </div>
             </div>

             {/* Body */}
             <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 md:p-8 min-h-[400px] shadow-inner text-slate-800 dark:text-slate-200 break-words whitespace-pre-wrap text-base leading-relaxed">
               {isLoading ? (
                 <div className="flex items-center justify-center h-40">
                   <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
                 </div>
               ) : (
                 renderEmailContent(selectedMessage.text || selectedMessage.intro || "No content.")
               )}
             </div>
           </div>
        </div>
      </div>
    );
  };

  const renderInfoPage = (title: string, content: string) => (
    <div className="bg-gray-50 dark:bg-slate-900 animate-fade-in h-full flex flex-col">
      <Header 
        title={title} 
        onMenuClick={() => setIsMenuOpen(true)}
        rightAction={<button onClick={() => setView(ViewState.HOME)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><Icon name="close" /></button>}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
          <div className="prose dark:prose-invert prose-slate max-w-none whitespace-pre-wrap font-light">
            <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderRateUs = () => (
    <div className="bg-gray-50 dark:bg-slate-900 animate-fade-in h-full flex flex-col">
       <Header 
        title="Rate Us" 
        onMenuClick={() => setIsMenuOpen(true)}
        rightAction={<button onClick={() => setView(ViewState.HOME)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><Icon name="close" /></button>}
      />
      <div className="flex-1 flex flex-col items-center justify-center p-6">
         <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
            <h2 className="text-2xl font-bold mb-2">Enjoying Gvail?</h2>
            <p className="text-slate-500 mb-6">Tap a star to rate it on the App Store.</p>
            <div className="flex justify-center gap-2 mb-8">
              {[1,2,3,4,5].map(star => (
                <button key={star} className="text-4xl text-yellow-400 hover:scale-110 transition-transform focus:outline-none" onClick={() => showToast(`You rated ${star} stars. Thanks!`, 'success')}>
                  ★
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400">Your feedback helps us improve.</p>
         </div>
      </div>
    </div>
  );

  // --- Main Render ---

  if (view === ViewState.SPLASH) return renderSplashScreen();

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
        <div className="p-6 pb-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
                <Icon name="mail" />
              </div>
              <span className="text-2xl font-bold dark:text-white tracking-tight">Gvail</span>
            </div>
            
            {/* Theme Toggle in Sidebar for Desktop */}
            <button 
              onClick={toggleTheme} 
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors mb-2"
            >
              <Icon name="dark_mode" />
              <span className="text-sm font-medium">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
        </div>
        {renderNavItems()}
      </aside>

      {/* Mobile Drawer */}
      {renderDrawer()}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto relative h-screen scroll-smooth">
        {view === ViewState.HOME && renderHome()}
        {view === ViewState.EMAIL_DETAIL && renderEmailDetail()}
        {view === ViewState.ABOUT && renderInfoPage('About Us', ABOUT_TEXT)}
        {view === ViewState.PRIVACY && renderInfoPage('Privacy & Terms', PRIVACY_TEXT)}
        {view === ViewState.VISION && renderInfoPage('Our Vision', VISION_TEXT)}
        {view === ViewState.RATE && renderRateUs()}
      </main>

      {/* Floating Elements */}
      <ToastContainer 
        show={!!toast} 
        message={toast?.message || ''} 
        type={toast?.type || 'info'} 
      />
    </div>
  );
}

export default App;