import { useState, useRef, useEffect } from 'react';
import type { ParkingLocation } from '@/data/parkingData';
import {
  answerParkingQuestion,
  buildParkingContextForOllama,
  type ChatUserLocation,
} from '@/lib/parkingChat';
import { askOllama } from '@/lib/ollama';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Set VITE_USE_OLLAMA=true to use Ollama with live parking context; otherwise rule-based. */
const USE_OLLAMA = import.meta.env.VITE_USE_OLLAMA === 'true';

const OLLAMA_SYSTEM_INSTRUCTIONS = `You are a parking assistant for downtown Kingston, Ontario. Use ONLY the current parking data provided below to answer. Be concise (1-4 sentences).

You can answer:
- Core availability: how many spots on a street/lot, is X full, free parking, which has most available, closest to user.
- Lot questions: total spots, spots left, how many cars, percentage full. For "filling up or emptying" say we only have current counts, not trends.
- Location-based: parking near Queen's University, KGH, Waterfront; what streets to check if a lot is full; parking near Princess Street.
- Time/prediction: say we don't have historical or prediction data—only live availability.
- Real-time: "just opened" / "map says full but I see empty" — explain that sensors update every few seconds and there can be a short lag.

If the question isn't in the data or is off-topic, say so briefly. Do not make up street names or numbers.`;

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
}

interface ParkingChatBotProps {
  parkingData: ParkingLocation[];
  /** Optional: from map search — used for "closest parking to me" */
  userLocation?: ChatUserLocation | null;
  className?: string;
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'bot',
  content:
    "Hi! Ask about spots, free parking, rates, or \"parking near Queen's?\". Search an address on the map first for \"closest to me\".",
};

export function ParkingChatBot({ parkingData, userLocation, className }: ParkingChatBotProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open, messages]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);

    const now = new Date();
    let answer: string;
    if (USE_OLLAMA) {
      setLoading(true);
      try {
        const context = buildParkingContextForOllama(parkingData, now, userLocation);
        const promptWithContext = `${context}\n\nUser question: ${text}`;
        answer = await askOllama(promptWithContext, OLLAMA_SYSTEM_INSTRUCTIONS);
      } catch {
        answer = answerParkingQuestion(parkingData, text, now, userLocation);
      } finally {
        setLoading(false);
      }
    } else {
      answer = answerParkingQuestion(parkingData, text, now, userLocation);
    }

    const botMsg: Message = {
      id: `b-${Date.now()}`,
      role: 'bot',
      content: answer,
    };
    setMessages((prev) => [...prev, botMsg]);
  };

  return (
    <>
      <Button
        variant="secondary"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'fixed bottom-6 right-6 z-[1002] h-12 w-12 rounded-full shadow-lg glass-panel',
          className
        )}
        aria-label={open ? 'Close chat' : 'Open parking assistant'}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </Button>

      {open && (
        <div
          className="fixed bottom-20 right-6 z-[1002] w-[min(360px,calc(100vw-2rem))] rounded-xl border border-border/50 bg-background/95 shadow-xl backdrop-blur-sm flex flex-col overflow-hidden"
          style={{ maxHeight: 'min(70vh, 420px)' }}
        >
          <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
            <h3 className="font-semibold text-sm">Parking assistant</h3>
            <p className="text-xs text-muted-foreground">Ask about free parking, spots, or rates</p>
          </div>
          <ScrollArea className="flex-1 p-3 min-h-0">
            <div className="flex flex-col gap-3 pr-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm max-w-[90%]',
                    m.role === 'user'
                      ? 'ml-auto bg-primary text-primary-foreground'
                      : 'mr-auto bg-muted text-foreground whitespace-pre-line'
                  )}
                >
                  {m.content}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
          <form
            className="p-3 border-t border-border/50 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. free parking on Princess?"
              className="flex-1 min-w-0"
              aria-label="Ask about parking"
            />
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? '…' : 'Send'}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
