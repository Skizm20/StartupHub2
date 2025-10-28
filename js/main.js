// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC5-9dX0s4hsQc2PkDPu1g1A-VI6qp6FB8",
  authDomain: "startuphub-b5a31.firebaseapp.com",
  projectId: "startuphub-b5a31",
  storageBucket: "startuphub-b5a31.firebasestorage.app",
  messagingSenderId: "654647702057",
  appId: "1:654647702057:web:22e6a3424cbf847b466238",
  measurementId: "G-SN77QMWGGT"
};

// --- Initialize Firebase BEFORE DOM loads for instant auth check ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- CURRENCY SYSTEM ---
const CURRENCIES = {
    'DZD': { symbol: 'DA', name: 'Algerian Dinar', rate: 135.0 }, // Default: 1 USD = 135 DA
    'USD': { symbol: '$', name: 'US Dollar', rate: 1.0 },
    'EUR': { symbol: '€', name: 'Euro', rate: 0.92 },
    'GBP': { symbol: '£', name: 'British Pound', rate: 0.79 },
    'MAD': { symbol: 'MAD', name: 'Moroccan Dirham', rate: 10.0 },
    'TND': { symbol: 'TND', name: 'Tunisian Dinar', rate: 3.1 },
    'EGP': { symbol: 'EGP', name: 'Egyptian Pound', rate: 31.0 },
    'SAR': { symbol: 'SAR', name: 'Saudi Riyal', rate: 3.75 },
    'AED': { symbol: 'AED', name: 'UAE Dirham', rate: 3.67 },
    'CAD': { symbol: 'C$', name: 'Canadian Dollar', rate: 1.36 },
    'JPY': { symbol: '¥', name: 'Japanese Yen', rate: 149.0 },
    'CNY': { symbol: '¥', name: 'Chinese Yuan', rate: 7.24 },
    'INR': { symbol: '₹', name: 'Indian Rupee', rate: 83.0 }
};

// Country to currency mapping (based on ISO country codes)
const COUNTRY_CURRENCY_MAP = {
    'DZ': 'DZD', 'US': 'USD', 'GB': 'GBP', 'EU': 'EUR',
    'FR': 'EUR', 'DE': 'EUR', 'IT': 'EUR', 'ES': 'EUR',
    'MA': 'MAD', 'TN': 'TND', 'EG': 'EGP', 'SA': 'SAR',
    'AE': 'AED', 'CA': 'CAD', 'JP': 'JPY', 'CN': 'CNY',
    'IN': 'INR'
};

let currentCurrency = 'DZD'; // Default to Algerian Dinar

// Format currency
function formatCurrency(amount, currencyCode = currentCurrency) {
    if (!amount || isNaN(amount)) return 'N/A';
    
    const currency = CURRENCIES[currencyCode] || CURRENCIES['DZD'];
    const convertedAmount = amount * currency.rate;
    
    // Format with proper thousands separator
    const formatted = Math.round(convertedAmount).toLocaleString();
    
    // Put symbol after amount for DA, before for others
    if (currencyCode === 'DZD') {
        return `${formatted} ${currency.symbol}`;
    } else {
        return `${currency.symbol}${formatted}`;
    }
}

// Detect user's country from IP
async function detectUserCountry() {
    try {
        // Use ipapi.co for geolocation (free, no API key needed)
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        if (data.country_code) {
            const detectedCurrency = COUNTRY_CURRENCY_MAP[data.country_code] || 'DZD';
            console.log(`Detected country: ${data.country_name} (${data.country_code}), Currency: ${detectedCurrency}`);
            return detectedCurrency;
        }
    } catch (error) {
        console.log('Could not detect country, using default currency (DZD):', error);
    }
    return 'DZD';
}

// Load saved currency or detect from IP
async function initializeCurrency() {
    const savedCurrency = localStorage.getItem('preferredCurrency');
    
    if (savedCurrency && CURRENCIES[savedCurrency]) {
        currentCurrency = savedCurrency;
        console.log('Using saved currency:', currentCurrency);
    } else {
        // Detect from IP on first visit
        currentCurrency = await detectUserCountry();
        localStorage.setItem('preferredCurrency', currentCurrency);
        console.log('Detected and saved currency:', currentCurrency);
    }
    
    // Update UI if currency selector exists
    updateCurrencySelector();
}

// Update currency selector dropdown
function updateCurrencySelector() {
    const currencySelect = document.getElementById('currency-selector');
    if (currencySelect) {
        currencySelect.value = currentCurrency;
    }
}

// Refresh all prices on the page after currency change
// This will be called after DOMContentLoaded, so functions will be defined
let refreshAllPrices = () => {
    console.log('refreshAllPrices called but not initialized yet');
};

// Initialize currency on load
initializeCurrency();

// --- INSTANT AUTH STATE CHECK from cache ---
// Check if user is logged in from Firebase's cached state (synchronous, instant)
// This provides immediate feedback without waiting for network
const cachedUser = auth.currentUser;
const authStateFromStorage = localStorage.getItem('lastAuthState');

if (cachedUser || authStateFromStorage === 'signed-in') {
    document.body.classList.add('signed-in');
    console.log('Cached user detected, showing authed nav instantly');
} else {
    document.body.classList.add('user-guest');
    console.log('No cached user, showing guest nav instantly');
}

// Set auth-ready immediately if we have cached data (reduces perceived lag)
if (authStateFromStorage) {
    document.body.classList.add('auth-ready');
    console.log('Using cached auth state for instant render');
}

