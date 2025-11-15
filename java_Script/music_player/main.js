let now_playing = document.querySelector(".now-playing");
let track_art = document.querySelector(".track-art");
let track_name = document.querySelector(".track-name");
let track_artist = document.querySelector(".track-artist");

let playpause_btn = document.querySelector(".playpause-track");
let next_btn = document.querySelector(".next-track");
let prev_btn = document.querySelector(".prev-track");

let seek_slider = document.querySelector(".seek_slider");
let volume_slider = document.querySelector(".volume_slider");
let curr_time = document.querySelector(".current-time");
let total_duration = document.querySelector(".total-duration");

let track_index = 0;
let isPlaying = false;
let updateTimer;

let curr_track = document.createElement('audio');

let track_list = [
    {
        name: "Night Owl",
        artist: "Broke For Free",
        image: "Image URL",
        path: "music/song_1.mp3"
    },
    {
        name: "Daylight",
        artist: "Broke For Free",
        image: "Image URL",
        path: "music/song_2.mp3"
    },
    {
        name: "Reflection",
        artist: "Broke For Free",
        image: "Image URL",
        path: "music/song_3.mp3"
    }
];

// Keep track of object URLs we create so we can revoke them later
let objectURLs = [];

// File input elements
const fileInput = document.getElementById('fileInput');
const openFilesBtn = document.getElementById('openFilesBtn');
const fileCountSpan = document.getElementById('fileCount');
const persistBtn = document.getElementById('persistBtn');
const toastRoot = (() => {
  let el = document.querySelector('.toast-container');
  if (!el) { el = document.createElement('div'); el.className = 'toast-container'; document.body.appendChild(el); }
  return el;
})();

// Allow the visible button to open the hidden file input
if (openFilesBtn && fileInput) {
  openFilesBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Revoke any previous object URLs
    objectURLs.forEach(url => URL.revokeObjectURL(url));
    objectURLs = [];

    // Map selected files into the track_list format
    // show spinner while parsing
    const spinner = document.querySelector('.loading-spinner');
    if (spinner) spinner.hidden = false;

    // temporary array for parsed tracks
    const parsedTracks = [];

    // parse metadata for each file (jsmediatags)
    let parsedCount = 0;
    files.forEach((f, idx) => {
      const url = URL.createObjectURL(f);
      objectURLs.push(url);

      // default metadata
      const base = {
        name: f.name || 'Unknown',
        artist: '',
        image: '',
        path: url,
        fileName: f.name
      };

      // try to read ID3 tags if jsmediatags is available
      if (window.jsmediatags && typeof window.jsmediatags.read === 'function') {
        window.jsmediatags.read(f, {
          onSuccess: function(tag) {
            try {
              const tags = tag.tags || {};
              base.name = tags.title || base.name;
              base.artist = tags.artist || '';

              // artwork handling
              if (tags.picture) {
                const picture = tags.picture;
                let base64String = "";
                for (let i = 0; i < picture.data.length; i++) {
                  base64String += String.fromCharCode(picture.data[i]);
                }
                const imageUrl = `data:${picture.format};base64,${window.btoa(base64String)}`;
                base.image = imageUrl;
              }
            } catch (err) {
              // ignore parsing errors and use defaults
            }

            parsedTracks[idx] = base;
            parsedCount++;
            if (parsedCount === files.length) finishedParsing();
          },
          onError: function(error) {
            // on failure, keep defaults
            parsedTracks[idx] = base;
            parsedCount++;
            if (parsedCount === files.length) finishedParsing();
          }
        });
      } else {
        // jsmediatags not available: fall back to filename-only metadata
        parsedTracks[idx] = base;
        parsedCount++;
        if (parsedCount === files.length) finishedParsing();
      }
    });

    function finishedParsing(){
      track_list = parsedTracks.slice();
      if (fileCountSpan) fileCountSpan.textContent = `${track_list.length} file(s) loaded`;
      track_index = 0;
      renderPlaylist();
      // hide spinner
      if (spinner) spinner.hidden = true;
      loadTrack(track_index);

      // persist metadata (without file objects or object URLs)
      try {
        const meta = track_list.map(t => ({ name: t.name, artist: t.artist, fileName: t.fileName }));
        idbKeyval.set('playlistMeta', meta);
      } catch (err) {
        console.warn('Could not persist playlist metadata', err);
      }
    }
  });
}

