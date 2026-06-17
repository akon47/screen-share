# [Screen Share](https://screenshare.kimhwan.kr)

<p>

  <img src="https://counter.kimhwan.kr/?key=github-akon47-screen-share" />
  <img alt="GitHub" src="https://img.shields.io/github/license/akon47/screen-share">
  <img alt="GitHub starts" src="https://img.shields.io/github/stars/akon47/screen-share">
</p>

A browser-based screen sharing service. Start sharing your screen in one click and let others watch live — no installs, no plugins. Streaming runs peer-to-peer over WebRTC, with a signaling server only used to connect peers.

![screenshare kimhwan kr_screen-sharing](https://user-images.githubusercontent.com/49547202/200319187-034b1193-d5a9-4563-bffc-92dc956d0c36.png)

## ✨ Features

### Sharing
- **One-click screen sharing** over WebRTC — peer-to-peer, no install required.
- **Host & viewer roles** with support for **multiple simultaneous viewers** on a single host.
- **Public channel directory** — browse and join currently active public rooms, with live viewer counts and a lock/open status badge.
- **Public or private rooms** with an **optional password**.
- **Change screen / pause sharing** on the fly without leaving the room — the room stays alive while you pick a new source.
- **Audio sharing** with mute / unmute controls for both host and viewers.
- **QR code** and **copyable share link** for quickly inviting others.

### Interaction
- **Real-time text chat** with **editable nicknames**.
- **Emoji reactions** that float over the shared screen for everyone to see.
- **Live host annotations** — draw over your screen with a pen/eraser, color and width selection. Strokes are broadcast to all viewers, replayed for late joiners, and can be cleared at any time.
- **Host moderation** — kick viewers from the room.

### Quality & reliability
- **Connection quality indicator** (good / fair / poor) showing packet loss, RTT and bitrate.
- **Direct (P2P) vs relay (TURN)** connection badge.
- **Adaptive bitrate** — the host automatically tunes per-viewer quality based on the packet loss each viewer reports.
- **Manual quality presets** (Auto / 1080p / 720p / 480p).
- **Automatic reconnection** with ICE restart, and **TURN fallback** for restrictive networks (mobile / CGNAT).
- **Fullscreen** support and **auto-hiding, YouTube-style** player controls.

### Experience
- **Dark / light theme** toggle.
- **Multilingual UI** — Korean and English.

## 📃 Usage
- To share your screen with others, click **New Sharing** to create a room and pick a screen.
- To watch someone else's screen, click **Join Sharing** and enter a channel ID (and password if required), or pick a room from **Browse Public Rooms**.

## 🛠️ Tech Stack
- Vue 3 + TypeScript, Vuex, Vue Router, Vue I18n
- WebRTC for peer-to-peer media, STOMP / SockJS over WebSocket for signaling

## 💻 Development
```bash
# install dependencies
npm install

# run the dev server
npm run serve

# build for production
npm run build
```

## 💁 Feature Request
- If you have any features you want, please request them on the [issues](https://github.com/akon47/screen-share/issues) with the **Feature Request** label.

## 🎆 Contributing
- This project is an open source project. Anyone can contribute in any way.

## 🐞 Bug Report
- If you find a bug, please report to us posting [issues](https://github.com/akon47/screen-share/issues) on GitHub.