document.addEventListener('DOMContentLoaded', () => {

    let currentUser = null; // This will hold the logged-in user's data
    
    // --- CURRENCY SELECTOR EVENT LISTENER ---
    const currencySelector = document.getElementById('currency-selector');
    if (currencySelector) {
        currencySelector.addEventListener('change', (e) => {
            currentCurrency = e.target.value;
            localStorage.setItem('preferredCurrency', currentCurrency);
            console.log('Currency changed to:', currentCurrency);
            
            // Reload current page's prices
            refreshAllPrices();
        });
    }

    // --- Listener Management for Performance ---
    let unsubscribeProjectsListener = null;
    let unsubscribeFounderMessagesListener = null;
    let unsubscribeInvestorMessagesListener = null;
    let unsubscribeFounderOffersListener = null;
    let unsubscribeInvestorOffersListener = null;

    // --- Element Selectors (ALL of them) ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const systemSetting = window.matchMedia('(prefers-color-scheme: dark)');

    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');

    const logoutBtn = document.getElementById('logout-btn');

    // Project Modal
    const projectModalOverlay = document.getElementById('project-modal-overlay');
    const showProjectModalBtn = document.getElementById('show-project-modal-btn');
    const closeProjectModalBtn = document.getElementById('close-project-modal-btn');
    const createProjectForm = document.getElementById('create-project-form');
    const projectError = document.getElementById('project-error');

    // Edit Project Modal
    const editProjectModalOverlay = document.getElementById('edit-project-modal-overlay');
    const editProjectForm = document.getElementById('edit-project-form');
    const editProjectError = document.getElementById('edit-project-error');
    const closeEditProjectModalBtn = document.getElementById('close-edit-project-modal-btn');

    // Message Modals
    const messageModalOverlay = document.getElementById('message-modal-overlay');
    const sendMessageForm = document.getElementById('send-message-form');
    const messageError = document.getElementById('message-error');
    const closeMessageModalBtn = document.getElementById('close-message-modal-btn');
    const messageFounderBtn = document.getElementById('message-founder-btn');

    // Investment Modal
    const investmentModalOverlay = document.getElementById('investment-modal-overlay');
    const investmentOfferForm = document.getElementById('investment-offer-form');
    const investmentError = document.getElementById('investment-error');
    const closeInvestmentModalBtn = document.getElementById('close-investment-modal-btn');
    const makeOfferBtn = document.getElementById('make-offer-btn');

    // Reply Modal
    const replyModalOverlay = document.getElementById('reply-modal-overlay');
    const replyMessageForm = document.getElementById('reply-message-form');
    const replyError = document.getElementById('reply-error');
    const closeReplyModalBtn = document.getElementById('close-reply-modal-btn');

    // Message Containers
    const founderMessagesContainer = document.getElementById('founder-messages-container');
    const investorMessagesContainer = document.getElementById('investor-messages-container');

    // Offers Containers
    const founderOffersContainer = document.getElementById('founder-offers-container');
    const investorOffersContainer = document.getElementById('investor-offers-container');

    // Watchlist Container
    const watchlistContainer = document.getElementById('watchlist-container');

    // Counter Offer Modal
    const counterOfferModalOverlay = document.getElementById('counter-offer-modal-overlay');
    const counterOfferForm = document.getElementById('counter-offer-form');
    const counterOfferError = document.getElementById('counter-offer-error');
    const closeCounterOfferModalBtn = document.getElementById('close-counter-offer-modal-btn');

    // Settings Elements
    const profileSettingsForm = document.getElementById('profile-settings-form');
    const passwordChangeForm = document.getElementById('password-change-form');
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    const settingsSuccess = document.getElementById('settings-success');
    const settingsError = document.getElementById('settings-error');
    const passwordSuccess = document.getElementById('password-success');
    const passwordError = document.getElementById('password-error');

    // Analytics Container
    const analyticsContainer = document.getElementById('analytics-container');

    // Dashboard
    const sidebarNavLinks = document.querySelectorAll('.sidebar-nav .nav-link, .profile-dropdown .nav-link');
    const dashboardPages = document.querySelectorAll('.dashboard-page-content');
    const projectListContainer = document.getElementById('project-list-container');
    const profileTriggerArea = document.getElementById('profile-trigger-area');
    const profileDropdown = document.getElementById('profile-dropdown');
    const dropdownLogoutBtn = document.getElementById('dropdown-logout-btn');

    // Header
    const headerProfileTrigger = document.getElementById('header-profile-trigger');
    const headerProfileDropdown = document.getElementById('header-profile-dropdown');
    const headerDropdownLogoutBtn = document.getElementById('header-dropdown-logout-btn');

    // Startup Detail Page
    const startupTitle = document.getElementById('startup-title');
    const startupMission = document.getElementById('startup-mission');
    const startupLogo = document.getElementById('startup-logo');
    const startupDesc = document.getElementById('startup-description');
    const startupFounder = document.getElementById('startup-founder-name');
    const startupGoal = document.getElementById('startup-funding-goal');
    const startupShare = document.getElementById('startup-profit-share');
    const startupHeaderLoading = document.getElementById('startup-header-loading');
    const startupHeaderLoaded = document.getElementById('startup-header-loaded');
    const startupActions = document.getElementById('startup-actions');
    const addToWatchlistBtn = document.getElementById('add-to-watchlist-btn');

    // Explore Page
    const exploreProjectGrid = document.getElementById('explore-project-grid');

    // Logo element
    const logoLink = document.querySelector('.logo');
    
    // Category dropdown elements
    const projectCategorySelect = document.getElementById('project-category');
    const projectCategoryOtherGroup = document.getElementById('project-category-other-group');
    const projectCategoryOtherInput = document.getElementById('project-category-other');
    const editProjectCategorySelect = document.getElementById('edit-project-category');
    const editProjectCategoryOtherGroup = document.getElementById('edit-project-category-other-group');
    const editProjectCategoryOtherInput = document.getElementById('edit-project-category-other');


    // ---
    // HELPER: Update Logo Link based on Auth State
    // ---
    const updateLogoLink = (isLoggedIn) => {
        if (logoLink) {
            logoLink.href = isLoggedIn ? 'explore.html' : 'index.html';
        }
    };

    // ---
    // 1. THEME LOGIC
    // ---
    const applyTheme = (theme) => {
        if (theme === 'dark') { document.documentElement.setAttribute('data-theme', 'dark'); }
        else { document.documentElement.setAttribute('data-theme', 'light'); }
    };
    let savedTheme = localStorage.getItem('theme');
    if (!savedTheme) { savedTheme = systemSetting.matches ? 'dark' : 'light'; }
    applyTheme(savedTheme);
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    // ---
    // 1.5 CATEGORY DROPDOWN LOGIC
    // ---
    // Handle "Other" category selection for Create Project form
    if (projectCategorySelect && projectCategoryOtherGroup) {
        projectCategorySelect.addEventListener('change', (e) => {
            if (e.target.value === 'Other') {
                projectCategoryOtherGroup.style.display = 'block';
                projectCategoryOtherInput.required = true;
            } else {
                projectCategoryOtherGroup.style.display = 'none';
                projectCategoryOtherInput.required = false;
                projectCategoryOtherInput.value = ''; // Clear the field
            }
        });
    }

    // Handle "Other" category selection for Edit Project form
    if (editProjectCategorySelect && editProjectCategoryOtherGroup) {
        editProjectCategorySelect.addEventListener('change', (e) => {
            if (e.target.value === 'Other') {
                editProjectCategoryOtherGroup.style.display = 'block';
                editProjectCategoryOtherInput.required = true;
            } else {
                editProjectCategoryOtherGroup.style.display = 'none';
                editProjectCategoryOtherInput.required = false;
                editProjectCategoryOtherInput.value = ''; // Clear the field
            }
        });
    }

    // ---
    // 2. AUTHENTICATION STATE LOGIC
    // ---
    const setLoggedInState = (user, userData) => {
        console.log('setLoggedInState called. User:', user, 'UserData:', userData);
        currentUser = { ...user, ...userData }; // Store combined auth and firestore data
        document.body.classList.remove('user-guest');
        document.body.classList.add('signed-in', 'auth-ready');
        
        // Save auth state to localStorage for instant next page load
        localStorage.setItem('lastAuthState', 'signed-in');
        
        // Update logo link to point to explore page
        updateLogoLink(true);

        if (userData) {
            document.body.classList.add('role-' + userData.role);

            // Update Avatars, Name, and Role
            const userNameEl = document.getElementById('sidebar-user-name');
            const userRoleEl = document.getElementById('sidebar-user-role');
            const sidebarAvatarInitialsEl = document.getElementById('sidebar-avatar-initials');
            const headerAvatarInitialsEl = document.getElementById('header-avatar-initials');

            if (userNameEl) userNameEl.textContent = userData.name;
            if (userRoleEl) userRoleEl.textContent = userData.role.charAt(0).toUpperCase() + userData.role.slice(1);

            if (userData.name) {
                const initials = userData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                if (sidebarAvatarInitialsEl) sidebarAvatarInitialsEl.textContent = initials;
                if (headerAvatarInitialsEl) headerAvatarInitialsEl.textContent = initials;
            }

            // Enable/Disable Create Project Button based on role
            if (showProjectModalBtn) {
                if (userData.role === 'founder') {
                    showProjectModalBtn.disabled = false;
                    console.log('Create Project button ENABLED.');
                } else {
                    showProjectModalBtn.disabled = true;
                    console.log('Create Project button kept DISABLED (not founder).');
                }
            }

            // Load user notifications (for all roles)
            loadUserNotifications(user.uid);
            
            // Load relevant data based on role
            if (userData.role === 'founder') {
                loadFounderProjects(user.uid);
                loadMessagesForUser(user.uid, 'founder');
                loadFounderAnalytics(user.uid);
                loadFounderOffers(user.uid);
                if (startupActions) { startupActions.style.display = 'none'; } // Hide investor actions
                if (makeOfferBtn) { makeOfferBtn.style.display = 'none'; } // Hide investment button
            } else if (userData.role === 'investor') {
                loadMessagesForUser(user.uid, 'investor');
                loadInvestorOffers(user.uid);
                loadWatchlist(user.uid);
                
                // Update startup page buttons if on startup page
                if (startupPageProjectId && startupTitle) {
                    // Get the project title from the page
                    db.collection('projects').doc(startupPageProjectId).get()
                        .then((doc) => {
                            if (doc.exists) {
                                updateStartupPageButtons(startupPageProjectId, doc.data().title);
                            }
                        })
                        .catch((error) => {
                            console.error('Error loading project for button update:', error);
                        });
                }
            }

            // Load settings data
            loadSettingsData(userData);
        } else {
             console.warn('setLoggedInState: UserData from Firestore is missing!');
             if (showProjectModalBtn) {
                 showProjectModalBtn.disabled = true; // Keep disabled if data is missing
                 console.log('Create Project button kept DISABLED (missing UserData).');
             }
        }

        // Redirect after login/signup
        if (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('signup.html')) {
            window.location.href = 'dashboard.html';
        }
    };

    const setLoggedOutState = () => {
        console.log('setLoggedOutState called.');
        currentUser = null;
        document.body.classList.remove('signed-in', 'role-founder', 'role-investor');
        document.body.classList.add('user-guest', 'auth-ready');
        
        // Save auth state to localStorage for instant next page load
        localStorage.setItem('lastAuthState', 'logged-out');
        
        // Update logo link to point to home page
        updateLogoLink(false);

        // Disable Create Project Button on logout
        if (showProjectModalBtn) {
            showProjectModalBtn.disabled = true;
            console.log('Create Project button DISABLED on logout.');
        }

        // Hide investor actions if logged out
        if (startupActions) {
            startupActions.style.display = 'none';
        }

        // Redirect if logged out from dashboard
        if (window.location.pathname.endsWith('dashboard.html')) {
             window.location.href = 'index.html';
        }
    };


    // ---
    // 3. FIREBASE AUTH LOGIC
    // ---
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const role = document.querySelector('input[name="role"]:checked').value;

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    const userData = { name: name, email: email, role: role };
                    if (role === 'founder') { userData.projectCount = 0; }
                    // Save user data to Firestore
                    return db.collection('users').doc(user.uid).set(userData);
                })
                .then(() => console.log('User created and data saved!'))
                .catch((error) => { signupError.textContent = error.message; signupError.style.display = 'block'; });
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => console.log('User logged in!'))
                .catch((error) => { loginError.textContent = error.message; loginError.style.display = 'block'; });
        });
    }

    // --- Handle ALL Log Out Buttons ---
    const handleLogout = (e) => {
        e.preventDefault();
        auth.signOut().then(() => console.log('User signed out.'));
    };
    if (logoutBtn) { logoutBtn.addEventListener('click', handleLogout); }
    if (dropdownLogoutBtn) { dropdownLogoutBtn.addEventListener('click', handleLogout); }
    if (headerDropdownLogoutBtn) { headerDropdownLogoutBtn.addEventListener('click', handleLogout); }

    // ---
    // 4. CHECK AUTH STATE (Main Auth Listener)
    // ---
    auth.onAuthStateChanged((user) => {
        console.log('Auth state changed. User:', user); // Log auth state change
        if (user) {
            // User is signed in via Auth, now get Firestore data
            db.collection('users').doc(user.uid).get()
                .then((doc) => {
                    if (doc.exists) {
                        console.log('Firestore data found for user:', doc.data());
                        setLoggedInState(user, doc.data()); // Call with both auth user and firestore data
                    } else {
                        // User exists in Auth, but no data in Firestore (should not happen with signup logic)
                        console.error('CRITICAL: No user data found in Firestore for logged-in user!', user.uid);
                        setLoggedInState(user, null); // Log them in but indicate data issue
                    }
                })
                .catch((error) => {
                    console.error("Error getting user data from Firestore:", error);
                    setLoggedInState(user, null); // Log them in but indicate data issue
                });
        } else {
            // User is signed out
            setLoggedOutState();
        }
    });

    // ---
    // 5. PROJECT MODAL LOGIC (Listener is OUTSIDE onAuthStateChanged)
    // ---
    if (showProjectModalBtn) {
        showProjectModalBtn.addEventListener('click', () => {
            if (currentUser && typeof currentUser.projectCount !== 'undefined') {
                const slotsRemaining = 5 - currentUser.projectCount;
                document.getElementById('project-slots-remaining').textContent = slotsRemaining;
                if (slotsRemaining > 0) {
                     projectModalOverlay.classList.add('active');
                     projectError.style.display = 'none'; // Clear errors when opening
                } else {
                     alert('You have reached your 5 project limit.');
                }
            } else {
                // Should not happen if button enabling works, but handle anyway
                 console.warn("Trying to open project modal but user data isn't fully ready.");
                 // Optionally show a message or just open it
                 projectModalOverlay.classList.add('active');
                 projectError.style.display = 'none';
            }
        });
    }
    if (closeProjectModalBtn) {
        closeProjectModalBtn.addEventListener('click', () => { 
            projectModalOverlay.classList.remove('active');
            // Reset the "Other" category field
            if (projectCategoryOtherGroup) {
                projectCategoryOtherGroup.style.display = 'none';
                projectCategoryOtherInput.value = '';
                projectCategoryOtherInput.required = false;
            }
        });
    }
    if (projectModalOverlay) {
        projectModalOverlay.addEventListener('click', (e) => {
            if (e.target === projectModalOverlay) { projectModalOverlay.classList.remove('active'); }
        });
    }

    // Submit Listener for Create Project Form
    if (createProjectForm) {
        createProjectForm.addEventListener('submit', (e) => {
            e.preventDefault();
            projectError.style.display = 'none'; // Clear previous errors

            console.log('Save Project button clicked. Current user state:', currentUser); // DEBUG LOG

            // --- CRITICAL CHECK - IMPROVED ---
            // Get the actual Firebase auth user
            const authUser = auth.currentUser;
            if (!authUser || !currentUser || !currentUser.name) {
                projectError.textContent = 'Error: User authentication not ready. Please wait a moment and try again.';
                projectError.style.display = 'block';
                console.error('Save Project aborted: User not ready.', { authUser, currentUser });
                return;
            }
            // --- END CRITICAL CHECK ---

            // Check project limit
            // Use || 0 in case projectCount is missing (though it shouldn't be for founders)
            if ((currentUser.projectCount || 0) >= 5) {
                projectError.textContent = 'You have reached your 5 project limit.';
                projectError.style.display = 'block';
                return;
            }

            // Create the project object - Use authUser for uid, currentUser for name
            const categoryValue = document.getElementById('project-category').value;
            const finalCategory = categoryValue === 'Other' 
                ? document.getElementById('project-category-other').value 
                : categoryValue;
            
            const newProject = {
                title: document.getElementById('project-title').value,
                category: finalCategory,
                mission: document.getElementById('project-description').value,
                fundingGoal: parseInt(document.getElementById('project-goal').value),
                profitShare: parseInt(document.getElementById('project-share').value),
                founderId: authUser.uid, // Use auth user for ID (always available)
                founderName: currentUser.name, // Use Firestore data for name
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            console.log('Attempting to save project:', newProject); // For debugging

            // Validate numbers (basic check)
             if (isNaN(newProject.fundingGoal) || isNaN(newProject.profitShare)) {
                 projectError.textContent = 'Funding Goal and Profit Share must be valid numbers.';
                 projectError.style.display = 'block';
                 return;
             }

            // Save to Firestore
            db.collection('projects').add(newProject)
                .then((docRef) => {
                    console.log('Project added with ID:', docRef.id);
                    // Update user's project count
                    const userRef = db.collection('users').doc(authUser.uid);
                    return userRef.update({
                        projectCount: firebase.firestore.FieldValue.increment(1)
                    });
                })
                .then(() => {
                    console.log('User project count updated.');
                    projectModalOverlay.classList.remove('active');
                    createProjectForm.reset();
                    // Update local currentUser immediately for UI consistency
                    if (currentUser) {
                        currentUser.projectCount = (currentUser.projectCount || 0) + 1;
                    }
                })
                .catch((error) => {
                    console.error('Error during project creation or count update:', error);
                    projectError.textContent = `Error: ${error.message}`; // Show specific Firebase error
                    projectError.style.display = 'block';
                });
        });
    }

    // --- EDIT PROJECT MODAL FUNCTIONALITY ---

    // Function to open edit modal with project data
    function openEditProjectModal(projectId) {
        // Get project data from Firestore
        db.collection('projects').doc(projectId).get()
            .then((doc) => {
                if (doc.exists) {
                    const project = doc.data();
                    
                    // Fill form with existing data
                    document.getElementById('edit-project-id').value = projectId;
                    document.getElementById('edit-project-title').value = project.title || '';
                    document.getElementById('edit-project-description').value = project.mission || '';
                    document.getElementById('edit-project-goal').value = project.fundingGoal || '';
                    document.getElementById('edit-project-share').value = project.profitShare || '';
                    
                    // Handle category - check if it's a predefined option or custom
                    const categorySelect = document.getElementById('edit-project-category');
                    const categoryOtherGroup = document.getElementById('edit-project-category-other-group');
                    const categoryOtherInput = document.getElementById('edit-project-category-other');
                    const projectCategory = project.category || '';
                    
                    // Check if the category exists in the dropdown options
                    const optionExists = Array.from(categorySelect.options).some(
                        option => option.value === projectCategory
                    );
                    
                    if (optionExists) {
                        // It's a predefined category
                        categorySelect.value = projectCategory;
                        categoryOtherGroup.style.display = 'none';
                        categoryOtherInput.required = false;
                    } else {
                        // It's a custom category
                        categorySelect.value = 'Other';
                        categoryOtherInput.value = projectCategory;
                        categoryOtherGroup.style.display = 'block';
                        categoryOtherInput.required = true;
                    }
                    
                    // Show modal
                    editProjectModalOverlay.classList.add('active');
                    editProjectError.style.display = 'none';
                }
            })
            .catch((error) => {
                console.error('Error loading project for editing:', error);
                alert('Error loading project data');
            });
    }

    // Edit form submission
    if (editProjectForm) {
        editProjectForm.addEventListener('submit', (e) => {
            e.preventDefault();
            editProjectError.style.display = 'none';

            const projectId = document.getElementById('edit-project-id').value;
            const authUser = auth.currentUser;

            if (!authUser || !projectId) {
                editProjectError.textContent = 'Error: Authentication failed.';
                editProjectError.style.display = 'block';
                return;
            }

            const editCategoryValue = document.getElementById('edit-project-category').value;
            const editFinalCategory = editCategoryValue === 'Other' 
                ? document.getElementById('edit-project-category-other').value 
                : editCategoryValue;

            const updatedProject = {
                title: document.getElementById('edit-project-title').value,
                category: editFinalCategory,
                mission: document.getElementById('edit-project-description').value,
                fundingGoal: parseInt(document.getElementById('edit-project-goal').value),
                profitShare: parseInt(document.getElementById('edit-project-share').value),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Validate numbers
            if (isNaN(updatedProject.fundingGoal) || isNaN(updatedProject.profitShare)) {
                editProjectError.textContent = 'Funding Goal and Profit Share must be valid numbers.';
                editProjectError.style.display = 'block';
                return;
            }

            // Update project in Firestore
            db.collection('projects').doc(projectId).update(updatedProject)
                .then(() => {
                    console.log('Project updated successfully');
                    editProjectModalOverlay.classList.remove('active');
                    editProjectForm.reset();
                    
                    // The real-time listener will automatically update the UI
                })
                .catch((error) => {
                    console.error('Error updating project:', error);
                    editProjectError.textContent = `Error: ${error.message}`;
                    editProjectError.style.display = 'block';
                });
        });
    }

    // Close edit modal
    if (closeEditProjectModalBtn) {
        closeEditProjectModalBtn.addEventListener('click', () => {
            editProjectModalOverlay.classList.remove('active');
            // Reset the "Other" category field
            if (editProjectCategoryOtherGroup) {
                editProjectCategoryOtherGroup.style.display = 'none';
                editProjectCategoryOtherInput.value = '';
                editProjectCategoryOtherInput.required = false;
            }
        });
    }

    if (editProjectModalOverlay) {
        editProjectModalOverlay.addEventListener('click', (e) => {
            if (e.target === editProjectModalOverlay) {
                editProjectModalOverlay.classList.remove('active');
            }
        });
    }

    // --- DELETE PROJECT FUNCTIONALITY ---

    function deleteProject(projectId) {
        if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            return;
        }

        const authUser = auth.currentUser;
        if (!authUser) {
            alert('Authentication failed. Please log in again.');
            return;
        }

        // Delete project from Firestore
        db.collection('projects').doc(projectId).delete()
            .then(() => {
                console.log('Project deleted successfully');
                
                // Decrement project count in user document
                const userRef = db.collection('users').doc(authUser.uid);
                return userRef.update({
                    projectCount: firebase.firestore.FieldValue.increment(-1)
                });
            })
            .then(() => {
                console.log('User project count updated');
                // The real-time listener will automatically update the UI
            })
            .catch((error) => {
                console.error('Error deleting project:', error);
                alert('Error deleting project: ' + error.message);
            });
    }

    // --- EVENT LISTENERS FOR EDIT/DELETE BUTTONS ---

    // Function to attach event listeners to project action buttons
    // Use event delegation for better performance - single listener instead of many
    let projectListDelegationInitialized = false;
    function attachProjectActionListeners() {
        if (projectListDelegationInitialized || !projectListContainer) return;
        
        projectListContainer.addEventListener('click', (e) => {
            // Edit button click
            if (e.target.classList.contains('btn-edit-project')) {
                e.preventDefault();
                const projectId = e.target.getAttribute('data-id');
                openEditProjectModal(projectId);
            }

            // Delete button click
            if (e.target.classList.contains('btn-delete-project')) {
                e.preventDefault();
                const projectId = e.target.getAttribute('data-id');
                deleteProject(projectId);
            }
            });
        
        projectListDelegationInitialized = true;
    }

    // ---
    // 6. DASHBOARD NAVIGATION LOGIC
    // ---
    sidebarNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            if (!targetId) return; // Ignore links without data-target (like explore link)

            const targetPage = document.querySelector(targetId);

            // Update active link styling only for sidebar main nav
            if (link.closest('.sidebar-nav')) {
                document.querySelectorAll('.sidebar-nav .nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
            // Switch visible page
            dashboardPages.forEach(page => page.classList.remove('active'));
            if (targetPage) { targetPage.classList.add('active'); }

            // Reload watchlist if navigating to watchlist page
            if (targetId === '#page-watchlist' && currentUser && currentUser.role === 'investor') {
                const authUser = auth.currentUser;
                if (authUser) {
                    loadWatchlist(authUser.uid);
                }
            }

            // Close dropdowns
            if (profileDropdown) { profileDropdown.classList.remove('active'); }
            if (headerProfileDropdown) { headerProfileDropdown.classList.remove('active'); }
        });
    });

    // ---
    // 7. PROFILE DROPDOWN TOGGLE LOGIC
    // ---
    if (profileTriggerArea) {
        profileTriggerArea.addEventListener('click', (e) => {
            e.stopPropagation();
            if (profileDropdown) { profileDropdown.classList.toggle('active'); }
             if (headerProfileDropdown) { headerProfileDropdown.classList.remove('active');} // Close other dropdown
        });
    }
    if (headerProfileTrigger) {
        headerProfileTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (headerProfileDropdown) { headerProfileDropdown.classList.toggle('active'); }
            if (profileDropdown) { profileDropdown.classList.remove('active');} // Close other dropdown
            if (notificationDropdown) { notificationDropdown.classList.remove('active');} // Close notification dropdown
        });
    }
    
    // ---
    // 7.5. NOTIFICATION SYSTEM
    // ---
    const notificationBell = document.getElementById('notification-bell');
    const notificationDropdown = document.getElementById('notification-dropdown');
    const notificationBadge = document.getElementById('notification-badge');
    const notificationList = document.getElementById('notification-list');
    const markAllReadBtn = document.getElementById('mark-all-read-btn');
    
    let unsubscribeNotificationsListener = null;
    let userNotifications = [];
    
    // Toggle notification dropdown
    if (notificationBell) {
        notificationBell.addEventListener('click', (e) => {
            e.stopPropagation();
            if (notificationDropdown) {
                notificationDropdown.classList.toggle('active');
            }
            if (headerProfileDropdown) { headerProfileDropdown.classList.remove('active'); }
            if (profileDropdown) { profileDropdown.classList.remove('active'); }
        });
    }
    
    // Mark all as read
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', () => {
            markAllNotificationsAsRead();
        });
    }
    
    // Function to load and listen to notifications
    function loadUserNotifications(userId) {
        if (!userId) return;
        
        // Clean up previous listener
        if (unsubscribeNotificationsListener) {
            unsubscribeNotificationsListener();
            unsubscribeNotificationsListener = null;
        }
        
        console.log('Loading notifications for user:', userId);
        
        // Try to load notifications without orderBy first (in case index doesn't exist yet)
        unsubscribeNotificationsListener = db.collection('notifications')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .onSnapshot((querySnapshot) => {
                console.log('Notifications received:', querySnapshot.size);
                userNotifications = [];
                querySnapshot.forEach((doc) => {
                    userNotifications.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                displayNotifications(userNotifications);
                updateNotificationBadge(userNotifications);
            }, (error) => {
                console.error('Error loading notifications:', error);
                console.error('Error code:', error.code);
                console.error('Error message:', error.message);
                
                // If it's an index error, try without orderBy
                if (error.code === 'failed-precondition' || error.message.includes('index')) {
                    console.log('Trying to load notifications without orderBy (index may not exist)');
                    unsubscribeNotificationsListener = db.collection('notifications')
                        .where('userId', '==', userId)
                        .limit(20)
                        .onSnapshot((querySnapshot) => {
                            console.log('Notifications received (no order):', querySnapshot.size);
                            userNotifications = [];
                            querySnapshot.forEach((doc) => {
                                userNotifications.push({
                                    id: doc.id,
                                    ...doc.data()
                                });
                            });
                            
                            // Sort manually
                            userNotifications.sort((a, b) => {
                                const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
                                const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
                                return timeB - timeA;
                            });
                            
                            displayNotifications(userNotifications);
                            updateNotificationBadge(userNotifications);
                        });
                }
            });
    }
    
    // Display notifications in the dropdown
    function displayNotifications(notifications) {
        if (!notificationList) return;
        
        if (notifications.length === 0) {
            notificationList.innerHTML = '<p class="notification-empty">No notifications yet</p>';
            return;
        }
        
        const notificationsHtml = notifications.map(notif => {
            const unreadClass = notif.read ? '' : 'unread';
            const timeAgo = formatTimeAgo(notif.createdAt);
            
            return `
                <div class="notification-item ${unreadClass}" data-id="${notif.id}" data-link="${notif.link || ''}">
                    <div class="notification-header">
                        <span class="notification-type ${notif.type}">${notif.type}</span>
                        <span class="notification-time">${timeAgo}</span>
                    </div>
                    <div class="notification-content">${notif.message}</div>
                </div>
            `;
        }).join('');
        
        notificationList.innerHTML = notificationsHtml;
        
        // Add click listeners to notification items
        document.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const notifId = item.getAttribute('data-id');
                const link = item.getAttribute('data-link');
                handleNotificationClick(notifId, link);
            });
        });
    }
    
    // Update notification badge
    function updateNotificationBadge(notifications) {
        if (!notificationBadge) return;
        
        const unreadCount = notifications.filter(n => !n.read).length;
        
        if (unreadCount > 0) {
            notificationBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            notificationBadge.classList.add('has-notifications');
        } else {
            notificationBadge.classList.remove('has-notifications');
        }
    }
    
    // Handle notification click
    function handleNotificationClick(notifId, link) {
        // Mark as read
        db.collection('notifications').doc(notifId).update({
            read: true
        }).then(() => {
            console.log('Notification marked as read');
            
            // Navigate to link if provided
            if (link && link !== '') {
                window.location.href = link;
            }
        }).catch(error => {
            console.error('Error marking notification as read:', error);
        });
    }
    
    // Mark all notifications as read
    function markAllNotificationsAsRead() {
        if (!currentUser) return;
        
        const batch = db.batch();
        userNotifications.forEach(notif => {
            if (!notif.read) {
                const docRef = db.collection('notifications').doc(notif.id);
                batch.update(docRef, { read: true });
            }
        });
        
        batch.commit().then(() => {
            console.log('All notifications marked as read');
        }).catch(error => {
            console.error('Error marking all as read:', error);
        });
    }
    
    // Format time ago (e.g., "2m ago", "1h ago", "3d ago")
    function formatTimeAgo(timestamp) {
        if (!timestamp) return 'Just now';
        
        const now = new Date();
        const time = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const diffMs = now - time;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffSecs < 60) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return time.toLocaleDateString();
    }
    
    // Helper function to create a notification
    function createNotification(userId, type, message, link = '') {
        return db.collection('notifications').add({
            userId: userId,
            type: type,
            message: message,
            link: link,
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            console.log('Notification created successfully');
        }).catch(error => {
            console.error('Error creating notification:', error);
        });
    }
    
    // Test function to create a sample notification (for debugging)
    // Call this from browser console: window.createTestNotification()
    window.createTestNotification = function() {
        if (!currentUser) {
            console.error('You must be logged in to create a test notification');
            return;
        }
        
        const authUser = auth.currentUser;
        if (!authUser) {
            console.error('No authenticated user found');
            return;
        }
        
        createNotification(
            authUser.uid,
            'general',
            '<strong>Test Notification</strong> - This is a test notification to verify the system is working!',
            ''
        ).then(() => {
            console.log('Test notification created! Check your notification bell.');
        });
    };
    
    // Click away to close dropdowns
    window.addEventListener('click', (e) => {
        if (profileDropdown && profileDropdown.classList.contains('active')) {
            if (profileTriggerArea && !profileTriggerArea.contains(e.target)) {
                profileDropdown.classList.remove('active');
            }
        }
        if (headerProfileDropdown && headerProfileDropdown.classList.contains('active')) {
            if (headerProfileTrigger && !headerProfileTrigger.contains(e.target)) {
                headerProfileDropdown.classList.remove('active');
            }
        }
        if (notificationDropdown && notificationDropdown.classList.contains('active')) {
            if (notificationBell && !notificationBell.contains(e.target) && !notificationDropdown.contains(e.target)) {
                notificationDropdown.classList.remove('active');
            }
        }
    });


    // ---
    // 8. FUNCTION TO LOAD *FOUNDER* PROJECTS
    // ---
    function loadFounderProjects(userId) {
        if (!projectListContainer || !userId) return;
        console.log('Loading founder projects for user:', userId);

        // Clean up previous listener to prevent memory leaks
        if (unsubscribeProjectsListener) {
            unsubscribeProjectsListener();
            unsubscribeProjectsListener = null;
        }

        // Set up new listener with efficient DOM manipulation
        unsubscribeProjectsListener = db.collection('projects')
          .where('founderId', '==', userId)
          .orderBy('createdAt', 'desc')
          .onSnapshot((querySnapshot) => {
              console.log('Founder projects data received:', querySnapshot.size, 'docs');
              
              if (querySnapshot.empty) {
                  projectListContainer.innerHTML = '<p>You have not created any projects yet.</p>';
                  return;
              }

              // Build HTML efficiently using array
              const projectsHtmlArray = [];
              querySnapshot.forEach((doc) => {
                  const project = doc.data();
                  projectsHtmlArray.push(`
                      <div class="project-list-item" data-project-id="${doc.id}">
                          <div class="project-info">
                              <h3>${project.title}</h3>
                              <p>Funding Goal: ${formatCurrency(project.fundingGoal)} / ${project.profitShare || 'N/A'}% Profit Share</p>
                              <p>Category: ${project.category || 'Not specified'}</p>
                          </div>
                          <div class="project-actions">
                              <a href="startup.html?id=${doc.id}" class="btn btn-secondary">View</a>
                              <button class="btn btn-secondary btn-edit-project" data-id="${doc.id}">Edit</button>
                              <button class="btn btn-danger btn-delete-project" data-id="${doc.id}">Delete</button>
                          </div>
                      </div>
                  `);
              });

              // Single DOM update instead of multiple
              projectListContainer.innerHTML = projectsHtmlArray.join('');
              
              // Attach event listeners immediately (no setTimeout needed)
                  attachProjectActionListeners();

          }, (error) => {
              console.error("Error listening to founder projects: ", error);
              projectListContainer.innerHTML = '<p>Error loading projects. Please try again.</p>';
          });
    }

    // ---
    // 9. STARTUP DETAIL PAGE LOGIC
    // ---
    let startupPageProjectId = null;
    if (startupTitle) {
        console.log('On startup detail page, loading details...');
        const params = new URLSearchParams(window.location.search);
        startupPageProjectId = params.get('id');
        loadStartupDetails();
    }

    function loadStartupDetails() {
        const params = new URLSearchParams(window.location.search);
        const projectId = params.get('id');
        console.log('Loading details for projectId:', projectId);

        if (!projectId) {
            startupHeaderLoaded.innerHTML = '<h1>Project not found.</h1><p>Invalid URL.</p>';
            startupHeaderLoaded.style.display = 'flex';
            startupHeaderLoading.style.display = 'none';
            return;
        }

        db.collection('projects').doc(projectId).get()
            .then((doc) => {
                if (doc.exists) {
                    const project = doc.data();
                    console.log('Project data found:', project);

                    startupTitle.textContent = project.title;
                    startupMission.textContent = project.mission;
                    startupLogo.textContent = project.title.charAt(0);
                    startupDesc.textContent = project.description || "No detailed description provided.";
                    startupFounder.textContent = project.founderName;
                    startupGoal.textContent = formatCurrency(project.fundingGoal);
                    startupShare.textContent = `${project.profitShare || 'N/A'}%`;

                    startupHeaderLoaded.style.display = 'flex';
                    startupHeaderLoading.style.display = 'none';

                    // Update investor actions based on current user state
                    updateStartupPageButtons(projectId, project.title);

                } else {
                    console.log('Project document not found for ID:', projectId);
                    startupHeaderLoaded.innerHTML = '<h1>Project not found.</h1><p>This project may have been deleted.</p>';
                    startupHeaderLoaded.style.display = 'flex';
                    startupHeaderLoading.style.display = 'none';
                }
            })
            .catch((error) => {
                console.error("Error getting project details: ", error);
                startupHeaderLoaded.innerHTML = '<h1>Error</h1><p>Could not load project details.</p>';
                startupHeaderLoaded.style.display = 'flex';
                startupHeaderLoading.style.display = 'none';
            });
    }

    // Function to update startup page buttons based on user state
    function updateStartupPageButtons(projectId, projectTitle) {
        // Re-get the button to ensure we have the latest reference
        const watchlistBtn = document.getElementById('add-to-watchlist-btn');
        const investmentBtn = document.getElementById('make-offer-btn');
        const actions = document.getElementById('startup-actions');

        if (currentUser && currentUser.role === 'investor') {
            // Show investor actions
            if (actions) {
                actions.style.display = 'flex';
            }

            // Set up watchlist button
            if (watchlistBtn) {
                // Check if already in watchlist
                if (currentUser.watchlist && currentUser.watchlist[projectId]) {
                    watchlistBtn.textContent = 'Added to Watchlist';
                    watchlistBtn.disabled = true;
                } else {
                    watchlistBtn.textContent = 'Add to Watchlist';
                    watchlistBtn.disabled = false;
                    // Remove old event listener by cloning
                    const newBtn = watchlistBtn.cloneNode(true);
                    watchlistBtn.parentNode.replaceChild(newBtn, watchlistBtn);
                    // Add new event listener to the new button
                    newBtn.addEventListener('click', () => {
                        addProjectToWatchlist(projectId, projectTitle);
                    });
                }
            }

            // Show investment button
            if (investmentBtn) {
                investmentBtn.style.display = 'block';
            }
        } else if (currentUser && currentUser.role === 'founder') {
            // Hide investor actions for founders
            if (actions) {
                actions.style.display = 'none';
            }
            if (investmentBtn) {
                investmentBtn.style.display = 'none';
            }
        } else {
            // Not logged in or no user data
            if (actions) {
                actions.style.display = 'none';
            }
            if (investmentBtn) {
                investmentBtn.style.display = 'none';
            }
        }
    }

    function addProjectToWatchlist(projectId, projectTitle) {
        if (!currentUser || currentUser.role !== 'investor') {
            alert('Please log in as an Investor to add to your watchlist.');
            return;
        }
        console.log('Adding project to watchlist:', projectId);

        const authUser = auth.currentUser;
        if (!authUser) {
            alert('Authentication error. Please log in again.');
            return;
        }

        const userRef = db.collection('users').doc(authUser.uid);
        
        // Create a proper nested structure for watchlist
        const watchlistUpdate = {
            watchlist: {
                [projectId]: {
            title: projectTitle,
            addedAt: firebase.firestore.FieldValue.serverTimestamp()
                }
            }
        };

        // Use set with merge to create the field if it doesn't exist
        userRef.set(watchlistUpdate, { merge: true })
            .then(() => {
                console.log('Project added to watchlist successfully.');
                alert(`${projectTitle} added to your watchlist!`);
                
                // Update local currentUser state
                 if (!currentUser.watchlist) { currentUser.watchlist = {}; }
                currentUser.watchlist[projectId] = { title: projectTitle };
                
                // Update button state - get fresh reference
                const watchlistBtn = document.getElementById('add-to-watchlist-btn');
                if (watchlistBtn) {
                    watchlistBtn.textContent = 'Added to Watchlist';
                    watchlistBtn.disabled = true;
                }

                // Reload the watchlist display if on dashboard
                if (watchlistContainer) {
                    loadWatchlist(authUser.uid);
                }
            })
            .catch((error) => {
                console.error("Error adding to watchlist: ", error);
                console.error("Error code:", error.code);
                console.error("Error details:", error.message);
                alert('Could not add to watchlist: ' + error.message);
            });
    }

    // ---
    // 9.5. DEFINE REFRESH ALL PRICES FUNCTION
    // ---
    refreshAllPrices = () => {
        console.log('Refreshing all prices with currency:', currentCurrency);
        
        // Refresh explore page if present
        if (window.location.pathname.includes('explore.html')) {
            if (typeof filterAndDisplayProjects === 'function') {
                filterAndDisplayProjects();
                console.log('Explore page prices refreshed');
            }
        }
        
        // Refresh startup page if present
        if (window.location.pathname.includes('startup.html')) {
            if (typeof loadStartupDetails === 'function') {
                loadStartupDetails();
                console.log('Startup page prices refreshed');
            }
        }
        
        // Refresh dashboard if present
        if (window.location.pathname.includes('dashboard.html')) {
            if (currentUser && currentUser.role === 'founder' && typeof loadFounderProjects === 'function') {
                const userId = auth.currentUser ? auth.currentUser.uid : null;
                if (userId) {
                    loadFounderProjects(userId);
                    console.log('Dashboard prices refreshed');
                }
            } else {
                console.log('Dashboard - will update on next real-time data change');
            }
        }
    };

    // ---
    // 10. EXPLORE PAGE LOGIC WITH FILTERING
    // ---
    
    let allProjects = []; // Store all projects for client-side filtering
    let currentFilters = {
        keyword: '',
        category: '',
        fundingMin: 0,
        fundingMax: 999999999
    };
    
    if (exploreProjectGrid) {
        console.log('On explore page, loading projects...');
        loadExploreProjects();
        
        // Filter form elements
        const filterForm = document.getElementById('filter-form');
        const searchBar = document.getElementById('search-bar');
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        
        // Apply filters when form is submitted
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                applyFilters();
            });
        }
        
        // Real-time search
        if (searchBar) {
            searchBar.addEventListener('input', (e) => {
                currentFilters.keyword = e.target.value.toLowerCase();
                filterAndDisplayProjects();
            });
        }
        
        // Clear filters button
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                // Reset form
                if (filterForm) filterForm.reset();
                if (searchBar) searchBar.value = '';
                
                // Reset filters
                currentFilters = {
                    keyword: '',
                    category: '',
                    fundingMin: 0,
                    fundingMax: 999999999
                };
                
                // Show all projects
                filterAndDisplayProjects();
            });
        }
    }

    function applyFilters() {
        currentFilters = {
            keyword: document.getElementById('filter-keyword')?.value.toLowerCase() || '',
            category: document.getElementById('filter-category')?.value || '',
            fundingMin: parseInt(document.getElementById('filter-funding-min')?.value) || 0,
            fundingMax: parseInt(document.getElementById('filter-funding-max')?.value) || 999999999
        };
        
        filterAndDisplayProjects();
    }

    function filterAndDisplayProjects() {
        const filteredProjects = allProjects.filter(project => {
            // Keyword filter (searches in title, mission, and founder name)
            if (currentFilters.keyword) {
                const searchText = `${project.title} ${project.mission} ${project.founderName}`.toLowerCase();
                if (!searchText.includes(currentFilters.keyword)) {
                    return false;
                }
            }
            
            // Category filter
            if (currentFilters.category && project.category !== currentFilters.category) {
                return false;
            }
            
            // Funding goal range filter
            const fundingGoal = project.fundingGoal || 0;
            if (fundingGoal < currentFilters.fundingMin || fundingGoal > currentFilters.fundingMax) {
                return false;
            }
            
            return true;
        });
        
        displayProjects(filteredProjects);
    }

    function displayProjects(projects) {
        if (!exploreProjectGrid) return;
        
        if (projects.length === 0) {
            exploreProjectGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px;">No projects match your filters. Try adjusting your search criteria.</p>';
                  return;
              }
              
        const cardsHtmlArray = projects.map(project => `
            <a href="startup.html?id=${project.id}" class="startup-card">
                        <div class="card-header">
                            <div class="card-logo">${project.title ? project.title.charAt(0) : '?'}</div>
                            <div class="card-title">
                                <h3>${project.title || 'Untitled Project'}</h3>
                                <p>${project.founderName || 'Founder'}</p>
                            </div>
                        </div>
                        <p class="card-description">${project.mission || 'No mission provided.'}</p>
                        <div class="card-metrics">
                            <div class="metric-item">
                                <span>Goal</span>
                        <strong>${formatCurrency(project.fundingGoal)}</strong>
                            </div>
                            <span class="card-category">${project.category || 'Uncategorized'}</span>
                        </div>
                    </a>
                  `);
              
              exploreProjectGrid.innerHTML = cardsHtmlArray.join('');
    }

    function loadExploreProjects() {
        db.collection('projects')
          .orderBy('createdAt', 'desc')
          .get()
          .then((querySnapshot) => {
              console.log('Explore projects data received:', querySnapshot.size, 'docs');
              
              if (querySnapshot.empty) {
                  exploreProjectGrid.innerHTML = '<p>No projects found. Check back soon!</p>';
                  allProjects = [];
                  return;
              }
              
              // Store all projects with their IDs
              allProjects = [];
              querySnapshot.forEach((doc) => {
                  const project = doc.data();
                  allProjects.push({
                      id: doc.id,
                      ...project
                  });
              });
              
              // Display all projects initially
              displayProjects(allProjects);
          })
          .catch((error) => {
              console.error("Error loading explore projects: ", error);
              exploreProjectGrid.innerHTML = '<p>Error loading projects.</p>';
              allProjects = [];
          });
    }

    // ---
    // 11. MESSAGING SYSTEM
    // ---

    // Open message modal when investor clicks "Message Founder"
    if (messageFounderBtn) {
        messageFounderBtn.addEventListener('click', () => {
            const params = new URLSearchParams(window.location.search);
            const projectId = params.get('id');
            
            if (!currentUser || currentUser.role !== 'investor') {
                alert('Please log in as an investor to send messages.');
                return;
            }

            // Get project data to find founder info
            db.collection('projects').doc(projectId).get()
                .then((doc) => {
                    if (doc.exists) {
                        const project = doc.data();
                        document.getElementById('message-project-id').value = projectId;
                        document.getElementById('message-founder-id').value = project.founderId;
                        document.getElementById('message-founder-name').value = project.founderName;
                        document.getElementById('message-subject').value = `Interested in ${project.title}`;
                        
                        messageModalOverlay.classList.add('active');
                        if (messageError) messageError.style.display = 'none';
                    }
                })
                .catch((error) => {
                    console.error('Error loading project data:', error);
                    alert('Could not open message form.');
                });
        });
    }

    // Close message modal
    if (closeMessageModalBtn) {
        closeMessageModalBtn.addEventListener('click', () => {
            messageModalOverlay.classList.remove('active');
        });
    }

    if (messageModalOverlay) {
        messageModalOverlay.addEventListener('click', (e) => {
            if (e.target === messageModalOverlay) {
                messageModalOverlay.classList.remove('active');
            }
        });
    }

    // Send message form submission
    if (sendMessageForm) {
        sendMessageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (messageError) messageError.style.display = 'none';

            const authUser = auth.currentUser;
            if (!authUser || !currentUser) {
                if (messageError) {
                    messageError.textContent = 'Authentication error. Please log in again.';
                    messageError.style.display = 'block';
                }
                return;
            }

            const projectId = document.getElementById('message-project-id').value;
            const founderId = document.getElementById('message-founder-id').value;
            const founderName = document.getElementById('message-founder-name').value;
            const subject = document.getElementById('message-subject').value;
            const content = document.getElementById('message-content').value;

            // Create a conversation document
            const conversationId = `${authUser.uid}_${founderId}_${projectId}`;
            
            const messageData = {
                conversationId: conversationId,
                projectId: projectId,
                senderId: authUser.uid,
                senderName: currentUser.name,
                senderRole: 'investor',
                recipientId: founderId,
                recipientName: founderName,
                recipientRole: 'founder',
                subject: subject,
                messages: [{
                    from: authUser.uid,
                    fromName: currentUser.name,
                    content: content,
                    timestamp: new Date(),
                    read: false
                }],
                lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessagePreview: content.substring(0, 100)
            };

            db.collection('conversations').doc(conversationId).set(messageData)
                .then(() => {
                    console.log('Message sent successfully');
                    
                    // Create notification for founder
                    createNotification(
                        founderId,
                        'message',
                        `<strong>${currentUser.name}</strong> sent you a message about your project`,
                        `dashboard.html#messages`
                    );
                    
                    messageModalOverlay.classList.remove('active');
                    sendMessageForm.reset();
                    alert('Message sent successfully!');
                })
                .catch((error) => {
                    console.error('Error sending message:', error);
                    if (messageError) {
                        messageError.textContent = `Error: ${error.message}`;
                        messageError.style.display = 'block';
                    }
                });
        });
    }

    // Load messages for founders
    function loadFounderMessages(userId) {
        if (!founderMessagesContainer || !userId) return;
        
        console.log('Loading messages for founder:', userId);
        
        // Clean up previous listener
        if (unsubscribeFounderMessagesListener) {
            unsubscribeFounderMessagesListener();
            unsubscribeFounderMessagesListener = null;
        }
        
        unsubscribeFounderMessagesListener = db.collection('conversations')
            .where('recipientId', '==', userId)
            .onSnapshot((querySnapshot) => {
                console.log('Founder messages received:', querySnapshot.size, 'conversations');
                
                // Don't update if we're currently in a chat view
                if (activeChatId) {
                    console.log('Skipping message list update - chat is active');
                    return;
                }
                
                if (querySnapshot.empty) {
                    founderMessagesContainer.innerHTML = '<p>No messages yet.</p>';
                    return;
                }

                // Convert to array and sort manually
                const conversations = [];
                querySnapshot.forEach((doc) => {
                    conversations.push({ id: doc.id, data: doc.data() });
                });
                
                // Sort by lastMessageAt (most recent first)
                conversations.sort((a, b) => {
                    const timeA = a.data.lastMessageAt ? (a.data.lastMessageAt.toDate ? a.data.lastMessageAt.toDate() : new Date(a.data.lastMessageAt)) : new Date(0);
                    const timeB = b.data.lastMessageAt ? (b.data.lastMessageAt.toDate ? b.data.lastMessageAt.toDate() : new Date(b.data.lastMessageAt)) : new Date(0);
                    return timeB - timeA;
                });

                // Build HTML efficiently using array
                const messagesHtmlArray = [];
                conversations.forEach((conv) => {
                    const conversation = conv.data;
                    const lastMessage = conversation.messages[conversation.messages.length - 1];
                    const unread = conversation.messages.some(msg => !msg.read && msg.from !== userId);
                    
                    messagesHtmlArray.push(`
                        <div class="message-thread ${unread ? 'unread' : ''}" data-conversation-id="${conv.id}">
                            <div class="message-thread-header">
                                <span class="message-sender">${conversation.senderName}</span>
                                <span class="message-timestamp">${formatTimestamp(lastMessage.timestamp)}</span>
                            </div>
                            <div class="message-subject">${conversation.subject}</div>
                            <p class="message-preview">${conversation.lastMessagePreview}</p>
                            <div class="message-actions">
                                <button class="btn btn-primary btn-view-conversation" data-conversation-id="${conv.id}">View Conversation</button>
                                <button class="btn btn-secondary btn-reply-message" 
                                    data-conversation-id="${conv.id}"
                                    data-recipient-id="${conversation.senderId}"
                                    data-recipient-name="${conversation.senderName}">Reply</button>
                            </div>
                        </div>
                    `);
                });

                // Single DOM update
                founderMessagesContainer.innerHTML = messagesHtmlArray.join('');
                
                // Attach event listeners
                attachMessageListeners();
            }, (error) => {
                console.error('Error loading founder messages:', error);
                console.error('Error details:', error.message);
                founderMessagesContainer.innerHTML = `<p>Error loading messages. Please refresh the page.</p><p style="font-size: 0.85rem; color: var(--color-text-secondary);">Error: ${error.message}</p>`;
            });
    }

    // Load messages for investors
    function loadInvestorMessages(userId) {
        if (!investorMessagesContainer || !userId) return;
        
        console.log('Loading messages for investor:', userId);
        
        // Clean up previous listener
        if (unsubscribeInvestorMessagesListener) {
            unsubscribeInvestorMessagesListener();
            unsubscribeInvestorMessagesListener = null;
        }
        
        unsubscribeInvestorMessagesListener = db.collection('conversations')
            .where('senderId', '==', userId)
            .onSnapshot((querySnapshot) => {
                console.log('Investor messages received:', querySnapshot.size, 'conversations');
                
                // Don't update if we're currently in a chat view
                if (activeChatId) {
                    console.log('Skipping message list update - chat is active');
                    return;
                }
                
                if (querySnapshot.empty) {
                    investorMessagesContainer.innerHTML = '<p>No messages yet. Visit a project page to send a message.</p>';
                    return;
                }

                // Convert to array and sort manually
                const conversations = [];
                querySnapshot.forEach((doc) => {
                    conversations.push({ id: doc.id, data: doc.data() });
                });
                
                // Sort by lastMessageAt (most recent first)
                conversations.sort((a, b) => {
                    const timeA = a.data.lastMessageAt ? (a.data.lastMessageAt.toDate ? a.data.lastMessageAt.toDate() : new Date(a.data.lastMessageAt)) : new Date(0);
                    const timeB = b.data.lastMessageAt ? (b.data.lastMessageAt.toDate ? b.data.lastMessageAt.toDate() : new Date(b.data.lastMessageAt)) : new Date(0);
                    return timeB - timeA;
                });

                // Build HTML efficiently using array
                const messagesHtmlArray = [];
                conversations.forEach((conv) => {
                    const conversation = conv.data;
                    const lastMessage = conversation.messages[conversation.messages.length - 1];
                    const unread = conversation.messages.some(msg => !msg.read && msg.from !== userId);
                    
                    messagesHtmlArray.push(`
                        <div class="message-thread ${unread ? 'unread' : ''}" data-conversation-id="${conv.id}">
                            <div class="message-thread-header">
                                <span class="message-sender">${conversation.recipientName}</span>
                                <span class="message-timestamp">${formatTimestamp(lastMessage.timestamp)}</span>
                            </div>
                            <div class="message-subject">${conversation.subject}</div>
                            <p class="message-preview">${conversation.lastMessagePreview}</p>
                            <div class="message-actions">
                                <button class="btn btn-primary btn-view-conversation" data-conversation-id="${conv.id}">View Conversation</button>
                            </div>
                        </div>
                    `);
                });

                // Single DOM update
                investorMessagesContainer.innerHTML = messagesHtmlArray.join('');
                
                // Attach event listeners
                attachMessageListeners();
            }, (error) => {
                console.error('Error loading investor messages:', error);
                console.error('Error details:', error.message);
                investorMessagesContainer.innerHTML = `<p>Error loading messages. Please refresh the page.</p><p style="font-size: 0.85rem; color: var(--color-text-secondary);">Error: ${error.message}</p>`;
            });
    }

    // Helper function to format timestamps
    function formatTimestamp(timestamp) {
        if (!timestamp) return 'Just now';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        // Less than a minute
        if (diff < 60000) return 'Just now';
        // Less than an hour
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        // Less than a day
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        // Less than a week
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        
        // Otherwise, show the date
        return date.toLocaleDateString();
    }

    // Attach event listeners to message buttons
    // Use event delegation for better performance - single listener instead of many
    let founderMessagesDelegationInitialized = false;
    let investorMessagesDelegationInitialized = false;
    
    function attachMessageListeners() {
        // Set up delegation for founder messages container
        if (!founderMessagesDelegationInitialized && founderMessagesContainer) {
            founderMessagesContainer.addEventListener('click', (e) => {
                const target = e.target;
                
                // View conversation or reply button click
                if (target.classList.contains('btn-view-conversation') || target.classList.contains('btn-reply-message')) {
                    e.stopPropagation();
                    const conversationId = target.getAttribute('data-conversation-id');
                    openChatView(conversationId);
                }
            });
            founderMessagesDelegationInitialized = true;
        }
        
        // Set up delegation for investor messages container
        if (!investorMessagesDelegationInitialized && investorMessagesContainer) {
            investorMessagesContainer.addEventListener('click', (e) => {
                const target = e.target;
                
                // View conversation button click
                if (target.classList.contains('btn-view-conversation')) {
                    e.stopPropagation();
                    const conversationId = target.getAttribute('data-conversation-id');
                    openChatView(conversationId);
                }
            });
            investorMessagesDelegationInitialized = true;
        }
    }

    // Global variable to track active chat
    let activeChatListener = null;
    let activeChatId = null;

    // Open chat view with real-time messaging
    function openChatView(conversationId) {
        // Unsubscribe from previous chat listener if exists
        if (activeChatListener) {
            activeChatListener();
            activeChatListener = null;
        }

        activeChatId = conversationId;

        const container = currentUser.role === 'founder' ? founderMessagesContainer : investorMessagesContainer;
        if (!container) return;

        // Show loading state
        container.innerHTML = '<div class="chat-loading">Loading chat...</div>';

        // Get initial conversation data
        db.collection('conversations').doc(conversationId).get()
            .then((doc) => {
                if (!doc.exists) {
                    container.innerHTML = '<p>Conversation not found.</p>';
                    return;
                }

                const conversation = doc.data();
                const otherPersonName = currentUser.role === 'founder' ? conversation.senderName : conversation.recipientName;

                // Create chat interface
                const chatHtml = `
                    <div class="chat-container">
                        <div class="chat-header">
                            <div class="chat-header-info">
                                <h3>${conversation.subject}</h3>
                                <p>Chat with ${otherPersonName}</p>
                            </div>
                            <button class="btn btn-secondary back-to-messages-btn" onclick="window.backToMessagesList()">← Back</button>
                        </div>
                        <div class="chat-messages" id="chat-messages-${conversationId}">
                            <!-- Messages will be loaded here -->
                        </div>
                        <div class="chat-input-container">
                            <form class="chat-input-form" id="chat-form-${conversationId}">
                                <div class="chat-input-wrapper">
                                    <textarea 
                                        class="chat-input" 
                                        id="chat-input-${conversationId}" 
                                        placeholder="Type your message..."
                                        rows="1"></textarea>
                                </div>
                                <button type="submit" class="btn chat-send-btn">Send</button>
                            </form>
                        </div>
                    </div>
                `;

                container.innerHTML = chatHtml;

                // Set up real-time listener for messages
                setupChatListener(conversationId);

                // Set up form submission
                const chatForm = document.getElementById(`chat-form-${conversationId}`);
                const chatInput = document.getElementById(`chat-input-${conversationId}`);

                if (chatForm) {
                    chatForm.addEventListener('submit', (e) => {
                        e.preventDefault();
                        sendChatMessage(conversationId, chatInput.value.trim());
                        chatInput.value = '';
                        chatInput.style.height = 'auto';
                    });
                }

                // Auto-resize textarea
                if (chatInput) {
                    chatInput.addEventListener('input', function() {
                        this.style.height = 'auto';
                        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
                    });

                    // Send on Enter (without Shift)
                    chatInput.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            chatForm.dispatchEvent(new Event('submit'));
                        }
                    });
                }
            })
            .catch((error) => {
                console.error('Error opening chat:', error);
                container.innerHTML = '<p>Error loading chat. Please try again.</p>';
            });
    }

    // Set up real-time listener for chat messages
    function setupChatListener(conversationId) {
        const messagesContainer = document.getElementById(`chat-messages-${conversationId}`);
        if (!messagesContainer) return;

        // Listen for real-time updates
        activeChatListener = db.collection('conversations').doc(conversationId)
            .onSnapshot((doc) => {
                if (!doc.exists) return;

                const conversation = doc.data();
                renderChatMessages(conversationId, conversation.messages);
            }, (error) => {
                console.error('Error listening to chat:', error);
            });
    }

    // Render chat messages
    function renderChatMessages(conversationId, messages) {
        const messagesContainer = document.getElementById(`chat-messages-${conversationId}`);
        if (!messagesContainer) return;

        const currentUserId = auth.currentUser ? auth.currentUser.uid : null;
        const wasScrolledToBottom = messagesContainer.scrollHeight - messagesContainer.clientHeight <= messagesContainer.scrollTop + 50;

        messagesContainer.innerHTML = '';

        if (!messages || messages.length === 0) {
            messagesContainer.innerHTML = '<div class="chat-empty">No messages yet. Start the conversation!</div>';
            return;
        }

        messages.forEach((msg) => {
            const isSent = msg.from === currentUserId;
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${isSent ? 'sent' : 'received'}`;
            
            messageDiv.innerHTML = `
                <div class="chat-message-bubble">
                    ${msg.content}
                </div>
                <div class="chat-message-info">
                    <span class="chat-message-sender">${msg.fromName}</span>
                    <span class="chat-message-time">${formatTimestamp(msg.timestamp)}</span>
                </div>
            `;

            messagesContainer.appendChild(messageDiv);
        });

        // Auto-scroll to bottom if was already at bottom or on first load
        if (wasScrolledToBottom || messages.length <= 1) {
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }
    }

    // Send a message in the chat
    function sendChatMessage(conversationId, content) {
        if (!content || !content.trim()) return;

        const authUser = auth.currentUser;
        if (!authUser || !currentUser) {
            alert('Authentication error. Please log in again.');
            return;
        }

        const newMessage = {
            from: authUser.uid,
            fromName: currentUser.name,
            content: content,
            timestamp: new Date(),
            read: false
        };

        // Update conversation with new message
        db.collection('conversations').doc(conversationId).update({
            messages: firebase.firestore.FieldValue.arrayUnion(newMessage),
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessagePreview: content.substring(0, 100)
        })
            .then(() => {
                console.log('Message sent successfully');
            })
            .catch((error) => {
                console.error('Error sending message:', error);
                alert('Failed to send message. Please try again.');
            });
    }

    // Global function to go back to messages list
    window.backToMessagesList = function() {
        // Unsubscribe from chat listener
        if (activeChatListener) {
            activeChatListener();
            activeChatListener = null;
        }
        activeChatId = null;

        // Reload messages
        if (currentUser) {
            loadMessagesForUser(auth.currentUser.uid, currentUser.role);
        }
    };

    // Open reply modal
    function openReplyModal(conversationId, recipientId, recipientName) {
        if (!replyModalOverlay) return;

        document.getElementById('reply-conversation-id').value = conversationId;
        document.getElementById('reply-to-user-id').value = recipientId;
        document.getElementById('reply-to-user-name').value = recipientName;
        document.getElementById('reply-recipient-display').textContent = recipientName;
        
        replyModalOverlay.classList.add('active');
        if (replyError) replyError.style.display = 'none';
    }

    // Close reply modal
    if (closeReplyModalBtn) {
        closeReplyModalBtn.addEventListener('click', () => {
            replyModalOverlay.classList.remove('active');
        });
    }

    if (replyModalOverlay) {
        replyModalOverlay.addEventListener('click', (e) => {
            if (e.target === replyModalOverlay) {
                replyModalOverlay.classList.remove('active');
            }
        });
    }

    // Send reply
    if (replyMessageForm) {
        replyMessageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (replyError) replyError.style.display = 'none';

            const authUser = auth.currentUser;
            if (!authUser || !currentUser) {
                if (replyError) {
                    replyError.textContent = 'Authentication error. Please log in again.';
                    replyError.style.display = 'block';
                }
                return;
            }

            const conversationId = document.getElementById('reply-conversation-id').value;
            const content = document.getElementById('reply-content').value;

            const newMessage = {
                from: authUser.uid,
                fromName: currentUser.name,
                content: content,
                timestamp: new Date(),
                read: false
            };

            // Update conversation with new message
            db.collection('conversations').doc(conversationId).update({
                messages: firebase.firestore.FieldValue.arrayUnion(newMessage),
                lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessagePreview: content.substring(0, 100)
            })
                .then(() => {
                    console.log('Reply sent successfully');
                    replyModalOverlay.classList.remove('active');
                    replyMessageForm.reset();
                    alert('Reply sent successfully!');
                    
                    // Reload the conversation view
                    viewConversation(conversationId);
                })
                .catch((error) => {
                    console.error('Error sending reply:', error);
                    if (replyError) {
                        replyError.textContent = `Error: ${error.message}`;
                        replyError.style.display = 'block';
                    }
                });
        });
    }

    // Load messages based on user role (called in setLoggedInState)
    function loadMessagesForUser(userId, role) {
        if (role === 'founder') {
            loadFounderMessages(userId);
        } else if (role === 'investor') {
            loadInvestorMessages(userId);
        }
    }

    // ---
    // 12. ANALYTICS SYSTEM
    // ---

    function loadFounderAnalytics(userId) {
        if (!analyticsContainer || !userId) return;

        console.log('Loading analytics for founder:', userId);

        // Get all projects for this founder
        db.collection('projects')
            .where('founderId', '==', userId)
            .get()
            .then((projectSnapshot) => {
                const projectCount = projectSnapshot.size;
                let totalFundingGoal = 0;
                let totalProfitShare = 0;
                const projectsList = [];

                projectSnapshot.forEach((doc) => {
                    const project = doc.data();
                    totalFundingGoal += project.fundingGoal || 0;
                    totalProfitShare += project.profitShare || 0;
                    projectsList.push({ id: doc.id, ...project });
                });

                const avgProfitShare = projectCount > 0 ? (totalProfitShare / projectCount).toFixed(1) : 0;

                // Get investment offers for this founder
                return db.collection('investmentOffers')
                    .where('founderId', '==', userId)
                    .get()
                    .then((offersSnapshot) => {
                        const totalOffers = offersSnapshot.size;
                        let pendingOffers = 0;
                        let totalOfferedAmount = 0;

                        offersSnapshot.forEach((doc) => {
                            const offer = doc.data();
                            if (offer.status === 'pending') {
                                pendingOffers++;
                            }
                            totalOfferedAmount += offer.amount || 0;
                        });

                        // Render analytics
                        renderAnalytics({
                            projectCount,
                            totalFundingGoal,
                            avgProfitShare,
                            totalOffers,
                            pendingOffers,
                            totalOfferedAmount,
                            projectsList
                        });
                    });
            })
            .catch((error) => {
                console.error('Error loading analytics:', error);
                analyticsContainer.innerHTML = '<p>Error loading analytics. Please try again.</p>';
            });
    }

    function renderAnalytics(data) {
        const analyticsHtml = `
            <div class="analytics-grid">
                <div class="analytics-card">
                    <div class="analytics-card-header">
                        <span class="analytics-card-label">Total Projects</span>
                    </div>
                    <div class="analytics-card-value">${data.projectCount}</div>
                    <div class="analytics-card-change">Active projects</div>
                </div>

                <div class="analytics-card">
                    <div class="analytics-card-header">
                        <span class="analytics-card-label">Total Funding Goal</span>
                    </div>
                    <div class="analytics-card-value">$${data.totalFundingGoal.toLocaleString()}</div>
                    <div class="analytics-card-change">Across all projects</div>
                </div>

                <div class="analytics-card">
                    <div class="analytics-card-header">
                        <span class="analytics-card-label">Investment Offers</span>
                    </div>
                    <div class="analytics-card-value">${data.totalOffers}</div>
                    <div class="analytics-card-change">${data.pendingOffers} pending</div>
                </div>

                <div class="analytics-card">
                    <div class="analytics-card-header">
                        <span class="analytics-card-label">Avg. Profit Share</span>
                    </div>
                    <div class="analytics-card-value">${data.avgProfitShare}%</div>
                    <div class="analytics-card-change">Across all projects</div>
                </div>
            </div>

            <div class="analytics-chart-container">
                <h3>Project Performance</h3>
                <table class="analytics-table">
                    <thead>
                        <tr>
                            <th>Project Name</th>
                            <th>Category</th>
                            <th>Funding Goal</th>
                            <th>Profit Share</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.projectsList.length > 0 ? data.projectsList.map(project => `
                            <tr>
                                <td><strong>${project.title}</strong></td>
                                <td>${project.category || 'N/A'}</td>
                                <td>$${(project.fundingGoal || 0).toLocaleString()}</td>
                                <td>${project.profitShare || 0}%</td>
                                <td><span style="color: #4CAF50;">Active</span></td>
                            </tr>
                        `).join('') : '<tr><td colspan="5" style="text-align: center;">No projects yet</td></tr>'}
                    </tbody>
                </table>
            </div>

            ${data.totalOffers > 0 ? `
                <div class="analytics-chart-container">
                    <h3>Investment Offers Summary</h3>
                    <p>Total amount offered: <strong>$${data.totalOfferedAmount.toLocaleString()}</strong></p>
                    <p>Pending offers: <strong>${data.pendingOffers}</strong></p>
                </div>
            ` : ''}
        `;

        analyticsContainer.innerHTML = analyticsHtml;
    }

    // ---
    // 13. SETTINGS SYSTEM
    // ---

    function loadSettingsData(userData) {
        if (!profileSettingsForm) return;

        // Populate settings form with current user data
        const settingsName = document.getElementById('settings-name');
        const settingsEmail = document.getElementById('settings-email');
        const settingsRole = document.getElementById('settings-role');

        if (settingsName) settingsName.value = userData.name || '';
        if (settingsEmail) settingsEmail.value = userData.email || '';
        if (settingsRole) {
            const roleDisplay = userData.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : '';
            settingsRole.value = roleDisplay;
        }
    }

    // Update profile settings
    if (profileSettingsForm) {
        profileSettingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (settingsError) settingsError.style.display = 'none';
            if (settingsSuccess) settingsSuccess.style.display = 'none';

            const authUser = auth.currentUser;
            if (!authUser) {
                if (settingsError) {
                    settingsError.textContent = 'Authentication error. Please log in again.';
                    settingsError.style.display = 'block';
                }
                return;
            }

            const newName = document.getElementById('settings-name').value;

            // Update user data in Firestore
            db.collection('users').doc(authUser.uid).update({
                name: newName
            })
                .then(() => {
                    console.log('Profile updated successfully');
                    if (settingsSuccess) {
                        settingsSuccess.style.display = 'block';
                    }
                    // Update currentUser
                    if (currentUser) {
                        currentUser.name = newName;
                    }
                    // Update sidebar display
                    const userNameEl = document.getElementById('sidebar-user-name');
                    if (userNameEl) userNameEl.textContent = newName;
                    
                    const sidebarAvatarInitialsEl = document.getElementById('sidebar-avatar-initials');
                    const headerAvatarInitialsEl = document.getElementById('header-avatar-initials');
                    const initials = newName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    if (sidebarAvatarInitialsEl) sidebarAvatarInitialsEl.textContent = initials;
                    if (headerAvatarInitialsEl) headerAvatarInitialsEl.textContent = initials;
                })
                .catch((error) => {
                    console.error('Error updating profile:', error);
                    if (settingsError) {
                        settingsError.textContent = `Error: ${error.message}`;
                        settingsError.style.display = 'block';
                    }
                });
        });
    }

    // Change password
    if (passwordChangeForm) {
        passwordChangeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (passwordError) passwordError.style.display = 'none';
            if (passwordSuccess) passwordSuccess.style.display = 'none';

            const authUser = auth.currentUser;
            if (!authUser || !currentUser) {
                if (passwordError) {
                    passwordError.textContent = 'Authentication error. Please log in again.';
                    passwordError.style.display = 'block';
                }
                return;
            }

            const currentPassword = document.getElementById('settings-current-password').value;
            const newPassword = document.getElementById('settings-new-password').value;
            const confirmPassword = document.getElementById('settings-confirm-password').value;

            // Validate passwords match
            if (newPassword !== confirmPassword) {
                if (passwordError) {
                    passwordError.textContent = 'New passwords do not match.';
                    passwordError.style.display = 'block';
                }
                return;
            }

            // Re-authenticate user before changing password
            const credential = firebase.auth.EmailAuthProvider.credential(
                authUser.email,
                currentPassword
            );

            authUser.reauthenticateWithCredential(credential)
                .then(() => {
                    // Now update password
                    return authUser.updatePassword(newPassword);
                })
                .then(() => {
                    console.log('Password updated successfully');
                    if (passwordSuccess) {
                        passwordSuccess.style.display = 'block';
                    }
                    passwordChangeForm.reset();
                })
                .catch((error) => {
                    console.error('Error changing password:', error);
                    let errorMessage = error.message;
                    if (error.code === 'auth/wrong-password') {
                        errorMessage = 'Current password is incorrect.';
                    }
                    if (passwordError) {
                        passwordError.textContent = errorMessage;
                        passwordError.style.display = 'block';
                    }
                });
        });
    }

    // Delete account
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', () => {
            const confirmed = confirm('Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.');
            
            if (!confirmed) return;

            const doubleConfirm = prompt('Type "DELETE" to confirm account deletion:');
            
            if (doubleConfirm !== 'DELETE') {
                alert('Account deletion cancelled.');
                return;
            }

            const authUser = auth.currentUser;
            if (!authUser) {
                alert('Authentication error. Please log in again.');
                return;
            }

            // Delete user data from Firestore first
            db.collection('users').doc(authUser.uid).delete()
                .then(() => {
                    // Delete the auth account
                    return authUser.delete();
                })
                .then(() => {
                    alert('Your account has been deleted.');
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    console.error('Error deleting account:', error);
                    if (error.code === 'auth/requires-recent-login') {
                        alert('For security reasons, please log out and log back in before deleting your account.');
                    } else {
                        alert('Error deleting account: ' + error.message);
                    }
                });
        });
    }

    // ---
    // 14. INVESTMENT OFFER SYSTEM
    // ---

    // Open investment offer modal
    if (makeOfferBtn) {
        makeOfferBtn.addEventListener('click', () => {
            const params = new URLSearchParams(window.location.search);
            const projectId = params.get('id');

            if (!currentUser || currentUser.role !== 'investor') {
                alert('Please log in as an investor to make investment offers.');
                return;
            }

            // Get project data
            db.collection('projects').doc(projectId).get()
                .then((doc) => {
                    if (doc.exists) {
                        const project = doc.data();
                        document.getElementById('investment-project-id').value = projectId;
                        document.getElementById('investment-founder-id').value = project.founderId;
                        document.getElementById('investment-project-title').value = project.title;
                        
                        investmentModalOverlay.classList.add('active');
                        if (investmentError) investmentError.style.display = 'none';
                    }
                })
                .catch((error) => {
                    console.error('Error loading project data:', error);
                    alert('Could not open investment form.');
                });
        });
    }

    // Close investment modal
    if (closeInvestmentModalBtn) {
        closeInvestmentModalBtn.addEventListener('click', () => {
            investmentModalOverlay.classList.remove('active');
        });
    }

    if (investmentModalOverlay) {
        investmentModalOverlay.addEventListener('click', (e) => {
            if (e.target === investmentModalOverlay) {
                investmentModalOverlay.classList.remove('active');
            }
        });
    }

    // Submit investment offer
    if (investmentOfferForm) {
        investmentOfferForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (investmentError) investmentError.style.display = 'none';

            const authUser = auth.currentUser;
            if (!authUser || !currentUser) {
                if (investmentError) {
                    investmentError.textContent = 'Authentication error. Please log in again.';
                    investmentError.style.display = 'block';
                }
                return;
            }

            const projectId = document.getElementById('investment-project-id').value;
            const founderId = document.getElementById('investment-founder-id').value;
            const projectTitle = document.getElementById('investment-project-title').value;
            const amount = parseInt(document.getElementById('investment-amount').value);
            const equity = parseFloat(document.getElementById('investment-equity').value);
            const terms = document.getElementById('investment-terms').value;
            const message = document.getElementById('investment-message').value;

            // Validate
            if (amount < 1000) {
                if (investmentError) {
                    investmentError.textContent = 'Minimum investment amount is $1,000.';
                    investmentError.style.display = 'block';
                }
                return;
            }

            if (equity < 1 || equity > 100) {
                if (investmentError) {
                    investmentError.textContent = 'Equity must be between 1% and 100%.';
                    investmentError.style.display = 'block';
                }
                return;
            }

            // Create investment offer
            const offerData = {
                projectId: projectId,
                projectTitle: projectTitle,
                founderId: founderId,
                investorId: authUser.uid,
                investorName: currentUser.name,
                currentAmount: amount,
                currentEquity: equity,
                terms: terms || '',
                message: message,
                status: 'pending', // pending, accepted, rejected, negotiating
                negotiationHistory: [{
                    from: authUser.uid,
                    fromName: currentUser.name,
                    role: 'investor',
                    amount: amount,
                    equity: equity,
                    message: message,
                    timestamp: new Date()
                }],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Save to Firestore
            db.collection('investmentOffers').add(offerData)
                .then((docRef) => {
                    console.log('Investment offer submitted with ID:', docRef.id);
                    
                    // Create notification for founder
                    createNotification(
                        founderId,
                        'offer',
                        `<strong>${currentUser.name}</strong> made an investment offer of ${formatCurrency(amount)} for ${equity}% equity`,
                        `dashboard.html#offers`
                    );
                    
                    investmentModalOverlay.classList.remove('active');
                    investmentOfferForm.reset();
                    alert('Investment offer submitted successfully! The founder will receive your offer.');
                })
                .catch((error) => {
                    console.error('Error submitting investment offer:', error);
                    if (investmentError) {
                        investmentError.textContent = `Error: ${error.message}`;
                        investmentError.style.display = 'block';
                    }
                });
        });
    }

    // ---
    // 15. INVESTMENT OFFERS MANAGEMENT SYSTEM
    // ---

    // Load offers for founders
    function loadFounderOffers(userId) {
        if (!founderOffersContainer || !userId) return;

        console.log('Loading offers for founder:', userId);

        // Clean up previous listener
        if (unsubscribeFounderOffersListener) {
            unsubscribeFounderOffersListener();
            unsubscribeFounderOffersListener = null;
        }

        unsubscribeFounderOffersListener = db.collection('investmentOffers')
            .where('founderId', '==', userId)
            .onSnapshot((querySnapshot) => {
                console.log('Founder offers received:', querySnapshot.size, 'offers');

                if (querySnapshot.empty) {
                    founderOffersContainer.innerHTML = '<p>No investment offers received yet.</p>';
                    return;
                }

                // Convert to array and sort
                const offers = [];
                querySnapshot.forEach((doc) => {
                    offers.push({ id: doc.id, ...doc.data() });
                });

                // Sort by updated date (most recent first)
                offers.sort((a, b) => {
                    const timeA = a.updatedAt ? (a.updatedAt.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt)) : new Date(0);
                    const timeB = b.updatedAt ? (b.updatedAt.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt)) : new Date(0);
                    return timeB - timeA;
                });

                renderFounderOffers(offers);
            }, (error) => {
                console.error('Error loading founder offers:', error);
                founderOffersContainer.innerHTML = '<p>Error loading offers. Please try again.</p>';
            });
    }

    // Render founder offers
    function renderFounderOffers(offers) {
        // Build HTML efficiently using array
        const offersHtmlArray = offers.map((offer) => {
            return `
                <div class="offer-card">
                    <div class="offer-card-header">
                        <div class="offer-project-info">
                            <h3>${offer.projectTitle}</h3>
                            <p>From: ${offer.investorName}</p>
                        </div>
                        <span class="offer-status-badge ${offer.status}">${offer.status}</span>
                    </div>

                    <div class="offer-details">
                        <div class="offer-detail-item">
                            <span class="offer-detail-label">Current Offer Amount</span>
                            <span class="offer-detail-value amount">$${(offer.currentAmount || 0).toLocaleString()}</span>
                        </div>
                        <div class="offer-detail-item">
                            <span class="offer-detail-label">Equity Requested</span>
                            <span class="offer-detail-value">${offer.currentEquity || 0}%</span>
                        </div>
                    </div>

                    ${offer.message ? `
                        <div class="offer-message">
                            <div class="offer-message-label">Investor Message:</div>
                            <div class="offer-message-content">${offer.message}</div>
                        </div>
                    ` : ''}

                    ${offer.terms ? `
                        <div class="offer-message">
                            <div class="offer-message-label">Terms:</div>
                            <div class="offer-message-content">${offer.terms}</div>
                        </div>
                    ` : ''}

                    ${offer.negotiationHistory && offer.negotiationHistory.length > 1 ? `
                        <div class="negotiation-history">
                            <h4>Negotiation History</h4>
                            ${offer.negotiationHistory.slice().reverse().map(item => `
                                <div class="negotiation-item">
                                    <div class="negotiation-item-header">
                                        <span class="negotiation-item-sender">${item.fromName} (${item.role})</span>
                                        <span class="negotiation-item-time">${formatTimestamp(item.timestamp)}</span>
                                    </div>
                                    <div class="negotiation-item-details">
                                        <span>Amount: <strong>$${(item.amount || 0).toLocaleString()}</strong></span>
                                        <span>Equity: <strong>${item.equity}%</strong></span>
                                    </div>
                                    <div class="negotiation-item-message">"${item.message}"</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}

                    <div class="offer-actions">
                        ${offer.status === 'pending' || offer.status === 'negotiating' ? `
                            <button class="btn btn-primary" onclick="acceptOffer('${offer.id}')">Accept Offer</button>
                            <button class="btn btn-secondary" onclick="openCounterOfferModal('${offer.id}', ${offer.currentAmount}, ${offer.currentEquity}, '${offer.investorName}')">Counter Offer</button>
                            <button class="btn btn-danger" onclick="rejectOffer('${offer.id}')">Reject</button>
                        ` : offer.status === 'accepted' ? `
                            <p style="color: #4CAF50; font-weight: 600;">✓ Offer Accepted</p>
                        ` : `
                            <p style="color: #ff4444; font-weight: 600;">✗ Offer Rejected</p>
                        `}
                    </div>
                </div>
            `;
        });

        // Single DOM update
        founderOffersContainer.innerHTML = offersHtmlArray.join('');
    }

    // Load offers for investors
    function loadInvestorOffers(userId) {
        if (!investorOffersContainer || !userId) return;

        console.log('Loading offers for investor:', userId);

        // Clean up previous listener
        if (unsubscribeInvestorOffersListener) {
            unsubscribeInvestorOffersListener();
            unsubscribeInvestorOffersListener = null;
        }

        unsubscribeInvestorOffersListener = db.collection('investmentOffers')
            .where('investorId', '==', userId)
            .onSnapshot((querySnapshot) => {
                console.log('Investor offers received:', querySnapshot.size, 'offers');

                if (querySnapshot.empty) {
                    investorOffersContainer.innerHTML = '<p>No investment offers sent yet. Visit a project page to make an offer.</p>';
                    return;
                }

                // Convert to array and sort
                const offers = [];
                querySnapshot.forEach((doc) => {
                    offers.push({ id: doc.id, ...doc.data() });
                });

                // Sort by updated date (most recent first)
                offers.sort((a, b) => {
                    const timeA = a.updatedAt ? (a.updatedAt.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt)) : new Date(0);
                    const timeB = b.updatedAt ? (b.updatedAt.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt)) : new Date(0);
                    return timeB - timeA;
                });

                renderInvestorOffers(offers);
            }, (error) => {
                console.error('Error loading investor offers:', error);
                investorOffersContainer.innerHTML = '<p>Error loading offers. Please try again.</p>';
            });
    }

    // Render investor offers
    function renderInvestorOffers(offers) {
        // Build HTML efficiently using array
        const offersHtmlArray = offers.map((offer) => {
            return `
                <div class="offer-card">
                    <div class="offer-card-header">
                        <div class="offer-project-info">
                            <h3>${offer.projectTitle}</h3>
                            <p>Sent to founder</p>
                        </div>
                        <span class="offer-status-badge ${offer.status}">${offer.status}</span>
                    </div>

                    <div class="offer-details">
                        <div class="offer-detail-item">
                            <span class="offer-detail-label">Your Offer Amount</span>
                            <span class="offer-detail-value amount">$${(offer.currentAmount || 0).toLocaleString()}</span>
                        </div>
                        <div class="offer-detail-item">
                            <span class="offer-detail-label">Equity Requested</span>
                            <span class="offer-detail-value">${offer.currentEquity || 0}%</span>
                        </div>
                    </div>

                    ${offer.negotiationHistory && offer.negotiationHistory.length > 1 ? `
                        <div class="negotiation-history">
                            <h4>Negotiation History</h4>
                            ${offer.negotiationHistory.slice().reverse().map(item => `
                                <div class="negotiation-item">
                                    <div class="negotiation-item-header">
                                        <span class="negotiation-item-sender">${item.fromName} (${item.role})</span>
                                        <span class="negotiation-item-time">${formatTimestamp(item.timestamp)}</span>
                                    </div>
                                    <div class="negotiation-item-details">
                                        <span>Amount: <strong>$${(item.amount || 0).toLocaleString()}</strong></span>
                                        <span>Equity: <strong>${item.equity}%</strong></span>
                                    </div>
                                    <div class="negotiation-item-message">"${item.message}"</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}

                    <div class="offer-actions">
                        ${offer.status === 'pending' ? `
                            <p style="color: var(--color-text-secondary);">Waiting for founder's response...</p>
                        ` : offer.status === 'negotiating' ? `
                            <button class="btn btn-primary" onclick="acceptCounterOffer('${offer.id}')">Accept Counter Offer</button>
                            <button class="btn btn-secondary" onclick="openCounterOfferModal('${offer.id}', ${offer.currentAmount}, ${offer.currentEquity}, 'Founder')">Counter Again</button>
                            <button class="btn btn-danger" onclick="withdrawOffer('${offer.id}')">Withdraw Offer</button>
                        ` : offer.status === 'accepted' ? `
                            <p style="color: #4CAF50; font-weight: 600;">✓ Offer Accepted - Deal Closed!</p>
                        ` : `
                            <p style="color: #ff4444; font-weight: 600;">✗ Offer Rejected</p>
                        `}
                    </div>
                </div>
            `;
        });

        // Single DOM update
        investorOffersContainer.innerHTML = offersHtmlArray.join('');
    }

    // Accept offer (founder accepts investor's offer)
    window.acceptOffer = function(offerId) {
        if (!confirm('Are you sure you want to accept this investment offer?')) return;

        db.collection('investmentOffers').doc(offerId).update({
            status: 'accepted',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
            .then(() => {
                console.log('Offer accepted successfully');
                alert('Investment offer accepted! The investor will be notified.');
            })
            .catch((error) => {
                console.error('Error accepting offer:', error);
                alert('Error accepting offer: ' + error.message);
            });
    };

    // Reject offer
    window.rejectOffer = function(offerId) {
        if (!confirm('Are you sure you want to reject this investment offer?')) return;

        db.collection('investmentOffers').doc(offerId).update({
            status: 'rejected',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
            .then(() => {
                console.log('Offer rejected');
                alert('Investment offer rejected.');
            })
            .catch((error) => {
                console.error('Error rejecting offer:', error);
                alert('Error rejecting offer: ' + error.message);
            });
    };

    // Withdraw offer (investor withdraws)
    window.withdrawOffer = function(offerId) {
        if (!confirm('Are you sure you want to withdraw this offer?')) return;

        db.collection('investmentOffers').doc(offerId).update({
            status: 'rejected',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
            .then(() => {
                console.log('Offer withdrawn');
                alert('Offer withdrawn successfully.');
            })
            .catch((error) => {
                console.error('Error withdrawing offer:', error);
                alert('Error withdrawing offer: ' + error.message);
            });
    };

    // Accept counter offer (investor accepts founder's counter)
    window.acceptCounterOffer = function(offerId) {
        if (!confirm('Are you sure you want to accept this counter offer?')) return;

        db.collection('investmentOffers').doc(offerId).update({
            status: 'accepted',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
            .then(() => {
                console.log('Counter offer accepted');
                alert('Counter offer accepted! Deal is closed.');
            })
            .catch((error) => {
                console.error('Error accepting counter offer:', error);
                alert('Error accepting counter offer: ' + error.message);
            });
    };

    // Open counter offer modal
    window.openCounterOfferModal = function(offerId, currentAmount, currentEquity, otherPartyName) {
        if (!counterOfferModalOverlay) return;

        document.getElementById('counter-offer-id').value = offerId;
        document.getElementById('original-offer-display').textContent = 
            `$${currentAmount.toLocaleString()} for ${currentEquity}% equity from ${otherPartyName}`;
        document.getElementById('counter-amount').value = currentAmount;
        document.getElementById('counter-equity').value = currentEquity;
        document.getElementById('counter-message').value = '';

        counterOfferModalOverlay.classList.add('active');
        if (counterOfferError) counterOfferError.style.display = 'none';
    };

    // Close counter offer modal
    if (closeCounterOfferModalBtn) {
        closeCounterOfferModalBtn.addEventListener('click', () => {
            counterOfferModalOverlay.classList.remove('active');
        });
    }

    if (counterOfferModalOverlay) {
        counterOfferModalOverlay.addEventListener('click', (e) => {
            if (e.target === counterOfferModalOverlay) {
                counterOfferModalOverlay.classList.remove('active');
            }
        });
    }

    // Submit counter offer
    if (counterOfferForm) {
        counterOfferForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (counterOfferError) counterOfferError.style.display = 'none';

            const authUser = auth.currentUser;
            if (!authUser || !currentUser) {
                if (counterOfferError) {
                    counterOfferError.textContent = 'Authentication error. Please log in again.';
                    counterOfferError.style.display = 'block';
                }
                return;
            }

            const offerId = document.getElementById('counter-offer-id').value;
            const counterAmount = parseInt(document.getElementById('counter-amount').value);
            const counterEquity = parseFloat(document.getElementById('counter-equity').value);
            const counterMessage = document.getElementById('counter-message').value;

            // Validate
            if (counterAmount < 1000) {
                if (counterOfferError) {
                    counterOfferError.textContent = 'Minimum amount is $1,000.';
                    counterOfferError.style.display = 'block';
                }
                return;
            }

            if (counterEquity < 1 || counterEquity > 100) {
                if (counterOfferError) {
                    counterOfferError.textContent = 'Equity must be between 1% and 100%.';
                    counterOfferError.style.display = 'block';
                }
                return;
            }

            const negotiationEntry = {
                from: authUser.uid,
                fromName: currentUser.name,
                role: currentUser.role,
                amount: counterAmount,
                equity: counterEquity,
                message: counterMessage,
                timestamp: new Date()
            };

            // Update offer with counter
            db.collection('investmentOffers').doc(offerId).update({
                currentAmount: counterAmount,
                currentEquity: counterEquity,
                status: 'negotiating',
                negotiationHistory: firebase.firestore.FieldValue.arrayUnion(negotiationEntry),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
                .then(() => {
                    console.log('Counter offer sent');
                    counterOfferModalOverlay.classList.remove('active');
                    counterOfferForm.reset();
                    alert('Counter offer sent successfully!');
                })
                .catch((error) => {
                    console.error('Error sending counter offer:', error);
                    if (counterOfferError) {
                        counterOfferError.textContent = `Error: ${error.message}`;
                        counterOfferError.style.display = 'block';
                    }
                });
        });
    }

    // ===================
    // WATCHLIST FUNCTIONS
    // ===================

    // Global function to remove from watchlist
    window.removeFromWatchlist = function(projectId, projectTitle) {
        if (!currentUser || currentUser.role !== 'investor') {
            alert('Please log in as an Investor to manage your watchlist.');
            return;
        }

        if (!confirm(`Remove "${projectTitle}" from your watchlist?`)) {
            return;
        }

        console.log('Removing project from watchlist:', projectId);

        const authUser = auth.currentUser;
        if (!authUser) {
            alert('Authentication error. Please log in again.');
            return;
        }

        const userRef = db.collection('users').doc(authUser.uid);
        
        // Create an update object to delete the specific project from watchlist
        const watchlistUpdate = {
            [`watchlist.${projectId}`]: firebase.firestore.FieldValue.delete()
        };

        userRef.update(watchlistUpdate)
            .then(() => {
                console.log('Project removed from watchlist successfully.');
                
                // Update local currentUser state
                if (currentUser.watchlist && currentUser.watchlist[projectId]) {
                    delete currentUser.watchlist[projectId];
                }
                
                // Reload the watchlist display
                loadWatchlist(authUser.uid);
                
                // Update button state if on startup detail page
                const watchlistBtn = document.getElementById('add-to-watchlist-btn');
                if (watchlistBtn && startupPageProjectId === projectId) {
                    watchlistBtn.textContent = 'Add to Watchlist';
                    watchlistBtn.disabled = false;
                }
            })
            .catch((error) => {
                console.error("Error removing from watchlist: ", error);
                alert('Could not remove from watchlist: ' + error.message);
            });
    };

    function loadWatchlist(userId) {
        console.log('=== Loading Watchlist ===');
        console.log('User ID:', userId);
        
        if (!watchlistContainer) {
            console.warn('Watchlist container not found in DOM');
            return;
        }

        // Show loading
        watchlistContainer.innerHTML = '<p>Loading your watchlist...</p>';

        // Fetch fresh user data from Firestore to get the latest watchlist
        db.collection('users').doc(userId).get()
            .then((userDoc) => {
                if (!userDoc.exists) {
                    console.warn('User document not found');
                    watchlistContainer.innerHTML = '<p>Error loading watchlist. Please try again.</p>';
                    return;
                }

                const userData = userDoc.data();
                const watchlistData = userData.watchlist;
                
                console.log('User Data:', userData);
                console.log('Watchlist Data:', watchlistData);
                console.log('Watchlist Data Type:', typeof watchlistData);

                // Convert watchlist object to array of project IDs
                let watchlistArray = [];
                if (watchlistData && typeof watchlistData === 'object') {
                    watchlistArray = Object.keys(watchlistData);
                    console.log('Extracted project IDs:', watchlistArray);
                } else {
                    console.log('No valid watchlist data');
                }

                // If no watchlist or empty, show message
                if (watchlistArray.length === 0) {
                    console.log('Watchlist is empty, showing empty message');
                    watchlistContainer.innerHTML = '<p>No startups in your watchlist yet. Browse projects and add them to your watchlist!</p>';
                    return;
                }

                console.log('Fetching', watchlistArray.length, 'projects from Firestore');

                // Fetch all projects in the watchlist
                return db.collection('projects')
                    .where(firebase.firestore.FieldPath.documentId(), 'in', watchlistArray)
                    .get();
            })
            .then((snapshot) => {
                if (!snapshot) return; // Already handled empty watchlist

                console.log('Firestore query returned', snapshot.size, 'documents');
                
                if (snapshot.empty) {
                    console.warn('No projects found in Firestore for watchlist IDs');
                    watchlistContainer.innerHTML = '<p>No startups found in your watchlist.</p>';
                    return;
                }

                let html = '<div class="projects-grid">';
                snapshot.forEach((doc) => {
                    const project = doc.data();
                    const projectId = doc.id;
                    console.log('Processing project:', projectId, project.title);
                    html += `
                        <div class="project-card watchlist-item">
                            <div onclick="window.location.href='startup.html?id=${projectId}&title=${encodeURIComponent(project.title)}'">
                                <h3>${project.title || 'Untitled Project'}</h3>
                                <p class="project-category">${project.category || 'N/A'}</p>
                                <p class="project-description">${project.description ? (project.description.substring(0, 100) + (project.description.length > 100 ? '...' : '')) : 'No description available.'}</p>
                                <div class="project-stats">
                                    <div class="stat">
                                        <span class="stat-label">Funding Goal</span>
                                        <span class="stat-value">$${(project.fundingGoal || 0).toLocaleString()}</span>
                                    </div>
                                    <div class="stat">
                                        <span class="stat-label">Revenue</span>
                                        <span class="stat-value">$${(project.currentRevenue || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            <button class="remove-watchlist-btn" onclick="event.stopPropagation(); removeFromWatchlist('${projectId}', '${project.title.replace(/'/g, "\\'")}');">
                                Delete
                            </button>
                        </div>
                    `;
                });
                html += '</div>';
                watchlistContainer.innerHTML = html;
                console.log('Watchlist rendered successfully with', snapshot.size, 'projects');
            })
            .catch((error) => {
                console.error('Error loading watchlist from Firestore:', error);
                console.error('Error details:', error.message);
                watchlistContainer.innerHTML = '<p class="error-message">Error loading watchlist: ' + error.message + '</p>';
          });
    }

}); // End DOMContentLoaded