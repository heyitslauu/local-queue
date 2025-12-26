import { CounterType } from './counter-type.enum';

export interface ServiceStatus {
  counterType: CounterType;
  serving: string[];
}

export interface DisplayState {
  services: ServiceStatus[];
  waitingCount: number;
  updatedAt: string;
}
