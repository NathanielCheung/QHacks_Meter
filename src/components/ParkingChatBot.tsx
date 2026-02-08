import { useState, useRef, useEffect } from 'react';
import type { ParkingLocation } from '@/data/parkingData';
import { answerParkingQuestion, type ChatUserLocation } from '@/lib/parkingChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open, messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    const answer = answerParkingQuestion(parkingData, text, new Date(), userLocation);
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
            <Button type="submit" size="sm">
              Send
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
