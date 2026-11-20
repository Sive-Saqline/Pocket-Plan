"use client";

import { ArrowUp, Mic, RotateCcw, Sparkles, Square } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { ExpenseSuggestion } from "@/lib/ai";
import { useAuth } from "@/lib/auth";
import { isoDate } from "@/lib/dates";
import { useSpeechInput } from "@/lib/use-speech";

// Shown as "Voice: EN · BN"; Bangla stays the default for new devices.
const VOICE_LANGS = [
  { code: "en-US", short: "EN", name: "English" },
  { code: "bn-BD", short: "BN", name: "Bangla" },
] as const;
const DEFAULT_VOICE_LANG = "bn-BD";
const VOICE_LANG_KEY = "pp-voice-lang";

function savedVoiceLang(): string {
  try {
    const saved = localStorage.getItem(VOICE_LANG_KEY);
    if (VOICE_LANGS.some((l) => l.code === saved)) return saved!;
  } catch {
    // storage blocked: use the default
  }
  return DEFAULT_VOICE_LANG;
}

/**
 * Small "Ask AI" pill for a form header: opens and closes the box. Manual
 * entry comes first (the form is always fully visible).
 */
export function AskAiButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls="ai-composer"
      className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        open
          ? "border-accent/50 bg-accent/10 text-accent"
          : "border-border text-text-muted hover:border-accent/40 hover:text-accent"
      }`}
    >
      <Sparkles aria-hidden size={15} />
      Ask AI
    </button>
  );
}

type Result = { text: string; summary: string };

/**
 * A chat-style box, kept to one row: the sentence, a mic, and send. Typed
 * or spoken, the sentence fills the form below for the user to check (PRD
 * §6.14). Nothing is saved here, and the fill can be undone.
 *
 * `onSend` replaces the form fill with any other action (Reports, Step 20):
 * it resolves with the line shown next to Undo, or throws an Error whose
 * message is shown.
 */
export function AiComposer<S extends ExpenseSuggestion>({
  onSend,
  groupId,
  initialText = "",
  placeholder,
  onSuggestion,
  onUndo,
  onClose,
}: {
  /** Any other action instead of the expense fill (see above). */
  onSend?: (sentence: string) => Promise<string>;
  /** Fill a shared expense in this group. */
  groupId?: string;
  initialText?: string;
  /** An example sentence, e.g. "Lunch 250 by bKash yesterday". */
  placeholder: string;
  /** Fill the form; returns the names of the fields it changed. */
  onSuggestion?: (suggestion: S, text: string) => string[];
  /** Put the form back the way it was before the fill. */
  onUndo: () => void;
  onClose: () => void;
}) {
  const { request } = useAuth();
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Voice: spoken words go after whatever was already typed.
  const [voiceLang, setVoiceLang] = useState<string>(DEFAULT_VOICE_LANG);
  const typedBefore = useRef("");
  const speech = useSpeechInput((spoken) => {
    const base = typedBefore.current;
    setText((base && spoken ? `${base} ${spoken}` : base || spoken).slice(0, 300));
  });
  const lang = VOICE_LANGS.find((l) => l.code === voiceLang) ?? VOICE_LANGS[0];
  const otherLang = VOICE_LANGS.find((l) => l.code !== voiceLang)!;
  const hasText = text.trim().length > 0;

  useEffect(() => setVoiceLang(savedVoiceLang()), []);

  function toggleMic() {
    if (speech.listening) {
      speech.stop();
      return;
    }
    typedBefore.current = text.trim();
    setError(null);
    speech.start(voiceLang);
  }

  function switchLang() {
    setVoiceLang(otherLang.code);
    try {
      localStorage.setItem(VOICE_LANG_KEY, otherLang.code);
    } catch {
      // not remembered; still used now
    }
    if (speech.listening) {
      typedBefore.current = text.trim(); // keep what was heard so far
      speech.start(otherLang.code);
    }
  }

  // Grow with the text, up to about four lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text, result]);

  useEffect(() => inputRef.current?.focus(), []);

  async function send() {
    const sentence = text.trim();
    if (!sentence || busy) return;
    if (speech.listening) speech.stop();
    setBusy(true);
    setError(null);
    try {
      if (onSend) {
        setResult({ text: sentence, summary: await onSend(sentence) });
        return;
      }
      const suggestion = await request<S>("/ai/parse-expense", {
        method: "POST",
        body: { text: sentence, today: isoDate(), ...(groupId && { groupId }) },
      });
      const filled = onSuggestion?.(suggestion, sentence) ?? [];
      if (filled.length === 0) {
        setError('Couldn\'t find an expense in that. Try something like "Lunch 250".');
      } else {
        setResult({ text: sentence, summary: `Filled ${listOf(filled)}. Check it, then save.` });
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Couldn't reach the AI. Fill in the form yourself.",
      );
    } finally {
      setBusy(false);
    }
  }

  // Enter sends; Shift+Enter adds a line; Escape closes. Never submits (saves) the form.
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation(); // close the box, not the whole form
      onClose();
    }
  }

  /** The only way to clear the AI's work: empties the box and puts the form back. */
  function undo() {
    if (speech.listening) speech.stop();
    onUndo();
    setText("");
    setResult(null);
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <div id="ai-composer" className="flex flex-col gap-1.5">
      <div
        className={`flex items-end gap-1 rounded-[26px] border bg-surface-muted/60 p-1.5 transition-colors focus-within:border-accent/50 focus-within:bg-surface ${
          busy || speech.listening ? "ai-thinking border-accent/50" : "border-border"
        }`}
      >
        <label htmlFor="ai-text" className="sr-only">
          Describe the expense
        </label>
        <textarea
          id="ai-text"
          ref={inputRef}
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
            speech.clearError();
          }}
          onKeyDown={onKeyDown}
          readOnly={busy || speech.listening}
          maxLength={300}
          placeholder={speech.listening ? `Listening in ${lang.name}…` : busy ? "Reading…" : placeholder}
          className="max-h-[120px] min-w-0 flex-1 resize-none self-center bg-transparent py-1.5 pl-3 text-base leading-6 outline-none placeholder:text-text-muted/55"
        />

        {speech.supported && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={busy}
            aria-pressed={speech.listening}
            aria-label={speech.listening ? "Stop listening" : `Speak (${lang.name})`}
            title={speech.listening ? "Stop" : `Speak (${lang.name})`}
            className={`grid size-9 shrink-0 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 ${
              speech.listening ? "bg-danger text-white" : "text-text-muted hover:bg-surface-muted hover:text-text"
            }`}
          >
            {speech.listening ? <Square aria-hidden size={13} fill="currentColor" /> : <Mic aria-hidden size={19} />}
          </button>
        )}

        <button
          type="button"
          onClick={() => void send()}
          disabled={busy || !hasText}
          aria-label="Fill the form"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-text-inverse transition-all hover:bg-accent-hover disabled:bg-transparent disabled:text-text-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {busy ? (
            <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
          ) : (
            <ArrowUp aria-hidden size={18} strokeWidth={2.5} />
          )}
        </button>
      </div>

      {(error || speech.error) && (
        <p role="alert" className="px-4 text-sm text-danger">
          {error ?? speech.error}
        </p>
      )}

      {/* After a fill: the sentence stays in the box; Undo is its own button. */}
      {result && (
        <div role="status" className="flex items-center gap-2 pl-4">
          <Sparkles aria-hidden size={14} className="shrink-0 text-accent" />
          <p className="min-w-0 flex-1 text-sm text-text">{result.summary}</p>
          <button
            type="button"
            onClick={undo}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-medium text-text-muted hover:border-accent/40 hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
          >
            <RotateCcw aria-hidden size={14} />
            Undo
          </button>
        </div>
      )}

      {/* One quiet line under the box: the voice language, only when it matters. */}
      {speech.supported && !error && !speech.error && (
        <div role="group" aria-label="Voice language" className="flex items-center gap-1 px-4 text-xs text-text-muted">
          <span>Voice:</span>
          {VOICE_LANGS.map((l, i) => {
            const active = l.code === voiceLang;
            return (
              <span key={l.code} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden>·</span>}
                <button
                  type="button"
                  onClick={() => !active && switchLang()}
                  aria-pressed={active}
                  aria-label={l.name}
                  className={`rounded px-1 py-0.5 font-semibold focus-visible:outline-2 focus-visible:outline-accent ${
                    active ? "text-accent" : "text-text-muted/70 hover:text-text"
                  }`}
                >
                  {l.short}
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function listOf(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