// Toast helper
function showToast(msg, timeout=3000){
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  toastRoot.appendChild(t);
  setTimeout(()=>{ t.style.opacity = '0'; setTimeout(()=> t.remove(),300); }, timeout);
}

// File System Access API: persist file handles (Chromium-based browsers)
async function persistHandles(){
  if (!('showOpenFilePicker' in window) || !window.showSaveFilePicker && !window.showOpenFilePicker){
    showToast('File System Access API not supported in this browser');
    return;
  }

  // We expect track_list currently to have fileName and possibly paths or handles
  // Ask user to re-select the same files so we can grab handles (there is no universal way to convert existing object URLs)
  try{
    const opts = { multiple: true, types: [{ description: 'Audio files', accept: { 'audio/*': ['.mp3','.wav','.m4a','.flac','.ogg'] } }] };
    const handles = await window.showOpenFilePicker(opts);
    // store handles in IndexedDB
    await idbKeyval.set('fileHandles', handles);
    showToast('Playlist persisted — will remain playable after reload (when permission granted)');
  }catch(err){
    console.warn('Persist cancelled or failed',err);
    showToast('Persist cancelled');
  }
}

if (persistBtn) persistBtn.addEventListener('click', persistHandles);

// Load persisted file handles on startup
(async function loadPersistedHandles(){
  if (!('get' in idbKeyval)) return; // idbKeyval present
  try{
    const handles = await idbKeyval.get('fileHandles');
    if (!handles || !handles.length) return;

    const spinner = document.querySelector('.loading-spinner'); if (spinner) spinner.hidden = false;

    const parsedTracks = [];
    let count = 0;
    for (let i = 0; i < handles.length; i++){
      const h = handles[i];
      try{
        // request read permission
        const perm = await h.requestPermission({ mode: 'read' });
        if (perm === 'granted' || perm === 'prompt'){
          const file = await h.getFile();
          const url = URL.createObjectURL(file);
          objectURLs.push(url);
          // parse metadata using jsmediatags similar to selection flow
          parsedTracks[i] = { name: file.name, artist:'', image:'', path: url, fileName: file.name };
          try{
            if (window.jsmediatags && typeof window.jsmediatags.read === 'function'){
              await new Promise((resolve) => {
                window.jsmediatags.read(file, {
                  onSuccess: function(tag){
                    const tags = tag.tags || {};
                    parsedTracks[i].name = tags.title || parsedTracks[i].name;
                    parsedTracks[i].artist = tags.artist || '';
                    if (tags.picture){
                      const picture = tags.picture;
                      let base64String = ""; for (let k=0;k<picture.data.length;k++) base64String += String.fromCharCode(picture.data[k]);
                      parsedTracks[i].image = `data:${picture.format};base64,${window.btoa(base64String)}`;
                    }
                    resolve();
                  },
                  onError: function(){ resolve(); }
                });
              });
            }
          }catch(_){ }
        }else{
          // permission denied
          parsedTracks[i] = { name: h.name || 'Unknown', artist:'', image:'', path: '', fileName: h.name || 'Unknown', missing: true };
        }
      }catch(err){
        parsedTracks[i] = { name: 'Unknown', artist:'', image:'', path: '', fileName: 'Unknown', missing: true };
      }
      count++;
    }

    // finalize
    track_list = parsedTracks.slice();
    renderPlaylist();
    if (spinner) spinner.hidden = true;
    if (track_list.length && track_list[0].path) { track_index = 0; loadTrack(0); }
  }catch(err){ console.warn('loadPersistedHandles failed', err); }
})();


