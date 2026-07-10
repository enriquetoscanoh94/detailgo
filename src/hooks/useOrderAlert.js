/**
 * Plays the "new order" chime on demand.
 *
 * Returns a stable `play()` function the dispatch screen calls when a fresh
 * order lands in the queue. Playback is wrapped in try/catch because browsers
 * (web preview) block audio until the user has interacted with the page — a
 * blocked play must never crash the screen.
 */

import { useCallback } from 'react';
import { useAudioPlayer } from 'expo-audio';

const ALERT_SOUND = require('../../assets/new-order.wav');

export function useOrderAlert() {
  const player = useAudioPlayer(ALERT_SOUND);

  return useCallback(() => {
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // Autoplay blocked or audio unavailable — ignore.
    }
  }, [player]);
}

export default useOrderAlert;
