document.addEventListener('DOMContentLoaded', () => {
    // Impact Counter Animation
    const counters = document.querySelectorAll('.counter');
    const speed = 200; // The lower the slower

    const animateCounters = () => {
        counters.forEach(counter => {
            const updateCount = () => {
                const target = +counter.getAttribute('data-target');
                const count = +counter.innerText.replace(/,/g, '');
                const inc = target / speed;

                if (count < target) {
                    counter.innerText = Math.ceil(count + inc).toLocaleString();
                    setTimeout(updateCount, 20);
                } else {
                    counter.innerText = target.toLocaleString() + (target > 1000 ? '+' : '');
                }
            };

            // Intersection Observer to start animation when in view
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    updateCount();
                    observer.disconnect();
                }
            });

            observer.observe(counter);
        });
    };

    animateCounters();

    // --- STATE MANAGEMENT (Mock Backend) ---
    // Initialize or get state
    const initState = () => {
        if (!localStorage.getItem('shareplate_donations')) {
            localStorage.setItem('shareplate_donations', JSON.stringify([
                { id: 1, title: 'City Bakery', type: 'Baked Goods', servings: 30, timeRemaining: '2 hours', lat: 40.7128, lng: -74.0060, status: 'available' },
                { id: 2, title: 'Green Bowl Cafe', type: 'Hot Meals', servings: 15, timeRemaining: '1 hour', lat: 40.7200, lng: -73.9900, status: 'available' },
                { id: 3, title: 'Fresh Grocer', type: 'Fresh Produce', servings: 20, timeRemaining: '4 hours', lat: 40.7050, lng: -74.0150, status: 'available' }
            ]));
        }
        if (!localStorage.getItem('shareplate_admin_requests')) {
            localStorage.setItem('shareplate_admin_requests', JSON.stringify([
                { id: 1, name: 'Sunset Bakery', type: 'Donor', location: 'San Francisco, CA', date: 'Oct 24, 2026', status: 'pending' },
                { id: 2, name: 'Community Helpers Network', type: 'NGO', location: 'Oakland, CA', date: 'Oct 25, 2026', status: 'pending' },
                { id: 3, name: 'Fresh Mart Grocery', type: 'Donor', location: 'San Jose, CA', date: 'Oct 26, 2026', status: 'pending' }
            ]));
        }
    };
    initState();

    const getDonations = () => JSON.parse(localStorage.getItem('shareplate_donations'));
    const addDonation = (donation) => {
        const donations = getDonations();
        donation.id = Date.now();
        donation.status = 'available';
        donations.push(donation);
        localStorage.setItem('shareplate_donations', JSON.stringify(donations));
        // Dispatch custom event to update UI across scripts if needed
        window.dispatchEvent(new Event('donationsUpdated'));
    };

    // --- GEOLOCATION ---
    const locationInput = document.getElementById('location-input');
    const getLocationBtn = document.getElementById('get-location-btn');
    let currentLat = 40.7128; // Default to NYC
    let currentLng = -74.0060;

    let miniMap;
    const miniMapElement = document.getElementById('mini-map');
    if (miniMapElement) {
        miniMap = L.map('mini-map', {
            zoomControl: false,
            dragging: false,
            scrollWheelZoom: false
        }).setView([currentLat, currentLng], 14);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(miniMap);

        let marker = L.marker([currentLat, currentLng]).addTo(miniMap);

        if (getLocationBtn) {
            getLocationBtn.addEventListener('click', (e) => {
                e.preventDefault();
                getLocationBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Locating...';

                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((position) => {
                        currentLat = position.coords.latitude;
                        currentLng = position.coords.longitude;

                        // Update Map
                        miniMap.setView([currentLat, currentLng], 15);
                        marker.setLatLng([currentLat, currentLng]);

                        // Reverse Geocoding (Mock implementation for prototype)
                        // In a real app, you'd call a geocoding API here
                        const mockAddress = `Lat: ${currentLat.toFixed(4)}, Lng: ${currentLng.toFixed(4)}`;
                        if (locationInput) locationInput.value = "Current Location Detected";

                        getLocationBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Located';
                        getLocationBtn.classList.replace('btn-outline', 'btn-primary');

                        setTimeout(() => {
                            getLocationBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Get Location';
                            getLocationBtn.classList.replace('btn-primary', 'btn-outline');
                        }, 2000);

                    }, (error) => {
                        alert("Error getting location. Please enter manually.");
                        getLocationBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Get Location';
                    });
                } else {
                    alert("Geolocation is not supported by this browser.");
                }
            });
        }
    }

    // --- MAIN MAP & DONATION LIST (NGO View & Combined View) ---
    // Custom icon
    const pinIcon = L.divIcon({
        className: 'custom-pin',
        html: '<div style="background-color: #E67E22; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    let mainMap;
    let markersLayer = L.layerGroup();
    const mainMapElement = document.getElementById('main-map');

    // Function to calculate mock distance
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        // Simple mock calculation for prototype UI display
        const dist = Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2)) * 100;
        return dist.toFixed(1);
    };

    const renderAvailableFoodList = () => {
        const listContainer = document.querySelector('.food-list');
        if (!listContainer) return;

        const donations = getDonations().filter(d => d.status === 'available');
        listContainer.innerHTML = ''; // Clear current

        donations.forEach(d => {
            const distance = calculateDistance(currentLat, currentLng, d.lat, d.lng);
            const itemHTML = `
                <div class="food-item" data-id="${d.id}">
                    <div class="food-details">
                        <h4>${d.title}</h4>
                        <p>${d.type} &bull; ${d.servings} Servings</p>
                        <p class="time-urgent"><i class="fa-regular fa-clock"></i> ${d.timeRemaining}</p>
                        <p style="font-size: 0.8rem; margin-top: 4px; color: var(--text-muted);"><i class="fa-solid fa-location-dot"></i> ~${distance} km away</p>
                    </div>
                    <button class="btn btn-outline btn-claim">Claim</button>
                </div>
            `;
            listContainer.insertAdjacentHTML('beforeend', itemHTML);
        });

        // Reattach claim event listeners
        attachClaimListeners();
    };

    const updateMainMap = () => {
        if (!mainMapElement) return;

        if (!mainMap) {
            mainMap = L.map('main-map').setView([40.7128, -74.0060], 13);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(mainMap);
            markersLayer.addTo(mainMap);
        }

        markersLayer.clearLayers();
        const donations = getDonations().filter(d => d.status === 'available');

        donations.forEach(loc => {
            if (loc.lat && loc.lng) {
                L.marker([loc.lat, loc.lng], { icon: pinIcon })
                    .bindPopup(`<b>${loc.title}</b><br>${loc.type}`)
                    .addTo(markersLayer);
            }
        });
    };

    // Initialize list and map
    if (mainMapElement || document.querySelector('.food-list')) {
        renderAvailableFoodList();
        updateMainMap();
    }

    // Listen for updates from other scripts/tabs
    window.addEventListener('storage', (e) => {
        if (e.key === 'shareplate_donations') {
            renderAvailableFoodList();
            updateMainMap();
        }
    });
    window.addEventListener('donationsUpdated', () => {
        renderAvailableFoodList();
        updateMainMap();
    });

    // --- FORM SUBMISSION (Donor View) ---
    const submitBtn = document.querySelector('.mock-form .btn-primary');
    if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // Gather mock data from form
            const categorySelect = document.querySelector('.mock-form select');
            const servingsInput = document.querySelector('.mock-form input[type="number"]');
            const timeInput = document.querySelector('.mock-form input[type="time"]');

            const newDonation = {
                title: 'Your Recent Post', // Normally user's restaurant name
                type: categorySelect ? categorySelect.value : 'Misc Items',
                servings: servingsInput && servingsInput.value ? servingsInput.value : 10,
                timeRemaining: timeInput && timeInput.value ? `Best before ${timeInput.value}` : '4 hours left',
                lat: currentLat + (Math.random() - 0.5) * 0.02, // slight jitter for map visibility
                lng: currentLng + (Math.random() - 0.5) * 0.02
            };

            addDonation(newDonation);

            const originalText = submitBtn.innerText;
            submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Posted Successfully!';
            submitBtn.style.background = 'var(--primary-green)';

            // Clear form inputs
            if (servingsInput) servingsInput.value = '';
            if (locationInput) locationInput.value = '';

            setTimeout(() => {
                submitBtn.innerText = originalText;
                submitBtn.style.background = '';
            }, 3000);
        });
    }

    // --- MOCK CLAIM BUTTONS ---
    function attachClaimListeners() {
        const claimBtns = document.querySelectorAll('.btn-claim');
        claimBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();

                const itemDiv = btn.closest('.food-item');
                const id = parseInt(itemDiv.getAttribute('data-id'));

                // Update state
                const donations = getDonations();
                const updatedDonations = donations.map(d => {
                    if (d.id === id) d.status = 'claimed';
                    return d;
                });
                localStorage.setItem('shareplate_donations', JSON.stringify(updatedDonations));

                // UI update
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Claimed';
                btn.classList.remove('btn-outline');
                btn.classList.add('btn-primary');
                btn.style.borderColor = 'transparent';
                btn.disabled = true;

                itemDiv.style.opacity = '0.5';

                // Trigger map refresh after small delay
                setTimeout(() => {
                    window.dispatchEvent(new Event('donationsUpdated'));
                }, 1000);
            });
        });
    }

    // --- TAG INPUT ---
    const tagInput = document.querySelector('.tags-input input');
    const tagsWrapper = document.querySelector('.tags-input');

    if (tagInput && tagsWrapper) {
        tagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && tagInput.value.trim() !== '') {
                e.preventDefault();
                const newTag = document.createElement('span');
                newTag.className = 'tag';
                newTag.innerHTML = `${tagInput.value.trim()} <i class="fa-solid fa-xmark"></i>`;

                newTag.querySelector('i').addEventListener('click', () => {
                    newTag.remove();
                });

                tagsWrapper.insertBefore(newTag, tagInput);
                tagInput.value = '';
            }
        });

        const existingTags = tagsWrapper.querySelectorAll('.tag i');
        existingTags.forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.target.parentElement.remove();
            });
        });
    }

    // --- SMOOTH SCROLL ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // --- AUTHENTICATION & MODAL SYSTEM ---
    const showToast = (message, type = 'success') => {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast-item ${type}`;
        const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-info';
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    };

    const injectAuthModal = () => {
        if (document.getElementById('authModalOverlay')) return;
        const modalHTML = `
        <div class="auth-modal-overlay" id="authModalOverlay">
            <div class="auth-modal-card">
                <button class="auth-close-btn" id="closeAuthModal"><i class="fa-solid fa-xmark"></i></button>
                <div class="auth-header">
                    <div class="auth-logo"><i class="fa-solid fa-plate-wheat"></i> SharePlate</div>
                    <p style="font-size: 0.9rem; color: var(--text-muted);">Join our community fighting hunger & food waste.</p>
                </div>
                <div class="auth-tabs">
                    <button class="auth-tab-btn active" id="tabLoginBtn">Log In</button>
                    <button class="auth-tab-btn" id="tabSignupBtn">Sign Up</button>
                </div>

                <!-- LOGIN FORM -->
                <form id="loginForm">
                    <span class="demo-pills-label">Quick Demo Auto-Fill:</span>
                    <div class="demo-pills">
                        <button type="button" class="demo-pill" id="demoDonorBtn">🍕 Donor</button>
                        <button type="button" class="demo-pill ngo" id="demoNgoBtn">🤝 NGO</button>
                        <button type="button" class="demo-pill admin" id="demoAdminBtn">🛡️ Admin</button>
                    </div>

                    <div class="auth-form-group">
                        <label>Email Address</label>
                        <div class="auth-input-wrapper">
                            <i class="fa-regular fa-envelope"></i>
                            <input type="email" id="loginEmail" placeholder="name@example.com" required>
                        </div>
                    </div>
                    <div class="auth-form-group">
                        <label>Password</label>
                        <div class="auth-input-wrapper">
                            <i class="fa-solid fa-lock"></i>
                            <input type="password" id="loginPassword" placeholder="••••••••" required>
                        </div>
                    </div>
                    <div class="auth-form-group">
                        <label>Login As Role</label>
                        <div class="auth-input-wrapper">
                            <i class="fa-solid fa-user-tag"></i>
                            <select id="loginRole">
                                <option value="Donor">Food Donor (Restaurant / Caterer / Individual)</option>
                                <option value="NGO">NGO / Community Shelter</option>
                                <option value="Admin">System Administrator</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary auth-submit-btn">Log In</button>
                </form>

                <!-- SIGNUP FORM -->
                <form id="signupForm" style="display: none;">
                    <div class="auth-form-group">
                        <label>Account Type</label>
                        <div class="auth-input-wrapper">
                            <i class="fa-solid fa-users"></i>
                            <select id="signupRole">
                                <option value="Donor">Food Donor (Restaurant/Grocery/Event)</option>
                                <option value="NGO">Food Receiver (NGO / Food Bank)</option>
                            </select>
                        </div>
                    </div>
                    <div class="auth-form-group">
                        <label>Full Name / Organization</label>
                        <div class="auth-input-wrapper">
                            <i class="fa-regular fa-id-badge"></i>
                            <input type="text" id="signupName" placeholder="e.g. Green Eats Cafe" required>
                        </div>
                    </div>
                    <div class="auth-form-group">
                        <label>Email Address</label>
                        <div class="auth-input-wrapper">
                            <i class="fa-regular fa-envelope"></i>
                            <input type="email" id="signupEmail" placeholder="contact@domain.com" required>
                        </div>
                    </div>
                    <div class="auth-form-group">
                        <label>Password</label>
                        <div class="auth-input-wrapper">
                            <i class="fa-solid fa-lock"></i>
                            <input type="password" id="signupPassword" placeholder="••••••••" required>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary auth-submit-btn">Create Account</button>
                </form>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    };

    injectAuthModal();

    const overlay = document.getElementById('authModalOverlay');
    const closeBtn = document.getElementById('closeAuthModal');
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    const tabSignupBtn = document.getElementById('tabSignupBtn');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    const openAuthModal = (tab = 'login') => {
        overlay.classList.add('active');
        if (tab === 'login') {
            tabLoginBtn.classList.add('active');
            tabSignupBtn.classList.remove('active');
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
        } else {
            tabSignupBtn.classList.add('active');
            tabLoginBtn.classList.remove('active');
            signupForm.style.display = 'block';
            loginForm.style.display = 'none';
        }
    };

    const closeAuthModalFunc = () => {
        overlay.classList.remove('active');
    };

    if (closeBtn) closeBtn.addEventListener('click', closeAuthModalFunc);
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeAuthModalFunc();
        });
    }

    if (tabLoginBtn && tabSignupBtn) {
        tabLoginBtn.addEventListener('click', () => {
            tabLoginBtn.classList.add('active');
            tabSignupBtn.classList.remove('active');
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
        });
        tabSignupBtn.addEventListener('click', () => {
            tabSignupBtn.classList.add('active');
            tabLoginBtn.classList.remove('active');
            signupForm.style.display = 'block';
            loginForm.style.display = 'none';
        });
    }

    // Demo buttons
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginRole = document.getElementById('loginRole');

    document.getElementById('demoDonorBtn')?.addEventListener('click', () => {
        loginEmail.value = 'donor@shareplate.org';
        loginPassword.value = 'donor123';
        loginRole.value = 'Donor';
    });
    document.getElementById('demoNgoBtn')?.addEventListener('click', () => {
        loginEmail.value = 'ngo@shareplate.org';
        loginPassword.value = 'ngo123';
        loginRole.value = 'NGO';
    });
    document.getElementById('demoAdminBtn')?.addEventListener('click', () => {
        loginEmail.value = 'admin@shareplate.org';
        loginPassword.value = 'admin123';
        loginRole.value = 'Admin';
    });

    // Session Management
    const getUserSession = () => JSON.parse(localStorage.getItem('shareplate_user'));
    const setUserSession = (user) => {
        localStorage.setItem('shareplate_user', JSON.stringify(user));
        updateNavActions();
    };
    const logoutSession = () => {
        localStorage.removeItem('shareplate_user');
        updateNavActions();
        showToast('Logged out successfully', 'info');
    };

    const updateNavActions = () => {
        const navActionsList = document.querySelectorAll('.nav-actions');
        const user = getUserSession();

        navActionsList.forEach(navActions => {
            if (user) {
                const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'US';
                let dashboardUrl = 'index.html#dashboard';
                if (user.role === 'NGO') dashboardUrl = 'ngo-dashboard.html';
                if (user.role === 'Admin') dashboardUrl = 'admin-dashboard.html';

                navActions.innerHTML = `
                    <div class="user-nav-profile">
                        <div class="user-avatar-badge">${initials}</div>
                        <span style="font-weight: 600; color: var(--text-dark);">${user.name}</span>
                        <i class="fa-solid fa-chevron-down" style="font-size: 0.75rem; color: var(--text-muted);"></i>
                        <div class="user-nav-dropdown">
                            <a href="${dashboardUrl}"><i class="fa-solid fa-gauge-high"></i> Dashboard (${user.role})</a>
                            <a href="partner-request.html"><i class="fa-solid fa-handshake"></i> Partner Request</a>
                            <button type="button" class="logout-btn" id="logoutBtn"><i class="fa-solid fa-right-from-bracket"></i> Log Out</button>
                        </div>
                    </div>
                `;
            } else {
                navActions.innerHTML = `
                    <a href="#" class="btn btn-outline btn-login-trigger">Log In</a>
                    <a href="#" class="btn btn-primary btn-signup-trigger">Sign Up</a>
                `;
            }
        });

        // Rebind click events
        document.querySelectorAll('.btn-login-trigger, .btn-login').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                openAuthModal('login');
            });
        });
        document.querySelectorAll('.btn-signup-trigger, .btn-signup').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                openAuthModal('signup');
            });
        });
        document.querySelectorAll('#logoutBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                logoutSession();
            });
        });
    };

    updateNavActions();

    // Form Submit Handlers
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const role = loginRole.value;
            const email = loginEmail.value;
            let name = 'Demo User';
            if (role === 'Donor') name = 'Green Eats Cafe';
            if (role === 'NGO') name = 'Hope Foundation';
            if (role === 'Admin') name = 'System Admin';

            const userObj = { email, name, role };
            setUserSession(userObj);
            closeAuthModalFunc();
            showToast(`Welcome back, ${name}! Logged in as ${role}.`, 'success');

            // Optional smart redirect
            if (role === 'NGO' && !window.location.href.includes('ngo-dashboard.html')) {
                setTimeout(() => window.location.href = 'ngo-dashboard.html', 1000);
            } else if (role === 'Admin' && !window.location.href.includes('admin-dashboard.html')) {
                setTimeout(() => window.location.href = 'admin-dashboard.html', 1000);
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const role = document.getElementById('signupRole').value;

            const userObj = { email, name, role };
            setUserSession(userObj);
            closeAuthModalFunc();
            showToast(`Account created! Welcome to SharePlate, ${name}.`, 'success');
        });
    }
});
