import { tapSay } from '../audio/speech';
import { Emoji } from '../components/Icon';

interface Props {
  onPlay: () => void;
  onBack: () => void;
}

/** 📺 TV games: whole-body games for a laptop on the TV, mixing math and reading at the child's levels. */
export function TvGames({ onPlay, onBack }: Props) {
  return (
    <div className="screen tv-games">
      <div className="topbar">
        <button className="back-btn" onClick={onBack} aria-label="Home"><Emoji text="⬅️" /> Home</button>
      </div>
      <h1 className="title" onClick={() => tapSay('TV games! Stand back and play with your whole body.')}>
        <Emoji text="📺" /> TV Games
      </h1>
      <div className="tv-list">
        <button className="tv-card" onClick={onPlay} aria-label="Dino Maze: help Dino Mom find her babies">
          <span className="big-emoji"><Emoji text="🦕🌿🦖" /></span>
          <span className="tv-card-name">Dino Maze</span>
          <span className="tv-card-sub">Smash, chop, grab &amp; jump to the babies!</span>
        </button>
      </div>
      <p className="tv-note">
        <Emoji text="📷" /> Uses the camera to see your moves — the pictures stay on this device. Stand back so your whole upper body is on screen. No camera? Tap the answers instead.
      </p>
    </div>
  );
}
