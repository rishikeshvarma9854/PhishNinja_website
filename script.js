// Smooth scrolling for navigation links
document.addEventListener('DOMContentLoaded', function() {
    // Theme switching functionality - React-style component
    class ThemeToggle {
        constructor() {
            this.themeToggle = document.getElementById('theme-toggle');
            this.body = document.body;
            this.currentTheme = localStorage.getItem('theme') || 'dark'; // Default to dark
            
            if (this.themeToggle) {
                this.init();
            }
        }
        
        init() {
            // Set initial theme immediately
            this.setTheme(this.currentTheme);
            
            // Add event listener
            this.themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        
        setTheme(theme) {
            this.currentTheme = theme;
            this.body.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            
            // Update button state
            if (this.themeToggle) {
                const sunIcon = this.themeToggle.querySelector('.sun-icon');
                const moonIcon = this.themeToggle.querySelector('.moon-icon');
                
                if (sunIcon && moonIcon) {
                    if (theme === 'dark') {
                        sunIcon.style.display = 'none';
                        moonIcon.style.display = 'block';
                    } else {
                        sunIcon.style.display = 'block';
                        moonIcon.style.display = 'none';
                    }
                }
            }
            
            // Update navbar immediately
            this.updateNavbar();
        }
        
        updateNavbar() {
            const navbar = document.querySelector('.navbar');
            if (!navbar) return;
            
            if (this.currentTheme === 'dark') {
                navbar.style.background = 'rgba(10, 10, 10, 0.95)';
                navbar.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
            } else {
                navbar.style.background = 'rgba(255, 255, 255, 0.95)';
                navbar.style.borderBottom = '1px solid rgba(0, 0, 0, 0.1)';
            }
        }
        
        toggleTheme() {
            const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
            this.setTheme(newTheme);
        }
    }
    
    // Initialize theme toggle
    setTimeout(() => {
        const themeToggle = new ThemeToggle();
        
        // Ensure theme is applied immediately
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.setAttribute('data-theme', savedTheme);
        
        // Also set it in the theme toggle if it exists
        if (themeToggle) {
            themeToggle.setTheme(savedTheme);
        }
    }, 100);

    // Chrome extension download counter
    let downloadCount = parseInt(localStorage.getItem('downloadCount') || '1000000');
    const usersCountElement = document.getElementById('usersCount');
    
    function updateUsersCount() {
        const formattedCount = downloadCount >= 1000000 ? 
            (downloadCount / 1000000).toFixed(1) + 'M+' : 
            downloadCount.toLocaleString() + '+';
        usersCountElement.textContent = formattedCount;
    }
    
    updateUsersCount();
    
    // Add to Chrome button functionality
    const addToChromeBtn = document.getElementById('addToChrome');
    addToChromeBtn.addEventListener('click', function() {
        // Simulate Chrome Web Store redirect
        const chromeWebStoreUrl = 'https://chromewebstore.google.com/detail/ikcooobnaejnjglfncihcjjpalcgjhmb?utm_source=item-share-cb';
        window.open(chromeWebStoreUrl, '_blank');
        
        // Increment download count
        downloadCount += Math.floor(Math.random() * 1000) + 100; // Random increment between 100-1100
        localStorage.setItem('downloadCount', downloadCount.toString());
        updateUsersCount();
        
        // Show success message
        showNotification('Redirecting to Chrome Web Store...', 'success');
    });

    // --- Google Sign-in and linking to extension ---
    // Replace this with your extension's ID when deployed
    const EXTENSION_ID = 'ikcooobnaejnjglfncihcjjpalcgjhmb';
    const GOOGLE_CLIENT_ID = '315735459323-bs54tbot9io5bfvklg8vq56g9o7q5ar5.apps.googleusercontent.com';

    const signInButton = document.querySelector('.btn-secondary');
    // Track connected state
    let connectedInfo = null;

    // Render profile UI in the sign-in button (avatar + email) when connected
    function renderProfile(info) {
        if (!signInButton) return;
        if (!info || !info.ok) {
            signInButton.innerHTML = 'Sign In';
            signInButton.title = 'Sign in with Google';
            return;
        }

        const email = info.email || '';
        const picture = info.picture || '';

        // Build avatar + email markup
        const imgHtml = picture ? `<img src="${picture}" alt="avatar" style="width:24px;height:24px;border-radius:50%;margin-right:8px;vertical-align:middle;">` : `<span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#ddd;margin-right:8px;vertical-align:middle;text-align:center;line-height:24px;color:#555;font-size:12px;">${email ? email[0].toUpperCase() : '?'}</span>`;
        signInButton.innerHTML = `${imgHtml}<span style="vertical-align:middle">${email}</span>`;
        signInButton.title = `Connected: ${email}`;
    }

    // On load, check localStorage for persisted linked info and render
    (function restoreLinkedProfile() {
        try {
            const storedEmail = localStorage.getItem('pn_linked_email');
            const storedPicture = localStorage.getItem('pn_linked_picture');
            if (storedEmail) {
                connectedInfo = { ok: true, email: storedEmail, picture: storedPicture || null };
                renderProfile(connectedInfo);
            } else {
                renderProfile(null);
            }
        } catch (e) { console.warn('restoreLinkedProfile failed', e); }
    })();
    function handleCredentialResponse(response) {
        console.debug('GSI credential response:', response);
        // response.credential is the ID token (JWT)
        const id_token = response.credential;
        if (!id_token) {
            showNotification('Sign-in failed: no token', 'info');
            return;
        }
        // Redirect to extension connect page with id_token in fragment
        const extUrl = `chrome-extension://${EXTENSION_ID}/connect.html#id_token=${encodeURIComponent(id_token)}`;
        // Open new tab (user will need extension installed for this to succeed)
        window.open(extUrl, '_blank');
        showNotification('Opening extension to complete sign-in...', 'success');
    }

    // Initialize Google Identity Services (GSI)
    try {
        window.onloadGsi = () => {
            if (window.google && window.google.accounts && window.google.accounts.id) {
                google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleCredentialResponse });
                // Render a one-tap button or attach to our custom button
                // We'll use our custom button to trigger the popup
                if (signInButton) {
                    signInButton.addEventListener('click', () => {
                        // If already connected, treat as logout
                        if (connectedInfo && connectedInfo.ok) {
                            // Open extension connect page with disconnect action
                            const extUrl = `chrome-extension://${EXTENSION_ID}/connect.html?action=disconnect`;
                            window.open(extUrl, '_blank');
                            showNotification('Opening extension to disconnect...', 'info');
                            return;
                        }
                        // Show the GSI prompt
                        google.accounts.id.prompt();
                        google.accounts.id.renderButton(document.createElement('div'), { theme: 'outline', size: 'large' });
                    });
                }
            }
        };
        // If GSI script already loaded, call directly
        if (window.google && window.google.accounts && window.google.accounts.id) window.onloadGsi();
        else window.addEventListener('load', window.onloadGsi);
    } catch (e) {
        console.warn('GSI init failed', e);
    }

    // Listen for postMessage from connect.html
    window.addEventListener('message', (ev) => {
        try {
            const msg = ev.data || {};
            if (msg.type === 'pn:connected') {
                connectedInfo = msg;
                if (msg.ok) {
                    showNotification('Connected: ' + (msg.email || ''), 'success');
                    // Persist linked info for reloads
                    localStorage.setItem('pn_linked_email', msg.email || '');
                    if (msg.picture) localStorage.setItem('pn_linked_picture', msg.picture);
                    renderProfile({ ok: true, email: msg.email, picture: msg.picture });
                } else {
                    showNotification('Connection failed: ' + (msg.error || ''), 'info');
                }
            } else if (msg.type === 'pn:disconnected') {
                connectedInfo = null;
                showNotification('Disconnected', 'info');
                localStorage.removeItem('pn_linked_email');
                localStorage.removeItem('pn_linked_picture');
                renderProfile(null);
            }
        } catch (e) { console.warn('postMessage handler error', e); }
    });

    // Demo video scroll function
    window.scrollToDemo = function() {
        const demoSection = document.getElementById('demo');
        if (demoSection) {
            const offsetTop = demoSection.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    };

    // Notification system
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : '#10b981'};
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Smooth scrolling for anchor links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80; // Account for fixed navbar
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Navbar background change on scroll
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', function() {
        const currentTheme = document.body.getAttribute('data-theme');
        
        if (window.scrollY > 50) {
            if (currentTheme === 'dark') {
                navbar.style.background = 'rgba(10, 10, 10, 0.98)';
                navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.3)';
            } else {
                navbar.style.background = 'rgba(255, 255, 255, 0.98)';
                navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
            }
        } else {
            if (currentTheme === 'dark') {
                navbar.style.background = 'rgba(10, 10, 10, 0.95)';
                navbar.style.boxShadow = 'none';
            } else {
                navbar.style.background = 'rgba(255, 255, 255, 0.95)';
                navbar.style.boxShadow = 'none';
            }
        }
    });

    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });

    // Observe contact items
    const contactItems = document.querySelectorAll('.contact-item');
    contactItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(item);
    });

    // Counter animation for hero stats
    function animateCounter(element, target, duration = 2000) {
        let start = 0;
        const increment = target / (duration / 16);
        
        function updateCounter() {
            start += increment;
            if (start < target) {
                element.textContent = Math.floor(start);
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target;
            }
        }
        
        updateCounter();
    }

    // Trigger counter animation when hero section is visible
    const heroStats = document.querySelectorAll('.stat-number');
    const heroObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                heroStats.forEach(stat => {
                    const text = stat.textContent;
                    if (text.includes('%')) {
                        const number = parseFloat(text);
                        animateCounter(stat, number);
                        stat.textContent = number.toFixed(1) + '%';
                    } else if (text.includes('M')) {
                        const number = parseFloat(text);
                        animateCounter(stat, number);
                        stat.textContent = number.toFixed(1) + 'M+';
                    } else if (text.includes('/')) {
                        stat.textContent = '24/7';
                    }
                });
                heroObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const heroSection = document.querySelector('.hero');
    if (heroSection) {
        heroObserver.observe(heroSection);
    }

    // Button click animations
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Create ripple effect
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

    // Add ripple effect CSS
    const style = document.createElement('style');
    style.textContent = `
        button {
            position: relative;
            overflow: hidden;
        }
        
        .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.6);
            transform: scale(0);
            animation: ripple-animation 0.6s linear;
            pointer-events: none;
        }
        
        @keyframes ripple-animation {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // Mobile menu toggle (if needed)
    const mobileMenuButton = document.createElement('button');
    mobileMenuButton.innerHTML = '☰';
    mobileMenuButton.className = 'mobile-menu-btn';
    mobileMenuButton.style.display = 'none';
    mobileMenuButton.style.background = 'none';
    mobileMenuButton.style.border = 'none';
    mobileMenuButton.style.fontSize = '1.5rem';
    mobileMenuButton.style.cursor = 'pointer';
    
    const navContainer = document.querySelector('.nav-container');
    navContainer.appendChild(mobileMenuButton);

    // Show mobile menu button on small screens
    function checkScreenSize() {
        if (window.innerWidth <= 768) {
            mobileMenuButton.style.display = 'block';
            document.querySelector('.nav-menu').style.display = 'none';
        } else {
            mobileMenuButton.style.display = 'none';
            document.querySelector('.nav-menu').style.display = 'flex';
        }
    }

    window.addEventListener('resize', checkScreenSize);
    checkScreenSize();

    // Mobile menu functionality
    mobileMenuButton.addEventListener('click', function() {
        const navMenu = document.querySelector('.nav-menu');
        const currentTheme = document.body.getAttribute('data-theme');
        
        if (navMenu.style.display === 'none' || navMenu.style.display === '') {
            navMenu.style.display = 'flex';
            navMenu.style.flexDirection = 'column';
            navMenu.style.position = 'absolute';
            navMenu.style.top = '100%';
            navMenu.style.left = '0';
            navMenu.style.right = '0';
            navMenu.style.background = currentTheme === 'dark' ? '#1a1a1a' : 'white';
            navMenu.style.padding = '1rem';
            navMenu.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navMenu.style.display = 'none';
        }
    });

    // Add loading states to buttons
    function addLoadingState(button, text = 'Loading...') {
        const originalText = button.textContent;
        button.textContent = text;
        button.disabled = true;
        button.style.opacity = '0.7';
        
        return function removeLoadingState() {
            button.textContent = originalText;
            button.disabled = false;
            button.style.opacity = '1';
        };
    }

    // Simulate button actions
    const ctaButtons = document.querySelectorAll('.btn-primary');
    ctaButtons.forEach(button => {
        if (button.textContent.includes('Add to Chrome')) {
            // Already handled above
        } else if (button.textContent.includes('Learn More')) {
            button.addEventListener('click', function() {
                const removeLoading = addLoadingState(this, 'Loading...');
                
                setTimeout(() => {
                    removeLoading();
                    showNotification('Learn more about our features!', 'info');
                }, 2000);
            });
        }
    });

    // Handle Google Forms submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            showNotification('Submitting to PhishNinja Support...', 'info');
            
            // Store reference to form
            const form = this;
            
            // Create hidden iframe for submission
            let iframe = document.getElementById('hidden-iframe');
            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.id = 'hidden-iframe';
                iframe.name = 'hidden-iframe';
                iframe.style.position = 'absolute';
                iframe.style.left = '-9999px';
                iframe.style.top = '-9999px';
                iframe.style.width = '1px';
                iframe.style.height = '1px';
                document.body.appendChild(iframe);
            }
            
            // Set form action and target
            form.action = 'https://docs.google.com/forms/d/e/1FAIpQLSe0i_2V_n2GnoGffOkJSPUXJYQ7D86GbpvWtWmxIdo__FrpLQ/formResponse';
            form.method = 'POST';
            form.target = 'hidden-iframe';
            
            // Handle iframe load to detect submission
            iframe.onload = iframe.onreadystatechange = function() {
                setTimeout(() => {
                    form.reset();
                    showNotification('Message submitted successfully!', 'success');
                    // Reset form settings
                    form.removeAttribute('action');
                    form.removeAttribute('method');
                    form.removeAttribute('target');
                }, 2000);
            };
            
            // Also add a timeout fallback
            setTimeout(() => {
                if (form.action) {
                    form.reset();
                    showNotification('Message submitted successfully!', 'success');
                    // Reset form settings
                    form.removeAttribute('action');
                    form.removeAttribute('method');
                    form.removeAttribute('target');
                }
            }, 3000);
            
            // Submit the form
            form.submit();
        });
    }

    // Add parallax effect to hero section
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const heroVisual = document.querySelector('.hero-visual');
        
        if (heroVisual) {
            heroVisual.style.transform = `translateY(${scrolled * 0.1}px)`;
        }
    });

    // Add typing effect to hero title - 3 lines exactly as requested
    function typeWriter(element, text, speed = 100) {
        element.innerHTML = '';
        
        // Line structure: "Advanced Phishing" / "Protection for" / "Modern Web"
        const line1 = 'Advanced Phishing';
        const line2 = 'Protection for';
        const line3 = 'Modern Web';
        
        let currentLine = 0;
        let currentChar = 0;
        
        function typeNext() {
            if (currentLine === 0) {
                // Type first line: "Advanced Phishing" (white)
                if (currentChar < line1.length) {
                    element.innerHTML = line1.substring(0, currentChar + 1);
                    currentChar++;
                    setTimeout(typeNext, speed);
                } else {
                    currentLine = 1;
                    currentChar = 0;
                    setTimeout(typeNext, speed);
                }
            } else if (currentLine === 1) {
                // Type second line: "Protection for" (Protection in white, for in green)
                if (currentChar < line2.length) {
                    const currentText = line2.substring(0, currentChar + 1);
                    if (currentText.includes('for') && currentText.length > 'Protection '.length) {
                        // "for" should be green
                        const beforeFor = 'Protection ';
                        const forAndAfter = currentText.substring(beforeFor.length);
                        element.innerHTML = line1 + '<br>' + beforeFor + '<span class="gradient-text">' + forAndAfter + '</span>';
                    } else {
                        element.innerHTML = line1 + '<br>' + currentText;
                    }
                    currentChar++;
                    setTimeout(typeNext, speed);
                } else {
                    currentLine = 2;
                    currentChar = 0;
                    setTimeout(typeNext, speed);
                }
            } else if (currentLine === 2) {
                // Type third line: "Modern Web" (green)
                if (currentChar < line3.length) {
                    const currentText = line3.substring(0, currentChar + 1);
                    element.innerHTML = line1 + '<br>' + 'Protection <span class="gradient-text">for</span><br>' + '<span class="gradient-text">' + currentText + '</span>';
                    currentChar++;
                    setTimeout(typeNext, speed);
                }
            }
        }
        
        typeNext();
    }

    // Initialize typing effect on page load
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const originalText = heroTitle.textContent;
        setTimeout(() => {
            typeWriter(heroTitle, originalText, 50);
        }, 1000);
    }
});
