export const dynamic = 'force-dynamic';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ember — Teach the Room</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        display: ['Space Grotesk', 'sans-serif'],
                    },
                    colors: {
                        ember: {
                            purple: '#3B1F7A',
                            'purple-light': '#5D3A9B',
                            coral: '#FF6B6B',
                            orange: '#FF8E53',
                            gradient: 'linear-gradient(135deg, #3B1F7A 0%, #FF6B6B 100%)',
                        }
                    },
                    animation: {
                        'float': 'float 6s ease-in-out infinite',
                        'float-delayed': 'float 6s ease-in-out 3s infinite',
                        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        'slide-up': 'slideUp 0.8s ease-out forwards',
                        'fade-in': 'fadeIn 1s ease-out forwards',
                        'scale-in': 'scaleIn 0.6s ease-out forwards',
                    },
                    keyframes: {
                        float: {
                            '0%, 100%': { transform: 'translateY(0px)' },
                            '50%': { transform: 'translateY(-20px)' },
                        },
                        slideUp: {
                            '0%': { opacity: '0', transform: 'translateY(40px)' },
                            '100%': { opacity: '1', transform: 'translateY(0)' },
                        },
                        fadeIn: {
                            '0%': { opacity: '0' },
                            '100%': { opacity: '1' },
                        },
                        scaleIn: {
                            '0%': { opacity: '0', transform: 'scale(0.9)' },
                            '100%': { opacity: '1', transform: 'scale(1)' },
                        }
                    }
                }
            }
        }
    </script>
    <style>
        .gradient-text {
            background: linear-gradient(135deg, #3B1F7A 0%, #FF6B6B 50%, #FF8E53 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .gradient-bg {
            background: linear-gradient(135deg, #3B1F7A 0%, #5D3A9B 50%, #FF6B6B 100%);
        }
        .glass-card {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .mesh-bg {
            background-color: #fafafa;
            background-image:
                radial-gradient(at 40% 20%, rgba(59, 31, 122, 0.05) 0px, transparent 50%),
                radial-gradient(at 80% 0%, rgba(255, 107, 107, 0.05) 0px, transparent 50%),
                radial-gradient(at 0% 50%, rgba(255, 142, 83, 0.03) 0px, transparent 50%),
                radial-gradient(at 80% 50%, rgba(59, 31, 122, 0.05) 0px, transparent 50%),
                radial-gradient(at 0% 100%, rgba(255, 107, 107, 0.05) 0px, transparent 50%);
        }
        .hero-mesh {
            background-color: #ffffff;
            background-image:
                radial-gradient(at 20% 30%, rgba(59, 31, 122, 0.08) 0px, transparent 50%),
                radial-gradient(at 80% 70%, rgba(255, 107, 107, 0.06) 0px, transparent 50%),
                radial-gradient(at 50% 50%, rgba(255, 142, 83, 0.04) 0px, transparent 50%);
        }
        .blob {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.4;
            animation: blob-bounce 20s infinite ease-in-out;
        }
        @keyframes blob-bounce {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .scroll-reveal {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .scroll-reveal.visible {
            opacity: 1;
            transform: translateY(0);
        }
        .feature-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 25px 50px -12px rgba(59, 31, 122, 0.15);
        }
        .demo-dot {
            transition: all 0.3s ease;
        }
        .demo-dot.active {
            transform: scale(1.5);
            box-shadow: 0 0 20px rgba(255, 107, 107, 0.6);
        }
        .number-counter {
            font-variant-numeric: tabular-nums;
        }
    </style>
<base target="_blank">
</head>
<body class="font-sans text-gray-800 antialiased overflow-x-hidden">

    <!-- Navigation -->
    <nav class="fixed top-0 left-0 right-0 z-50 transition-all duration-300" id="navbar">
        <div class="max-w-7xl mx-auto px-6 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <img src="/Ember_logo_icon.png" alt="Ember" class="h-10 w-auto">
                    <img src="/Ember_logo_text.png" alt="Ember" class="h-6 w-auto hidden sm:block">
                </div>
                <div class="hidden md:flex items-center gap-8">
                    <a href="#features" class="text-sm font-medium text-gray-600 hover:text-ember-purple transition-colors">Features</a>
                    <a href="#how-it-works" class="text-sm font-medium text-gray-600 hover:text-ember-purple transition-colors">How it Works</a>
                    <a href="#demo" class="text-sm font-medium text-gray-600 hover:text-ember-purple transition-colors">Demo</a>
                    <button class="px-6 py-2.5 bg-ember-purple text-white text-sm font-semibold rounded-full hover:bg-opacity-90 transition-all hover:shadow-lg hover:shadow-ember-purple/20">
                        Get Early Access
                    </button>
                </div>
                <button class="md:hidden p-2" onclick="toggleMobileMenu()">
                    <i data-lucide="menu" class="w-6 h-6 text-ember-purple"></i>
                </button>
            </div>
        </div>
        <!-- Mobile Menu -->
        <div id="mobile-menu" class="hidden md:hidden bg-white/95 backdrop-blur-lg border-t border-gray-100">
            <div class="px-6 py-4 space-y-3">
                <a href="#features" class="block text-sm font-medium text-gray-600">Features</a>
                <a href="#how-it-works" class="block text-sm font-medium text-gray-600">How it Works</a>
                <a href="#demo" class="block text-sm font-medium text-gray-600">Demo</a>
                <button class="w-full px-6 py-2.5 bg-ember-purple text-white text-sm font-semibold rounded-full">
                    Get Early Access
                </button>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="relative min-h-screen hero-mesh flex items-center pt-20 overflow-hidden">
        <!-- Animated Blobs -->
        <div class="blob bg-ember-purple w-96 h-96 top-0 left-0" style="animation-delay: 0s;"></div>
        <div class="blob bg-ember-coral w-80 h-80 bottom-0 right-0" style="animation-delay: -5s;"></div>
        <div class="blob bg-ember-orange w-64 h-64 top-1/2 left-1/2" style="animation-delay: -10s;"></div>

        <div class="max-w-7xl mx-auto px-6 py-20 relative z-10">
            <div class="grid lg:grid-cols-2 gap-12 items-center">
                <div class="space-y-8">
                    <div class="inline-flex items-center gap-2 px-4 py-2 bg-ember-purple/10 rounded-full border border-ember-purple/20 animate-fade-in">
                        <span class="w-2 h-2 bg-ember-coral rounded-full animate-pulse"></span>
                        <span class="text-sm font-semibold text-ember-purple">Coming Soon — Join the Waitlist</span>
                    </div>

                    <h1 class="font-display text-5xl md:text-7xl font-bold leading-tight animate-slide-up" style="animation-delay: 0.1s;">
                        Teach the<br>
                        <span class="gradient-text">Room</span>
                    </h1>

                    <p class="text-xl text-gray-600 leading-relaxed max-w-lg animate-slide-up" style="animation-delay: 0.2s;">
                        Supercharge your teaching. Ember helps you find misconceptions in real-time,
                        so you can 2x student learning with data-driven insights.
                    </p>

                    <div class="flex flex-col sm:flex-row gap-4 animate-slide-up" style="animation-delay: 0.3s;">
                        <button class="px-8 py-4 gradient-bg text-white font-semibold rounded-full hover:shadow-xl hover:shadow-ember-purple/30 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2">
                            Start Free Trial
                            <i data-lucide="arrow-right" class="w-5 h-5"></i>
                        </button>
                        <button class="px-8 py-4 bg-white text-ember-purple font-semibold rounded-full border-2 border-ember-purple/20 hover:border-ember-purple/40 transition-all flex items-center justify-center gap-2 group">
                            <i data-lucide="play-circle" class="w-5 h-5 group-hover:text-ember-coral transition-colors"></i>
                            Watch Demo
                        </button>
                    </div>

                    <div class="flex items-center gap-6 pt-4 animate-slide-up" style="animation-delay: 0.4s;">
                        <div class="flex -space-x-3">
                            <img src="https://i.pravatar.cc/150?img=1" class="w-10 h-10 rounded-full border-2 border-white" alt="Teacher">
                            <img src="https://i.pravatar.cc/150?img=5" class="w-10 h-10 rounded-full border-2 border-white" alt="Teacher">
                            <img src="https://i.pravatar.cc/150?img=8" class="w-10 h-10 rounded-full border-2 border-white" alt="Teacher">
                            <img src="https://i.pravatar.cc/150?img=12" class="w-10 h-10 rounded-full border-2 border-white" alt="Teacher">
                        </div>
                        <div class="text-sm text-gray-600">
                            <span class="font-bold text-ember-purple">500+</span> teachers already signed up
                        </div>
                    </div>
                </div>

                <div class="relative animate-scale-in" style="animation-delay: 0.3s;">
                    <!-- Interactive Dashboard Preview -->
                    <div class="relative bg-white rounded-3xl shadow-2xl shadow-ember-purple/10 p-6 border border-gray-100">
                        <div class="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                            <div class="w-3 h-3 rounded-full bg-red-400"></div>
                            <div class="w-3 h-3 rounded-full bg-yellow-400"></div>
                            <div class="w-3 h-3 rounded-full bg-green-400"></div>
                            <span class="ml-2 text-sm text-gray-400 font-medium">Ember Dashboard</span>
                        </div>

                        <div class="space-y-4">
                            <!-- Stats Row -->
                            <div class="grid grid-cols-3 gap-3">
                                <div class="bg-ember-purple/5 rounded-xl p-4 text-center">
                                    <div class="text-2xl font-bold text-ember-purple number-counter" id="stat1">0</div>
                                    <div class="text-xs text-gray-500 mt-1">Active Students</div>
                                </div>
                                <div class="bg-ember-coral/5 rounded-xl p-4 text-center">
                                    <div class="text-2xl font-bold text-ember-coral number-counter" id="stat2">0</div>
                                    <div class="text-xs text-gray-500 mt-1">Misconceptions</div>
                                </div>
                                <div class="bg-ember-orange/5 rounded-xl p-4 text-center">
                                    <div class="text-2xl font-bold text-ember-orange number-counter" id="stat3">0</div>
                                    <div class="text-xs text-gray-500 mt-1">Learning Gain</div>
                                </div>
                            </div>

                            <!-- Live Class View -->
                            <div class="bg-gray-50 rounded-xl p-4">
                                <div class="flex items-center justify-between mb-3">
                                    <span class="text-sm font-semibold text-gray-700">Live Understanding Map</span>
                                    <span class="flex items-center gap-1 text-xs text-green-600">
                                        <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                        Live
                                    </span>
                                </div>
                                <div class="grid grid-cols-6 gap-2" id="student-grid">
                                    <!-- Generated by JS -->
                                </div>
                            </div>

                            <!-- Alert Card -->
                            <div class="bg-gradient-to-r from-ember-coral/10 to-ember-orange/10 rounded-xl p-4 border border-ember-coral/20">
                                <div class="flex items-start gap-3">
                                    <div class="w-8 h-8 rounded-full bg-ember-coral/20 flex items-center justify-center flex-shrink-0">
                                        <i data-lucide="alert-triangle" class="w-4 h-4 text-ember-coral"></i>
                                    </div>
                                    <div>
                                        <div class="text-sm font-semibold text-gray-800">Concept Gap Detected</div>
                                        <div class="text-xs text-gray-600 mt-1">32% of students struggling with "Photosynthesis Process"</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Floating Elements -->
                    <div class="absolute -top-6 -right-6 w-20 h-20 bg-ember-purple/10 rounded-2xl animate-float flex items-center justify-center">
                        <i data-lucide="brain" class="w-8 h-8 text-ember-purple"></i>
                    </div>
                    <div class="absolute -bottom-4 -left-4 w-16 h-16 bg-ember-coral/10 rounded-full animate-float-delayed flex items-center justify-center">
                        <i data-lucide="zap" class="w-6 h-6 text-ember-coral"></i>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Trust Bar -->
    <section class="py-12 bg-white border-y border-gray-100">
        <div class="max-w-7xl mx-auto px-6">
            <p class="text-center text-sm text-gray-500 mb-8 font-medium uppercase tracking-wider">Trusted by innovative schools</p>
            <div class="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50">
                <div class="flex items-center gap-2 text-xl font-bold text-gray-400">
                    <i data-lucide="graduation-cap" class="w-6 h-6"></i>
                    <span>Westfield Academy</span>
                </div>
                <div class="flex items-center gap-2 text-xl font-bold text-gray-400">
                    <i data-lucide="school" class="w-6 h-6"></i>
                    <span>Horizon Prep</span>
                </div>
                <div class="flex items-center gap-2 text-xl font-bold text-gray-400">
                    <i data-lucide="book-open" class="w-6 h-6"></i>
                    <span>St. Mary's</span>
                </div>
                <div class="flex items-center gap-2 text-xl font-bold text-gray-400">
                    <i data-lucide="library" class="w-6 h-6"></i>
                    <span>Northside High</span>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-24 mesh-bg">
        <div class="max-w-7xl mx-auto px-6">
            <div class="text-center max-w-3xl mx-auto mb-16 scroll-reveal">
                <span class="inline-block px-4 py-1.5 bg-ember-purple/10 text-ember-purple text-sm font-semibold rounded-full mb-4">Features</span>
                <h2 class="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                    Everything you need to <span class="gradient-text">2x learning</span>
                </h2>
                <p class="text-lg text-gray-600">Real-time insights that transform how you teach and how students learn.</p>
            </div>

            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <!-- Feature 1 -->
                <div class="feature-card bg-white rounded-2xl p-8 shadow-lg shadow-gray-200/50 border border-gray-100 transition-all duration-300 scroll-reveal">
                    <div class="w-14 h-14 bg-ember-purple/10 rounded-2xl flex items-center justify-center mb-6">
                        <i data-lucide="scan-eye" class="w-7 h-7 text-ember-purple"></i>
                    </div>
                    <h3 class="font-display text-xl font-bold text-gray-900 mb-3">Misconception Radar</h3>
                    <p class="text-gray-600 leading-relaxed">AI-powered detection identifies exactly where students are getting stuck, before it becomes a habit.</p>
                </div>

                <!-- Feature 2 -->
                <div class="feature-card bg-white rounded-2xl p-8 shadow-lg shadow-gray-200/50 border border-gray-100 transition-all duration-300 scroll-reveal" style="transition-delay: 0.1s;">
                    <div class="w-14 h-14 bg-ember-coral/10 rounded-2xl flex items-center justify-center mb-6">
                        <i data-lucide="activity" class="w-7 h-7 text-ember-coral"></i>
                    </div>
                    <h3 class="font-display text-xl font-bold text-gray-900 mb-3">Live Understanding Map</h3>
                    <p class="text-gray-600 leading-relaxed">See comprehension levels across your entire class in real-time, displayed in an intuitive visual grid.</p>
                </div>

                <!-- Feature 3 -->
                <div class="feature-card bg-white rounded-2xl p-8 shadow-lg shadow-gray-200/50 border border-gray-100 transition-all duration-300 scroll-reveal" style="transition-delay: 0.2s;">
                    <div class="w-14 h-14 bg-ember-orange/10 rounded-2xl flex items-center justify-center mb-6">
                        <i data-lucide="target" class="w-7 h-7 text-ember-orange"></i>
                    </div>
                    <h3 class="font-display text-xl font-bold text-gray-900 mb-3">Smart Interventions</h3>
                    <p class="text-gray-600 leading-relaxed">Get actionable suggestions on which students need help and exactly what concept to reteach.</p>
                </div>

                <!-- Feature 4 -->
                <div class="feature-card bg-white rounded-2xl p-8 shadow-lg shadow-gray-200/50 border border-gray-100 transition-all duration-300 scroll-reveal">
                    <div class="w-14 h-14 bg-ember-purple/10 rounded-2xl flex items-center justify-center mb-6">
                        <i data-lucide="bar-chart-3" class="w-7 h-7 text-ember-purple"></i>
                    </div>
                    <h3 class="font-display text-xl font-bold text-gray-900 mb-3">Progress Analytics</h3>
                    <p class="text-gray-600 leading-relaxed">Track learning velocity over time. See which teaching methods drive the fastest gains.</p>
                </div>

                <!-- Feature 5 -->
                <div class="feature-card bg-white rounded-2xl p-8 shadow-lg shadow-gray-200/50 border border-gray-100 transition-all duration-300 scroll-reveal" style="transition-delay: 0.1s;">
                    <div class="w-14 h-14 bg-ember-coral/10 rounded-2xl flex items-center justify-center mb-6">
                        <i data-lucide="users" class="w-7 h-7 text-ember-coral"></i>
                    </div>
                    <h3 class="font-display text-xl font-bold text-gray-900 mb-3">Group Formation</h3>
                    <p class="text-gray-600 leading-relaxed">Automatically create optimal peer groups based on complementary strengths and gaps.</p>
                </div>

                <!-- Feature 6 -->
                <div class="feature-card bg-white rounded-2xl p-8 shadow-lg shadow-gray-200/50 border border-gray-100 transition-all duration-300 scroll-reveal" style="transition-delay: 0.2s;">
                    <div class="w-14 h-14 bg-ember-orange/10 rounded-2xl flex items-center justify-center mb-6">
                        <i data-lucide="sparkles" class="w-7 h-7 text-ember-orange"></i>
                    </div>
                    <h3 class="font-display text-xl font-bold text-gray-900 mb-3">Lesson Recommendations</h3>
                    <p class="text-gray-600 leading-relaxed">AI suggests the next best activity based on where the class actually is, not where the plan says.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- How It Works -->
    <section id="how-it-works" class="py-24 bg-white">
        <div class="max-w-7xl mx-auto px-6">
            <div class="text-center max-w-3xl mx-auto mb-20 scroll-reveal">
                <span class="inline-block px-4 py-1.5 bg-ember-coral/10 text-ember-coral text-sm font-semibold rounded-full mb-4">How It Works</span>
                <h2 class="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                    Three steps to <span class="gradient-text">smarter teaching</span>
                </h2>
            </div>

            <div class="grid md:grid-cols-3 gap-8 relative">
                <!-- Connecting Line -->
                <div class="hidden md:block absolute top-24 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-ember-purple via-ember-coral to-ember-orange"></div>

                <!-- Step 1 -->
                <div class="relative text-center scroll-reveal">
                    <div class="w-16 h-16 bg-ember-purple rounded-2xl flex items-center justify-center mx-auto mb-6 relative z-10 shadow-lg shadow-ember-purple/20">
                        <span class="text-2xl font-bold text-white">1</span>
                    </div>
                    <h3 class="font-display text-xl font-bold text-gray-900 mb-3">Set Your Lesson</h3>
                    <p class="text-gray-600">Input your learning objectives. Ember maps the key concepts students need to master.</p>
                </div>

                <!-- Step 2 -->
                <div class="relative text-center scroll-reveal" style="transition-delay: 0.15s;">
                    <div class="w-16 h-16 bg-ember-coral rounded-2xl flex items-center justify-center mx-auto mb-6 relative z-10 shadow-lg shadow-ember-coral/20">
                        <span class="text-2xl font-bold text-white">2</span>
                    </div>
                    <h3 class="font-display text-xl font-bold text-gray-900 mb-3">Teach &amp; Monitor</h3>
                    <p class="text-gray-600">Run your class as normal. Ember silently analyzes responses and engagement in real-time.</p>
                </div>

                <!-- Step 3 -->
                <div class="relative text-center scroll-reveal" style="transition-delay: 0.3s;">
                    <div class="w-16 h-16 bg-ember-orange rounded-2xl flex items-center justify-center mx-auto mb-6 relative z-10 shadow-lg shadow-ember-orange/20">
                        <span class="text-2xl font-bold text-white">3</span>
                    </div>
                    <h3 class="font-display text-xl font-bold text-gray-900 mb-3">Act on Insights</h3>
                    <p class="text-gray-600">Receive instant alerts on misconceptions and targeted suggestions to close gaps immediately.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Interactive Demo Section -->
    <section id="demo" class="py-24 mesh-bg">
        <div class="max-w-7xl mx-auto px-6">
            <div class="grid lg:grid-cols-2 gap-16 items-center">
                <div class="scroll-reveal">
                    <span class="inline-block px-4 py-1.5 bg-ember-purple/10 text-ember-purple text-sm font-semibold rounded-full mb-4">Interactive Demo</span>
                    <h2 class="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                        See the <span class="gradient-text">misconceptions</span> as they happen
                    </h2>
                    <p class="text-lg text-gray-600 mb-8">
                        Click on a student dot to see their thought process. Ember highlights patterns
                        the human eye would miss, connecting the dots between wrong answers.
                    </p>

                    <div class="space-y-4">
                        <div class="flex items-start gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
                            <div class="w-10 h-10 rounded-full bg-ember-purple/10 flex items-center justify-center flex-shrink-0">
                                <i data-lucide="eye" class="w-5 h-5 text-ember-purple"></i>
                            </div>
                            <div>
                                <div class="font-semibold text-gray-900">Pattern Detection</div>
                                <div class="text-sm text-gray-600">Spot common error patterns across multiple students instantly</div>
                            </div>
                        </div>
                        <div class="flex items-start gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
                            <div class="w-10 h-10 rounded-full bg-ember-coral/10 flex items-center justify-center flex-shrink-0">
                                <i data-lucide="message-square" class="w-5 h-5 text-ember-coral"></i>
                            </div>
                            <div>
                                <div class="font-semibold text-gray-900">Suggested Prompts</div>
                                <div class="text-sm text-gray-600">Get the exact question to ask to surface the misunderstanding</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Interactive Classroom Simulator -->
                <div class="scroll-reveal" style="transition-delay: 0.2s;">
                    <div class="bg-white rounded-3xl shadow-2xl shadow-ember-purple/10 p-6 border border-gray-100">
                        <div class="flex items-center justify-between mb-6">
                            <div>
                                <div class="font-display font-bold text-gray-900">Classroom Simulator</div>
                                <div class="text-sm text-gray-500">Grade 7 — Science: Photosynthesis</div>
                            </div>
                            <div class="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
                                <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Session Active
                            </div>
                        </div>

                        <div class="grid grid-cols-5 gap-3 mb-6" id="demo-grid">
                            <!-- Generated by JS -->
                        </div>

                        <div class="bg-gray-50 rounded-xl p-4">
                            <div class="flex items-center justify-between mb-3">
                                <span class="text-sm font-semibold text-gray-700">Detected Patterns</span>
                                <span class="text-xs text-gray-500">Updated 2s ago</span>
                            </div>
                            <div class="space-y-2" id="pattern-list">
                                <div class="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
                                    <div class="w-2 h-2 rounded-full bg-ember-coral"></div>
                                    <div class="flex-1">
                                        <div class="text-sm font-medium text-gray-800">Confusing respiration with photosynthesis</div>
                                        <div class="text-xs text-gray-500">4 students affected</div>
                                    </div>
                                    <button class="text-xs px-3 py-1 bg-ember-purple text-white rounded-full hover:bg-opacity-90 transition-colors">Fix Now</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Testimonials -->
    <section class="py-24 bg-white">
        <div class="max-w-7xl mx-auto px-6">
            <div class="text-center max-w-3xl mx-auto mb-16 scroll-reveal">
                <span class="inline-block px-4 py-1.5 bg-ember-orange/10 text-ember-orange text-sm font-semibold rounded-full mb-4">Testimonials</span>
                <h2 class="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                    Teachers love <span class="gradient-text">Ember</span>
                </h2>
            </div>

            <div class="grid md:grid-cols-3 gap-8">
                <div class="bg-gray-50 rounded-2xl p-8 scroll-reveal">
                    <div class="flex items-center gap-1 mb-4">
                        <i data-lucide="star" class="w-5 h-5 text-yellow-400 fill-yellow-400"></i>
                        <i data-lucide="star" class="w-5 h-5 text-yellow-400 fill-yellow-400"></i>
                        <i data-lucide="star" class="w-5 h-5 text-yellow-400 fill-yellow-400"></i>
                        <i data-lucide="star" class="w-5 h-5 text-yellow-400 fill-yellow-400"></i>
                        <i data-lucide="star" class="w-5 h-5 text-yellow-400 fill-yellow-400"></i>
                    </div>
                    <p class="text-gray-700 mb-6 leading-relaxed">"I caught a fundamental misconception about fractions that half my class had. Fixed it in 5 minutes instead of weeks."</p>
                    <div class="flex items-center gap-3">
                        <img src="https://i.pravatar.cc/150?img=32" class="w-12 h-12 rounded-full" alt="Sarah">
                        <div>
                            <div class="font-semibold text-gray-900">Sarah Chen</div>
                            <div class="text-sm text-gray-500">Math Teacher, Grade 5</div>
                        </div>
                    </div>
                </div>

                <div class="bg-gray-50 rounded-2xl p-8 scroll-reveal" style="transition-delay: 0.1s;">
                    <div class="flex items-center gap-1 mb-4">
                        <i data-lucide="star" class="w-5 h-5 text-yellow-400 fill-yellow-400"></i>
                        <i data-lucide="star" class="w-5 h-5 text-yellow-400 fill-yellow-400"></i>
                        <i data-lucide="star" class="w-5 h-5 text-yellow-400 fill-yellow-400"></i>
                        <i data-lucide="star" class="w-5 h-5 text-yellow-400 fill-yellow-400"></i>
                        <i data-lucide="star" class="w-5 h-5 text-yellow-400 fill-yellow-400"></i>
                    </div>
                    <p class="text-gray-700 mb-6 leading-relaxed">"The live understanding map is like having X-ray vision. I can see exactly who needs help without disrupting the flow."</p>
                    <div class="flex items-center gap-3">
                        <img src="https://i.pravatar.cc/150?img=11" class="w-12 h-12 rounded-full" alt="Marcus">
                        <div>
                            <div class="font-semibold text-gray-900">Marcus Johnson</div>
                            <div class="text-sm text-gray-500">Science Teacher, Grade 8</div>
                        </div>
                    </div>
                </div>

                <div class="bg-gray-50 rounded-2xl p-8 scroll-reveal" style="transition-delay: 0.2s;">
                    <div class="flex items-center gap-1 mb-4">
                        <i data-lucide="star" class="w-5 h-5 text-yellow-400 fill-yellow-400"></i>
                        <i data-lucide="star" class="w-5 h-5 text-yellow-400 fill-yellow-400"></i>
                        <i data-lucide="star" class="w-5 h-5 text-yellow-400 fill-yellow-400"></i>
                        <i data-lucide="star" class="w-5 h-5 text-yellow-400 fill-yellow-400"></i>
                        <i data-lucide="star" class="w-5 h-5 text-yellow-400 fill-yellow-400"></i>
                    </div>
                    <p class="text-gray-700 mb-6 leading-relaxed">"Our test scores improved 23% in one semester. Ember doesn't just show problems—it shows exactly how to solve them."</p>
                    <div class="flex items-center gap-3">
                        <img src="https://i.pravatar.cc/150?img=44" class="w-12 h-12 rounded-full" alt="Elena">
                        <div>
                            <div class="font-semibold text-gray-900">Elena Rodriguez</div>
                            <div class="text-sm text-gray-500">Department Head, English</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Stats Section -->
    <section class="py-20 gradient-bg text-white">
        <div class="max-w-7xl mx-auto px-6">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div class="scroll-reveal">
                    <div class="text-4xl md:text-5xl font-bold font-display mb-2">2x</div>
                    <div class="text-white/80">Faster Learning</div>
                </div>
                <div class="scroll-reveal" style="transition-delay: 0.1s;">
                    <div class="text-4xl md:text-5xl font-bold font-display mb-2">85%</div>
                    <div class="text-white/80">Misconceptions Caught</div>
                </div>
                <div class="scroll-reveal" style="transition-delay: 0.2s;">
                    <div class="text-4xl md:text-5xl font-bold font-display mb-2">30min</div>
                    <div class="text-white/80">Setup Time</div>
                </div>
                <div class="scroll-reveal" style="transition-delay: 0.3s;">
                    <div class="text-4xl md:text-5xl font-bold font-display mb-2">500+</div>
                    <div class="text-white/80">Teachers Onboard</div>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="py-24 mesh-bg">
        <div class="max-w-4xl mx-auto px-6 text-center scroll-reveal">
            <h2 class="font-display text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Ready to <span class="gradient-text">Teach the Room</span>?
            </h2>
            <p class="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                Join hundreds of teachers who are already using Ember to transform their classrooms.
                Early access is free for the first semester.
            </p>

            <div class="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <div class="relative">
                    <input type="email" placeholder="Enter your school email"
                        class="px-6 py-4 rounded-full border-2 border-gray-200 focus:border-ember-purple focus:outline-none w-full sm:w-80 text-gray-700 bg-white">
                </div>
                <button class="px-8 py-4 gradient-bg text-white font-semibold rounded-full hover:shadow-xl hover:shadow-ember-purple/30 transition-all transform hover:-translate-y-1">
                    Get Early Access
                </button>
            </div>

            <p class="text-sm text-gray-500">No credit card required. Free for educators during beta.</p>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-100 py-12">
        <div class="max-w-7xl mx-auto px-6">
            <div class="grid md:grid-cols-4 gap-8 mb-8">
                <div class="md:col-span-1">
                    <div class="flex items-center gap-2 mb-4">
                        <img src="/Ember_logo_icon.png" alt="Ember" class="h-8 w-auto">
                        <img src="/Ember_logo_text.png" alt="Ember" class="h-5 w-auto">
                    </div>
                    <p class="text-sm text-gray-500">Supercharging teachers to 2x student learning through real-time misconception detection.</p>
                </div>
                <div>
                    <div class="font-semibold text-gray-900 mb-4">Product</div>
                    <div class="space-y-2 text-sm text-gray-600">
                        <a href="#" class="block hover:text-ember-purple transition-colors">Features</a>
                        <a href="#" class="block hover:text-ember-purple transition-colors">Pricing</a>
                        <a href="#" class="block hover:text-ember-purple transition-colors">Demo</a>
                        <a href="#" class="block hover:text-ember-purple transition-colors">Changelog</a>
                    </div>
                </div>
                <div>
                    <div class="font-semibold text-gray-900 mb-4">Company</div>
                    <div class="space-y-2 text-sm text-gray-600">
                        <a href="#" class="block hover:text-ember-purple transition-colors">About</a>
                        <a href="#" class="block hover:text-ember-purple transition-colors">Blog</a>
                        <a href="#" class="block hover:text-ember-purple transition-colors">Careers</a>
                        <a href="#" class="block hover:text-ember-purple transition-colors">Contact</a>
                    </div>
                </div>
                <div>
                    <div class="font-semibold text-gray-900 mb-4">Legal</div>
                    <div class="space-y-2 text-sm text-gray-600">
                        <a href="#" class="block hover:text-ember-purple transition-colors">Privacy</a>
                        <a href="#" class="block hover:text-ember-purple transition-colors">Terms</a>
                        <a href="#" class="block hover:text-ember-purple transition-colors">Security</a>
                    </div>
                </div>
            </div>
            <div class="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div class="text-sm text-gray-500">© 2026 Ember Education. All rights reserved.</div>
                <div class="flex items-center gap-4">
                    <a href="#" class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-ember-purple/10 transition-colors">
                        <i data-lucide="twitter" class="w-5 h-5 text-gray-600"></i>
                    </a>
                    <a href="#" class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-ember-purple/10 transition-colors">
                        <i data-lucide="linkedin" class="w-5 h-5 text-gray-600"></i>
                    </a>
                    <a href="#" class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-ember-purple/10 transition-colors">
                        <i data-lucide="github" class="w-5 h-5 text-gray-600"></i>
                    </a>
                </div>
            </div>
        </div>
    </footer>

    <script>
        // Initialize Lucide icons
        lucide.createIcons();

        // Mobile menu toggle
        function toggleMobileMenu() {
            const menu = document.getElementById('mobile-menu');
            menu.classList.toggle('hidden');
        }

        // Navbar scroll effect
        const navbar = document.getElementById('navbar');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('bg-white/90', 'backdrop-blur-lg', 'shadow-sm');
            } else {
                navbar.classList.remove('bg-white/90', 'backdrop-blur-lg', 'shadow-sm');
            }
        });

        // Scroll reveal animation
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));

        // Animated counters
        function animateCounter(id, target, suffix) {
            if (suffix === undefined) suffix = '';
            const el = document.getElementById(id);
            let current = 0;
            const increment = target / 50;
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                el.textContent = Math.floor(current) + suffix;
            }, 30);
        }

        // Trigger counters when hero is visible
        const heroObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(() => animateCounter('stat1', 28), 500);
                    setTimeout(() => animateCounter('stat2', 4), 700);
                    setTimeout(() => animateCounter('stat3', 85, '%'), 900);
                    heroObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        heroObserver.observe(document.querySelector('section'));

        // Generate student grid for hero
        const studentGrid = document.getElementById('student-grid');
        const colors = ['bg-green-400', 'bg-green-400', 'bg-green-400', 'bg-yellow-400', 'bg-ember-coral'];
        for (let i = 0; i < 18; i++) {
            const dot = document.createElement('div');
            const color = colors[Math.floor(Math.random() * colors.length)];
            dot.className = 'w-full aspect-square rounded-lg ' + color + ' opacity-80 hover:opacity-100 transition-opacity cursor-pointer';
            dot.title = 'Student ' + (i + 1);
            studentGrid.appendChild(dot);
        }

        // Generate demo grid
        const demoGrid = document.getElementById('demo-grid');
        const studentStates = [
            { color: 'bg-green-400', name: 'Alex', status: 'On Track' },
            { color: 'bg-green-400', name: 'Jordan', status: 'On Track' },
            { color: 'bg-yellow-400', name: 'Casey', status: 'Needs Check' },
            { color: 'bg-green-400', name: 'Taylor', status: 'On Track' },
            { color: 'bg-ember-coral', name: 'Morgan', status: 'Misconception' },
            { color: 'bg-green-400', name: 'Riley', status: 'On Track' },
            { color: 'bg-yellow-400', name: 'Quinn', status: 'Needs Check' },
            { color: 'bg-green-400', name: 'Avery', status: 'On Track' },
            { color: 'bg-green-400', name: 'Sam', status: 'On Track' },
            { color: 'bg-ember-coral', name: 'Jamie', status: 'Misconception' },
            { color: 'bg-green-400', name: 'Drew', status: 'On Track' },
            { color: 'bg-yellow-400', name: 'Peyton', status: 'Needs Check' },
            { color: 'bg-green-400', name: 'Cameron', status: 'On Track' },
            { color: 'bg-green-400', name: 'Reese', status: 'On Track' },
            { color: 'bg-ember-coral', name: 'Skyler', status: 'Misconception' },
            { color: 'bg-green-400', name: 'Dakota', status: 'On Track' },
            { color: 'bg-yellow-400', name: 'Hayden', status: 'Needs Check' },
            { color: 'bg-green-400', name: 'Emerson', status: 'On Track' },
            { color: 'bg-green-400', name: 'Finley', status: 'On Track' },
            { color: 'bg-ember-coral', name: 'Rowan', status: 'Misconception' },
        ];

        studentStates.forEach(function(student, i) {
            const dot = document.createElement('div');
            dot.className = 'w-full aspect-square rounded-xl ' + student.color + ' opacity-90 hover:opacity-100 transition-all cursor-pointer hover:scale-110 relative group';
            dot.innerHTML = '<div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">' + student.name + ': ' + student.status + '</div>';
            dot.onclick = function() {
                document.querySelectorAll('#demo-grid > div').forEach(function(d) { d.classList.remove('ring-2', 'ring-ember-purple', 'ring-offset-2'); });
                dot.classList.add('ring-2', 'ring-ember-purple', 'ring-offset-2');
            };
            demoGrid.appendChild(dot);
        });

        // Simulate live updates
        setInterval(function() {
            const dots = document.querySelectorAll('#student-grid > div');
            const randomDot = dots[Math.floor(Math.random() * dots.length)];
            const liveColors = ['bg-green-400', 'bg-yellow-400', 'bg-ember-coral'];
            randomDot.className = randomDot.className.replace(/bg-\\w+-400/, liveColors[Math.floor(Math.random() * liveColors.length)]);
        }, 3000);

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    </script>
</body>
</html>`;

export async function GET() {
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
