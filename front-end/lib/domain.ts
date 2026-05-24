export type ApiListResponse<T> = T[];

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'ADMIN' | 'PARTICIPANTE';
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type EventRecord = {
  id: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  location: string;
  type: string;
  capacity: number;
  status: 'CRIANDO' | 'ATIVA' | 'ENCERRADA' | 'CANCELADA';
  certificateRequiredPercent?: number;
  speakerIds?: string[];
  createdAt?: string;
};

export type RegistrationRecord = {
  id: string;
  participantId: string;
  eventId: string;
  status: 'ATIVO' | 'CANCELADO' | 'CONCLUIDO';
  registrationDate: string;
  attendancePercent: number;
  attendedSessionsCount: number;
  totalSessionsCount: number;
  approvedForCertificate: boolean;
  approvedAt?: string | null;
};

export type CertificateRecord = {
  id: string;
  registrationId: string;
  verificationCode: string;
  issueDate: string;
  pdfUrl: string;
  expiresAt?: string | null;
  attendancePercentAtIssue: number;
  issuedByAdminId: string;
};

export type EventSessionRecord = {
  id: string;
  eventId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  room?: string | null;
};

export type AttendanceRecord = {
  id: string;
  registrationId: string;
  eventSessionId: string;
  present: boolean;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  markedByUserId?: string | null;
  notes?: string | null;
  createdAt?: string;
};

export type SpeakerRecord = {
  id: string;
  name: string;
  email: string;
  bio?: string | null;
  institution?: string | null;
  phone?: string | null;
  isActive?: boolean;
  eventIds?: string[];
};
