export type Role = 'solicitante' | 'agente';
export type Failure = { ok: false; message: string };
export interface Membership {
  reference: string;
  role: Role;
}
export interface SessionStatus extends Membership {
  peerChatId: number | undefined;
}
interface Session {
  solicitante?: number;
  agente?: number;
  lastSpeaker?: number;
}

export function isTicketReference(reference: string): boolean {
  return /^TK-\d{6,}$/.test(reference) && reference === reference.trim();
}

export class SessionManager {
  private readonly sessions = new Map<string, Session>();
  private readonly memberships = new Map<number, Membership>();

  join(chatId: number, reference: string, role: string): { ok: true; message: string } | Failure {
    if (!isTicketReference(reference)) {
      return { ok: false, message: 'Referencia inválida. Usa TK- seguido de al menos 6 dígitos.' };
    }
    if (role !== 'solicitante' && role !== 'agente') {
      return { ok: false, message: 'Rol inválido. Usa solicitante o agente.' };
    }
    const current = this.memberships.get(chatId);
    if (current) {
      return {
        ok: current.reference === reference && current.role === role,
        message: `Ya estás unido a ${current.reference} como ${current.role}. Usa /salir antes de cambiar de ticket o rol.`,
      };
    }
    const session = this.sessions.get(reference) ?? {};
    if (session[role] !== undefined) {
      return {
        ok: false,
        message: `El rol ${role} de ${reference} ya está ocupado por otro chat.`,
      };
    }
    session[role] = chatId;
    delete session.lastSpeaker;
    this.sessions.set(reference, session);
    this.memberships.set(chatId, { reference, role });
    return {
      ok: true,
      message: `Unido a ${reference} como ${role}. Usa /estado para consultar la conexión.`,
    };
  }

  status(chatId: number): SessionStatus | undefined {
    const membership = this.memberships.get(chatId);
    if (!membership) return undefined;
    const peerRole = membership.role === 'solicitante' ? 'agente' : 'solicitante';
    return { ...membership, peerChatId: this.sessions.get(membership.reference)?.[peerRole] };
  }

  leave(chatId: number): boolean {
    const membership = this.memberships.get(chatId);
    if (!membership) return false;
    const session = this.sessions.get(membership.reference);
    if (session) {
      delete session[membership.role];
      delete session.lastSpeaker;
      if (session.agente === undefined && session.solicitante === undefined) {
        this.sessions.delete(membership.reference);
      }
    }
    this.memberships.delete(chatId);
    return true;
  }

  route(
    chatId: number,
  ): (Membership & { ok: true; toChatId: number; needsLabel: boolean }) | Failure {
    const status = this.status(chatId);
    if (!status)
      return {
        ok: false,
        message: 'No estás unido a un ticket. Usa /ticket TK-000001 solicitante o agente.',
      };
    if (status.peerChatId === undefined) {
      return {
        ok: false,
        message: 'El otro lado aún no se ha unido. Este mensaje no se entregó ni se puso en cola.',
      };
    }
    return {
      ok: true,
      reference: status.reference,
      role: status.role,
      toChatId: status.peerChatId,
      needsLabel: this.sessions.get(status.reference)?.lastSpeaker !== chatId,
    };
  }

  markLabelSent(chatId: number): void {
    const membership = this.memberships.get(chatId);
    const session = membership && this.sessions.get(membership.reference);
    if (session) session.lastSpeaker = chatId;
  }
}
