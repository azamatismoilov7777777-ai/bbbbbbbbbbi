// DOM Elements
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');

const searchBarContainer = document.getElementById('search-bar-container');
const searchInput = document.getElementById('search-input');
const sectionTitle = document.getElementById('section-title');
const songsGrid = document.getElementById('songs-grid');
const loader = document.getElementById('loader');
const navLinks = document.querySelectorAll('.nav-links li');
const playlistItems = document.querySelectorAll('.playlist-item');

// Player Elements
const audioPlayer = document.getElementById('audio-player');
const mainPlayBtn = document.getElementById('main-play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');
const volumeBar = document.getElementById('volume-bar');
const volumeFill = document.getElementById('volume-fill');

const currentTitle = document.getElementById('current-title');
const currentArtist = document.getElementById('current-artist');
const currentCover = document.getElementById('current-cover');
const coverGlow = document.getElementById('cover-glow');

let isPlaying = false;
let currentPlaylist = [];
let currentSongIndex = 0;

// API Fetching using iTunes API
async function fetchSongs(query) {
    songsGrid.innerHTML = '';
    loader.classList.remove('hidden');
    
    try {
        // iTunes API is free and allows CORS for GET requests
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=24`;
        const response = await fetch(url);
        const data = await response.json();
        
        currentPlaylist = data.results.filter(song => song.previewUrl); // Ensure it has audio preview
        renderSongs(currentPlaylist);
    } catch (err) {
        console.error("Error fetching songs:", err);
        songsGrid.innerHTML = `<p style="color:red;">Error loading songs. Please try again.</p>`;
    } finally {
        loader.classList.add('hidden');
    }
}

function renderSongs(songs) {
    if(songs.length === 0) {
        songsGrid.innerHTML = `<p>No songs found.</p>`;
        return;
    }
    
    songsGrid.innerHTML = songs.map((song, index) => {
        // Get high res image by replacing 100x100 with 600x600
        const hqImage = song.artworkUrl100.replace('100x100', '600x600');
        return `
            <div class="album-card" onclick="playSongIndex(${index})">
                <div class="img-container">
                    <img src="${hqImage}" alt="Cover">
                    <button class="play-hover-btn"><i class="fas fa-play"></i></button>
                </div>
                <h3>${song.trackName}</h3>
                <p>${song.artistName}</p>
            </div>
        `;
    }).join('');
}

// Authentication Simulation
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    authContainer.classList.remove('active');
    dashboardContainer.classList.add('active');
    // Load default songs
    fetchSongs('top hits 2024');
});

// Navigation Logic
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        const view = link.getAttribute('data-view');
        if(view === 'search') {
            searchBarContainer.classList.remove('hidden');
            sectionTitle.textContent = "Search Results";
            searchInput.focus();
            songsGrid.innerHTML = '<p class="subtitle">Type something above to search millions of songs...</p>';
        } else if (view === 'home') {
            searchBarContainer.classList.add('hidden');
            sectionTitle.textContent = "Discover";
            fetchSongs('top hits 2024');
        } else if (view === 'library') {
            searchBarContainer.classList.add('hidden');
            sectionTitle.textContent = "Your Library";
            fetchSongs('lofi hip hop');
        }
    });
});

// Playlist Clicks
playlistItems.forEach(item => {
    item.addEventListener('click', () => {
        const query = item.getAttribute('data-query');
        searchBarContainer.classList.add('hidden');
        sectionTitle.textContent = item.textContent;
        fetchSongs(query);
    });
});

// Search Logic (Debounced)
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    if(query.length > 2) {
        searchTimeout = setTimeout(() => {
            fetchSongs(query);
        }, 800);
    }
});

// Player Logic
window.playSongIndex = function(index) {
    currentSongIndex = index;
    const song = currentPlaylist[index];
    const hqImage = song.artworkUrl100.replace('100x100', '600x600');
    
    audioPlayer.src = song.previewUrl;
    currentTitle.textContent = song.trackName;
    currentArtist.textContent = song.artistName;
    currentCover.src = hqImage;
    currentCover.classList.remove('hidden');
    coverGlow.classList.remove('hidden');
    
    audioPlayer.play();
    isPlaying = true;
    updatePlayPauseButton();
}

mainPlayBtn.addEventListener('click', () => {
    if (!audioPlayer.src) return;
    
    if (isPlaying) {
        audioPlayer.pause();
    } else {
        audioPlayer.play();
    }
    isPlaying = !isPlaying;
    updatePlayPauseButton();
});

prevBtn.addEventListener('click', () => {
    if(currentPlaylist.length > 0 && currentSongIndex > 0) {
        playSongIndex(currentSongIndex - 1);
    }
});

nextBtn.addEventListener('click', () => {
    if(currentPlaylist.length > 0 && currentSongIndex < currentPlaylist.length - 1) {
        playSongIndex(currentSongIndex + 1);
    }
});

audioPlayer.addEventListener('ended', () => {
    if(currentSongIndex < currentPlaylist.length - 1) {
        playSongIndex(currentSongIndex + 1);
    } else {
        isPlaying = false;
        updatePlayPauseButton();
    }
});

function updatePlayPauseButton() {
    mainPlayBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
}

audioPlayer.addEventListener('timeupdate', () => {
    if (audioPlayer.duration) {
        const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressFill.style.width = `${progressPercent}%`;
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
        // iTunes previews are usually 30s
        totalTimeEl.textContent = "0:30"; 
    }
});

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

progressBar.addEventListener('click', (e) => {
    if (!audioPlayer.src) return;
    const width = progressBar.clientWidth;
    const clickX = e.offsetX;
    const duration = audioPlayer.duration;
    audioPlayer.currentTime = (clickX / width) * duration;
});

audioPlayer.volume = 0.5;

volumeBar.addEventListener('click', (e) => {
    const width = volumeBar.clientWidth;
    const clickX = e.offsetX;
    const volume = clickX / width;
    audioPlayer.volume = volume;
    volumeFill.style.width = `${volume * 100}%`;
});
