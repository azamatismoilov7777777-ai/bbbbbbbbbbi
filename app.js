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
const playerFavBtn = document.getElementById('player-fav-btn');

// Lyrics Elements
const lyricsOverlay = document.getElementById('lyrics-overlay');
const toggleLyricsBtn = document.getElementById('toggle-lyrics');
const closeLyricsBtn = document.getElementById('close-lyrics');
const lyricsTitle = document.getElementById('lyrics-title');
const lyricsArtist = document.getElementById('lyrics-artist');
const lyricsBody = document.getElementById('lyrics-body');

let isPlaying = false;
let currentPlaylist = [];
let currentSongIndex = 0;
let favorites = JSON.parse(localStorage.getItem('vibe_favorites')) || [];

// API Fetching using iTunes API
async function fetchSongs(query) {
    songsGrid.innerHTML = '';
    loader.classList.remove('hidden');
    
    try {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=24`;
        const response = await fetch(url);
        const data = await response.json();
        
        currentPlaylist = data.results.filter(song => song.previewUrl);
        renderSongs(currentPlaylist);
    } catch (err) {
        console.error("Error fetching songs:", err);
        songsGrid.innerHTML = `<p style="color:red; text-align:center;">Error loading sound waves. Check connection.</p>`;
    } finally {
        loader.classList.add('hidden');
    }
}

function renderSongs(songs) {
    if(songs.length === 0) {
        songsGrid.innerHTML = `<p style="text-align:center; grid-column: 1/-1; padding: 50px;">No frequencies found matching your search.</p>`;
        return;
    }
    
    songsGrid.innerHTML = songs.map((song, index) => {
        const hqImage = song.artworkUrl100.replace('100x100', '600x600');
        const isFav = favorites.some(f => f.trackId === song.trackId);
        return `
            <div class="album-card" onclick="playSongIndex(${index})">
                <div class="img-container">
                    <img src="${hqImage}" alt="Cover">
                    <button class="play-hover-btn"><i class="fas fa-play"></i></button>
                </div>
                <div class="card-actions">
                    <button class="card-btn fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite(${index})">
                        <i class="${isFav ? 'fas' : 'far'} fa-star"></i>
                    </button>
                </div>
                <h3>${song.trackName}</h3>
                <p>${song.artistName}</p>
            </div>
        `;
    }).join('');
}

// Favorites Logic
window.toggleFavorite = function(index, fromPlayer = false) {
    const song = fromPlayer ? currentPlaylist[currentSongIndex] : currentPlaylist[index];
    const favIndex = favorites.findIndex(f => f.trackId === song.trackId);
    
    if (favIndex > -1) {
        favorites.splice(favIndex, 1);
    } else {
        favorites.push(song);
    }
    
    localStorage.setItem('vibe_favorites', JSON.stringify(favorites));
    
    // Refresh UI
    if (sectionTitle.textContent === "Library") {
        currentPlaylist = [...favorites];
        renderSongs(currentPlaylist);
    } else if (!fromPlayer) {
        renderSongs(currentPlaylist);
    }
    updatePlayerFavIcon();
};

function updatePlayerFavIcon() {
    if (!currentPlaylist[currentSongIndex]) return;
    const isFav = favorites.some(f => f.trackId === currentPlaylist[currentSongIndex].trackId);
    playerFavBtn.innerHTML = `<i class="${isFav ? 'fas' : 'far'} fa-star"></i>`;
    playerFavBtn.classList.toggle('active', isFav);
}

// Lyrics Logic (LRCLIB API)
let currentSyncedLyrics = [];

function parseLRC(lrc) {
    const lines = lrc.split('\n');
    const parsed = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    
    lines.forEach(line => {
        const match = timeRegex.exec(line);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            // Handle both 2 and 3 digit milliseconds
            const milliseconds = parseInt(match[3], 10) * (match[3].length === 2 ? 10 : 1);
            const time = minutes * 60 + seconds + milliseconds / 1000;
            const text = line.replace(timeRegex, '').trim();
            if (text) {
                parsed.push({ time, text });
            }
        }
    });
    return parsed;
}

async function fetchLyrics(artist, title) {
    lyricsBody.innerHTML = '<p>Searching for lyrics...</p>';
    currentSyncedLyrics = []; // Reset
    
    try {
        const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Lyrics not found");
        const data = await response.json();
        
        if (data.syncedLyrics) {
            currentSyncedLyrics = parseLRC(data.syncedLyrics);
            if (currentSyncedLyrics.length > 0) {
                lyricsBody.innerHTML = currentSyncedLyrics.map((line, index) => 
                    `<p id="lyric-${index}" data-time="${line.time}">${line.text}</p>`
                ).join('');
            } else {
                // Fallback if parsing fails
                lyricsBody.innerHTML = data.plainLyrics ? data.plainLyrics.split('\n').map(line => `<p>${line}</p>`).join('') : '<p>Lyrics not found.</p>';
            }
        } else if (data.plainLyrics) {
            lyricsBody.innerHTML = data.plainLyrics.split('\n').map(line => `<p>${line}</p>`).join('');
        } else {
            lyricsBody.innerHTML = '<p>Lyrics are available but in an unsupported format.</p>';
        }
    } catch (err) {
        lyricsBody.innerHTML = '<p>Lyrics not found for this frequency.</p>';
    }
}

toggleLyricsBtn.addEventListener('click', () => {
    if (!audioPlayer.src) return;
    const song = currentPlaylist[currentSongIndex];
    lyricsTitle.textContent = song.trackName;
    lyricsArtist.textContent = song.artistName;
    lyricsOverlay.classList.add('active');
    // If not already fetched or different song
    fetchLyrics(song.artistName, song.trackName);
});

closeLyricsBtn.addEventListener('click', () => {
    lyricsOverlay.classList.remove('active');
});

// Authentication Simulation
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    authContainer.classList.remove('active');
    dashboardContainer.classList.add('active');
    fetchSongs('top hits 2025');
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
            songsGrid.innerHTML = '<p style="text-align:center; grid-column:1/-1; padding:50px;">Input artist or song name to explore...</p>';
        } else if (view === 'home') {
            searchBarContainer.classList.add('hidden');
            sectionTitle.textContent = "Discover";
            fetchSongs('top hits 2025');
        } else if (view === 'library') {
            searchBarContainer.classList.add('hidden');
            sectionTitle.textContent = "Library";
            currentPlaylist = [...favorites];
            renderSongs(currentPlaylist);
        }
    });
});

// Genre Clicks
playlistItems.forEach(item => {
    item.addEventListener('click', () => {
        const query = item.getAttribute('data-query');
        searchBarContainer.classList.add('hidden');
        sectionTitle.textContent = item.textContent;
        fetchSongs(query);
        // Set active state on home nav link
        navLinks.forEach(l => l.classList.remove('active'));
        navLinks[0].classList.add('active');
    });
});

// Search Logic
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
window.playSongIndex = async function(index) {
    currentSongIndex = index;
    const song = currentPlaylist[index];
    const hqImage = song.artworkUrl100.replace('100x100', '600x600');
    
    // Set audio source but don't play yet
    audioPlayer.src = song.previewUrl;
    currentTitle.textContent = song.trackName;
    currentArtist.textContent = song.artistName;
    currentCover.src = hqImage;
    currentCover.classList.remove('hidden');
    coverGlow.classList.remove('hidden');
    playerFavBtn.classList.remove('hidden');
    
    // Automatically open lyrics overlay
    lyricsTitle.textContent = song.trackName;
    lyricsArtist.textContent = song.artistName;
    lyricsOverlay.classList.add('active');
    
    // Wait for lyrics to be fetched before starting the music
    // This ensures perfect synchronization from 0:00
    await fetchLyrics(song.artistName, song.trackName);
    
    audioPlayer.play();
    isPlaying = true;
    updatePlayPauseButton();
    updatePlayerFavIcon();
}

playerFavBtn.addEventListener('click', () => toggleFavorite(0, true));

mainPlayBtn.addEventListener('click', () => {
    if (!audioPlayer.src) return;
    if (isPlaying) audioPlayer.pause();
    else audioPlayer.play();
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
        totalTimeEl.textContent = "0:30"; 
    }
    
    // Sync Lyrics
    if (currentSyncedLyrics.length > 0 && lyricsOverlay.classList.contains('active')) {
        const currentTime = audioPlayer.currentTime;
        let activeIndex = -1;
        
        for (let i = 0; i < currentSyncedLyrics.length; i++) {
            if (currentTime >= currentSyncedLyrics[i].time) {
                activeIndex = i;
            } else {
                break;
            }
        }
        
        if (activeIndex !== -1) {
            const activeLyricEl = document.getElementById(`lyric-${activeIndex}`);
            if (activeLyricEl && !activeLyricEl.classList.contains('active-lyric')) {
                // Remove active class from all lyrics
                const allLyrics = lyricsBody.querySelectorAll('p');
                allLyrics.forEach(p => p.classList.remove('active-lyric'));
                
                // Add active class to current lyric
                activeLyricEl.classList.add('active-lyric');
                
                // Auto scroll to center
                activeLyricEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
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
    audioPlayer.currentTime = (clickX / width) * audioPlayer.duration;
});

audioPlayer.volume = 0.5;
volumeFill.style.width = '50%';

volumeBar.addEventListener('click', (e) => {
    const width = volumeBar.clientWidth;
    const clickX = e.offsetX;
    const volume = clickX / width;
    audioPlayer.volume = volume;
    volumeFill.style.width = `${volume * 100}%`;
});
