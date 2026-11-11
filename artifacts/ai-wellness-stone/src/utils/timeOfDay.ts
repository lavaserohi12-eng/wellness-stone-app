export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export function getTimeOfDay(date?: Date): TimeOfDay {
  const hour = (date ?? new Date()).getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export function getGreeting(tod: TimeOfDay): string {
  switch (tod) {
    case 'morning':   return 'How are you this morning?';
    case 'afternoon': return 'How are you this afternoon?';
    case 'evening':   return 'How are you this evening?';
    case 'night':     return 'How are you tonight?';
  }
}

export function getCheckInButtonLabel(tod: TimeOfDay): string {
  switch (tod) {
    case 'morning':   return "Begin this morning's check-in";
    case 'afternoon': return "Begin this afternoon's check-in";
    case 'evening':   return "Begin this evening's check-in";
    case 'night':     return "Begin tonight's check-in";
  }
}

export function getSessionWord(tod: TimeOfDay): string {
  switch (tod) {
    case 'morning':   return 'this morning';
    case 'afternoon': return 'this afternoon';
    case 'evening':   return 'this evening';
    case 'night':     return 'tonight';
  }
}
