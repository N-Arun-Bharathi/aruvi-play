import React, { useState, useRef } from "react";
import { Song } from "@aruvi/shared";
import { useToastStore } from "../store/toastStore";
import { Share2, X, Download, Copy, Sparkles, Check } from "lucide-react";

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song | null;
}

type CardTheme = "midnight" | "cyber" | "aurora" | "sunset";

const THEMES: Array<{ id: CardTheme; name: string; bgClass: string; gradientColors: [string, string, string] }> = [
  {
    id: "midnight",
    name: "Midnight Slate",
    bgClass: "from-[#0a0f1d] via-[#0f172a] to-[#131f38]",
    gradientColors: ["#0a0f1d", "#0f172a", "#131f38"],
  },
  {
    id: "cyber",
    name: "Cyber Electric",
    bgClass: "from-[#061e38] via-[#0d2a52] to-[#041126]",
    gradientColors: ["#061e38", "#0d2a52", "#041126"],
  },
  {
    id: "aurora",
    name: "Deep Aurora",
    bgClass: "from-[#042426] via-[#0b1b33] to-[#0d1527]",
    gradientColors: ["#042426", "#0b1b33", "#0d1527"],
  },
  {
    id: "sunset",
    name: "Cosmic Twilight",
    bgClass: "from-[#1a1033] via-[#0f172a] to-[#09152b]",
    gradientColors: ["#1a1033", "#0f172a", "#09152b"],
  },
];