// Render playlist UI
function renderPlaylist(){
  const ul = document.getElementById('playlist');
  if (!ul) return;
  ul.innerHTML = '';
  track_list.forEach((t, idx) => {
    const li = document.createElement('li');
    li.dataset.index = idx;

    const cover = document.createElement('div');
    cover.className = 'playlist-cover';
    if (t.image) cover.style.backgroundImage = `url('${t.image}')`;

    const info = document.createElement('div');
    info.className = 'playlist-info';
    info.innerHTML = `<div class="title">${escapeHtml(t.name)}</div><div class="artist">${escapeHtml(t.artist || '')}</div>`;

    li.appendChild(cover);
    li.appendChild(info);

    // controls container
    const controls = document.createElement('div');
    controls.className = 'playlist-controls';

    // missing badge
    if (t.missing){
      const missing = document.createElement('span'); missing.className = 'missing-badge'; missing.textContent = 'Missing';
      controls.appendChild(missing);
    }

    // relink button (for missing entries)
    if (t.missing || !t.path){
      const relink = document.createElement('button'); relink.className = 'relink-btn'; relink.textContent = 'Re-link';
      relink.addEventListener('click', async (e) => {
        e.stopPropagation();
        try{
          const opts = { types: [{ description: 'Audio', accept: { 'audio/*': ['.mp3','.wav','.m4a','.ogg'] } }], multiple:false };
          const [handle] = await window.showOpenFilePicker(opts);
          if (!handle) return;
          const file = await handle.getFile();
          const url = URL.createObjectURL(file);
          objectURLs.push(url);
          track_list[idx].path = url;
          track_list[idx].missing = false;
          track_list[idx].name = file.name;
          // try parse tags if available
          if (window.jsmediatags && typeof window.jsmediatags.read === 'function'){
            window.jsmediatags.read(file, {
              onSuccess(tag){ const tags = tag.tags||{}; track_list[idx].name = tags.title || track_list[idx].name; track_list[idx].artist = tags.artist || ''; if (tags.picture){ const picture = tags.picture; let s=''; for (let i=0;i<picture.data.length;i++) s+=String.fromCharCode(picture.data[i]); track_list[idx].image = `data:${picture.format};base64,${window.btoa(s)}`; } renderPlaylist(); loadTrack(idx); playTrack(); },
              onError(){ renderPlaylist(); loadTrack(idx); playTrack(); }
            });
          } else { renderPlaylist(); loadTrack(idx); playTrack(); }
        }catch(err){ console.warn('relink cancelled',err); }
      });
      controls.appendChild(relink);
    }

    // Remove button
    const removeBtn = document.createElement('button'); removeBtn.className = 'relink-btn'; removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', (e) => { e.stopPropagation(); track_list.splice(idx,1); renderPlaylist(); idbKeyval.set('playlistMeta', track_list.map(t=>({name:t.name,artist:t.artist,fileName:t.fileName}))); });
    controls.appendChild(removeBtn);

    // Reorder: move up/down
    if (idx > 0){ const up = document.createElement('button'); up.className='relink-btn'; up.textContent='↑'; up.addEventListener('click', (e)=>{ e.stopPropagation(); [track_list[idx-1], track_list[idx]] = [track_list[idx], track_list[idx-1]]; renderPlaylist(); }); controls.appendChild(up); }
    if (idx < track_list.length-1){ const down = document.createElement('button'); down.className='relink-btn'; down.textContent='↓'; down.addEventListener('click', (e)=>{ e.stopPropagation(); [track_list[idx+1], track_list[idx]] = [track_list[idx], track_list[idx+1]]; renderPlaylist(); }); controls.appendChild(down); }

    li.appendChild(controls);

    li.addEventListener('click', () => {
      track_index = Number(li.dataset.index);
      loadTrack(track_index);
      playTrack();
    });

    ul.appendChild(li);
  });
}

// Simple HTML escape to avoid injection in filenames
function escapeHtml(str){
  return String(str || '').replace(/[&<>\"']/g, function(s){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[s];
  });
}

// On load, try to load persisted metadata and show it (user still needs to re-add files to play them)
(async function loadPersistedMeta(){
  try{
    const persisted = await idbKeyval.get('playlistMeta');
    if (persisted && persisted.length) {
      // show persisted list entries as disabled placeholders
      track_list = persisted.map(p => ({ name: p.name, artist: p.artist, image: '', path: '', fileName: p.fileName }));
      renderPlaylist();
      if (fileCountSpan) fileCountSpan.textContent = `${track_list.length} saved track(s) (re-add files to play)`;
    }
  }catch(err){
    console.warn('Failed to load persisted metadata', err);
  }
})();

function loadTrack(track_index) {
  // Clear the previous seek timer
  clearInterval(updateTimer);
  resetValues();

  // Load a new track
  curr_track.src = track_list[track_index].path;
  curr_track.load();

  // Update details of the track
  track_art.style.backgroundImage = 
     "url(" + track_list[track_index].image + ")";
  track_name.textContent = track_list[track_index].name;
  track_artist.textContent = track_list[track_index].artist;
  now_playing.textContent = 
     "PLAYING " + (track_index + 1) + " OF " + track_list.length;

  // Set an interval of 1000 milliseconds
  // for updating the seek slider
  updateTimer = setInterval(seekUpdate, 1000);

  // Move to the next track if the current finishes playing
  // using the 'ended' event
  curr_track.removeEventListener("ended", nextTrack);
  curr_track.addEventListener("ended", nextTrack);

  // Apply a random background color
  random_bg_color();
}

