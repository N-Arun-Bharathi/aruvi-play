import TrackPlayer from 'react-native-track-player';
TrackPlayer.registerPlaybackService(() => require('./services/playbackService').playbackService);

import "expo-router/entry";