export const ShareCardModal: React.FC<ShareCardModalProps> = ({ isOpen, onClose, song }) => {
  const { show: showToast } = useToastStore();
  const [selectedTheme, setSelectedTheme] = useState<CardTheme>("midnight");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !song) return null;

  const currentThemeObj = THEMES.find((t) => t.id === selectedTheme) || THEMES[0];

  const handleCopyLink = () => {
    const url = window.location.origin;
    navigator.clipboard.writeText(`${url}/#song=${song.id}`);
    setCopied(true);
    showToast("Song link copied to clipboard! 🔗", "success");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadCard = async () => {
    setIsGenerating(true);
    try {
      // Create high-res canvas (1080x1920 9:16 vertical story)
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw background gradient
      const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
      grad.addColorStop(0, currentThemeObj.gradientColors[0]);
      grad.addColorStop(0.5, currentThemeObj.gradientColors[1]);
      grad.addColorStop(1, currentThemeObj.gradientColors[2]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Draw ambient light orbs
      const orbGrad1 = ctx.createRadialGradient(250, 450, 10, 250, 450, 600);
      orbGrad1.addColorStop(0, "rgba(56, 189, 248, 0.25)");
      orbGrad1.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = orbGrad1;
      ctx.fillRect(0, 0, 1080, 1920);

      const orbGrad2 = ctx.createRadialGradient(850, 1400, 10, 850, 1400, 700);
      orbGrad2.addColorStop(0, "rgba(37, 99, 235, 0.2)");
      orbGrad2.addColorStop(1, "rgba(37, 99, 235, 0)");
      ctx.fillStyle = orbGrad2;
      ctx.fillRect(0, 0, 1080, 1920);

      // Header Branding: "ARUVI PLAY"
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 42px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ARUVI PLAY", 540, 220);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("NOW LISTENING ON ARUVI", 540, 275);

      // Draw Artwork
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = song.artwork || "/aruvi-play.png";

      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      const artSize = 640;
      const artX = (1080 - artSize) / 2;
      const artY = 360;

      // Draw rounded artwork
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 50;
      ctx.shadowOffsetY = 25;
      ctx.beginPath();
      ctx.roundRect(artX, artY, artSize, artSize, 48);
      ctx.clip();
      ctx.drawImage(img, artX, artY, artSize, artSize);
      ctx.restore();

      // Song Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 56px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "center";
      const title = song.title.length > 25 ? song.title.slice(0, 25) + "..." : song.title;
      ctx.fillText(title, 540, 1120);

      // Artist Name
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 38px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      const artist = song.artist.length > 30 ? song.artist.slice(0, 30) + "..." : song.artist;
      ctx.fillText(artist, 540, 1185);

      // Album / Year
      if (song.album) {
        ctx.fillStyle = "#64748b";
        ctx.font = "500 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillText(song.album, 540, 1235);
      }

      // Draw Aesthetic Audio Waveform Bars
      const barCount = 32;
      const barWidth = 10;
      const barGap = 12;
      const totalWaveWidth = barCount * (barWidth + barGap);
      const waveStartX = (1080 - totalWaveWidth) / 2;
      const waveY = 1380;

      for (let i = 0; i < barCount; i++) {
        const height = 20 + Math.sin(i * 0.4) * 45 + Math.cos(i * 0.2) * 30;
        const x = waveStartX + i * (barWidth + barGap);

        const barGrad = ctx.createLinearGradient(0, waveY - height / 2, 0, waveY + height / 2);
        barGrad.addColorStop(0, "#38bdf8");
        barGrad.addColorStop(1, "#2563eb");
        ctx.fillStyle = barGrad;
        ctx.beginPath();
        ctx.roundRect(x, waveY - height / 2, barWidth, height, 5);
        ctx.fill();
      }

      // Footer Watermark
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("Listen ad-free on Aruvi Play", 540, 1680);

      ctx.fillStyle = "#64748b";
      ctx.font = "24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("320kbps Lossless Audio • Real-time Lyrics", 540, 1725);

      // Trigger Download
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${song.title.replace(/[^a-zA-Z0-9]/g, "_")}_Aruvi_Story.png`;
      a.click();
      showToast("Story card downloaded! 📸", "success");
    } catch (e) {
      console.error("Failed to generate story card:", e);
      showToast("Could not download story card image.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-2xl bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-sky-500/15 backdrop-blur-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center text-slate-950 shadow-lg shadow-sky-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Share Song Story Card
              </h2>
              <p className="text-xs text-slate-400 font-medium">Export aesthetic card for Instagram & WhatsApp Stories</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Picker */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Choose Aesthetic Theme
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {THEMES.map((theme) => {
              const isSelected = selectedTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all text-center ${
                    isSelected
                      ? "bg-slate-800 border-sky-400 text-white shadow-md shadow-sky-500/15"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  {theme.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Story Card 9:16 Preview */}
        <div className="flex justify-center py-2">
          <div
            ref={cardRef}
            className={`w-64 sm:w-72 aspect-[9/16] rounded-3xl p-6 flex flex-col justify-between items-center text-center shadow-2xl border border-white/15 bg-gradient-to-b ${currentThemeObj.bgClass} relative overflow-hidden transition-all`}
          >
            {/* Ambient background glow */}
            <div className="absolute -top-12 -left-12 w-36 h-36 bg-sky-500/25 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-blue-600/20 rounded-full blur-2xl pointer-events-none" />

            {/* Top Branding */}
            <div className="space-y-0.5 pt-2 relative z-10">
              <span className="text-xs font-black tracking-widest text-sky-400">ARUVI PLAY</span>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Now Listening</p>
            </div>

            {/* Center Artwork */}
            <div className="space-y-4 w-full flex flex-col items-center relative z-10">
              <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-2xl overflow-hidden shadow-2xl border border-white/20">
                <img
                  src={song.artwork || "/aruvi-play.png"}
                  alt={song.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1 w-full px-2">
                <h4 className="text-base font-black text-white truncate">{song.title}</h4>
                <p className="text-xs font-bold text-sky-400 truncate">{song.artist}</p>
                {song.album && <p className="text-[10px] text-slate-400 truncate">{song.album}</p>}
              </div>

              {/* Waveform graphic */}
              <div className="flex items-center justify-center gap-1 h-6">
                {[12, 24, 18, 28, 14, 22, 16, 26, 20, 15, 24, 18].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 bg-gradient-to-t from-sky-400 to-blue-600 rounded-full"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
            </div>

            {/* Bottom Tag */}
            <div className="pt-2 text-[9px] text-slate-400 font-medium relative z-10">
              Listen on <strong className="text-white">aruvi.play</strong>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            onClick={handleCopyLink}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-sky-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Link Copied!" : "Copy Song Link"}</span>
          </button>

          <button
            onClick={handleDownloadCard}
            disabled={isGenerating}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isGenerating ? "Exporting PNG..." : "Download Story Card (PNG)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
