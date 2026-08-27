# Aruvi Play API Documentation

## Endpoints & Services

### JioSaavn API Proxy
- **Base Proxy**: `/jiosaavn-api` -> `https://www.jiosaavn.com`
- **Search**: `__call=search.getResults&q=<query>`
- **Recommendations**: `__call=reco.getreco&pid=<song_id>`

### Audio Encryption / Decryption
- **Cipher**: DES ECB mode (`key: 38346591`)
- Decrypts `encrypted_media_url` into direct `aac.saavncdn.com` 320kbps MP4 audio streams.