function random_bg_color() {
  // Get a random number between 64 to 256
  // (for getting lighter colors)
  let red = Math.floor(Math.random() * (256 - 64)) + 64;
  let green = Math.floor(Math.random() * (256 - 64)) + 64;
  let blue = Math.floor(Math.random() * (256 - 64)) + 64;

  // Construct a color with the given values
  let bgColor = "rgb(" + red + ", " + green + ", " + blue + ")";

  // Set the background to the new color
  document.body.style.background = bgColor;
}

// Function to reset all values to their default
function resetValues() {
  curr_time.textContent = "00:00";
  total_duration.textContent = "00:00";
  seek_slider.value = 0;
}

function playpauseTrack() {
  // Switch between playing and pausing
  // depending on the current state
  if (!isPlaying) playTrack();
  else pauseTrack();
}

function playTrack() {
  // Play the loaded track
  curr_track.play();
  isPlaying = true;

  // Replace icon with the pause icon
  // prefer toggling classes on the existing <i> to avoid overwriting event listeners
  let icon = playpause_btn.querySelector('i');
  if (icon) {
    icon.className = 'fa fa-pause-circle fa-5x';
  }
}

function pauseTrack() {
  // Pause the loaded track
  curr_track.pause();
  isPlaying = false;

  // Replace icon with the play icon
  let icon = playpause_btn.querySelector('i');
  if (icon) {
    icon.className = 'fa fa-play-circle fa-5x';
  }
}

function nextTrack() {
  // Go back to the first track if the
  // current one is the last in the track list
  if (track_index < track_list.length - 1)
    track_index += 1;
  else track_index = 0;

  // Load and play the new track
  loadTrack(track_index);
  playTrack();
}

function prevTrack() {
  // Go back to the last track if the
  // current one is the first in the track list
  if (track_index > 0)
    track_index -= 1;
  else track_index = track_list.length - 1;
  
  // Load and play the new track
  loadTrack(track_index);
  playTrack();
}

function seekTo() {
  // Calculate the seek position by the
  // percentage of the seek slider 
  // and get the relative duration to the track
  let seekto = curr_track.duration * (seek_slider.value / 100);

  // Set the current track position to the calculated seek position
  curr_track.currentTime = seekto;
}

function setVolume() {
  // Set the volume according to the
  let volumeValue = Math.min(100, Math.max(0, Number(volume_slider.value)));
  curr_track.volume = volumeValue / 100;
}

function seekUpdate() {
  let seekPosition = 0;

  // Check if the current track duration is a legible number
  if (!isNaN(curr_track.duration)) {
    seekPosition = curr_track.currentTime * (100 / curr_track.duration);
    seek_slider.value = seekPosition;

    // Calculate the time left and the total duration
    let currentMinutes = Math.floor(curr_track.currentTime / 60);
    let currentSeconds = Math.floor(curr_track.currentTime - currentMinutes * 60);
    let durationMinutes = Math.floor(curr_track.duration / 60);
    let durationSeconds = Math.floor(curr_track.duration - durationMinutes * 60);

    // Add a zero to the single digit time values
    if (currentSeconds < 10) { currentSeconds = "0" + currentSeconds; }
    if (durationSeconds < 10) { durationSeconds = "0" + durationSeconds; }
    if (currentMinutes < 10) { currentMinutes = "0" + currentMinutes; }
    if (durationMinutes < 10) { durationMinutes = "0" + durationMinutes; }

    // Display the updated duration
    curr_time.textContent = currentMinutes + ":" + currentSeconds;
    total_duration.textContent = durationMinutes + ":" + durationSeconds;
  }
}

// Initialization function to set up the player and attach event listeners
function init() {
  // Add event listeners for controls
  playpause_btn.addEventListener("click", playpauseTrack);
  next_btn.addEventListener("click", nextTrack);
  prev_btn.addEventListener("click", prevTrack);
  // Keyboard support (Enter / Space)
  [playpause_btn, next_btn, prev_btn].forEach(el => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (el === playpause_btn) playpauseTrack();
        else if (el === next_btn) nextTrack();
        else if (el === prev_btn) prevTrack();
      }
    });
  });
  seek_slider.addEventListener("input", seekTo);
  volume_slider.addEventListener("input", setVolume);

  // Load the first track
  loadTrack(track_index);
}

// Start the player
init();