import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

export type TicketSeverity = 'critical' | 'high' | 'medium' | 'low';
export type TicketStatus = 'open' | 'investigating' | 'resolved';

export interface TriageTicket {
  id: string;
  title: string;
  description: string;
  severity: TicketSeverity;
  status: TicketStatus;
  component: string;
  linkedLogIds: string[];
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

interface TriageTicketState {
  tickets: TriageTicket[];
  addTicket: (ticket: Omit<TriageTicket, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTicketStatus: (id: string, status: TicketStatus) => void;
  addNote: (id: string, note: string) => void;
  deleteTicket: (id: string) => void;
}

export const useTriageTicketStore = create<TriageTicketState>()(
  devtools(
    persist(
      (set) => ({
        tickets: [],
        addTicket: (ticket) =>
          set((state) => ({
            tickets: [
              {
                ...ticket,
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              ...state.tickets,
            ],
          })),
        updateTicketStatus: (id, status) =>
          set((state) => ({
            tickets: state.tickets.map((t) =>
              t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t
            ),
          })),
        addNote: (id, note) =>
          set((state) => ({
            tickets: state.tickets.map((t) =>
              t.id === id
                ? { ...t, notes: [...t.notes, note], updatedAt: new Date().toISOString() }
                : t
            ),
          })),
        deleteTicket: (id) =>
          set((state) => ({
            tickets: state.tickets.filter((t) => t.id !== id),
          })),
      }),
      { name: 'triage-tickets' }
    ),
    { name: 'TriageTicketStore' }
  )
);
