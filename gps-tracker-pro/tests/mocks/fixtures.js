/** Shared API fixtures for MSW + Playwright mocks */

export const mockUser = {
  id: 1,
  name: 'Admin',
  email: 'admin@test.com',
  administrator: true,
  readonly: false,
  phone: null,
  attributes: {},
};

export const mockDevices = [
  {
    id: 1,
    name: 'Fleet Alpha',
    uniqueId: 'DEV-001',
    status: 'online',
    lastUpdate: new Date().toISOString(),
    positionId: 101,
  },
  {
    id: 2,
    name: 'Fleet Beta',
    uniqueId: 'DEV-002',
    status: 'offline',
    lastUpdate: new Date().toISOString(),
    positionId: 102,
  },
];

export const mockPositions = [
  {
    id: 101,
    deviceId: 1,
    latitude: 33.5731,
    longitude: -7.5898,
    speed: 42,
    course: 90,
    valid: true,
    fixTime: new Date().toISOString(),
  },
  {
    id: 102,
    deviceId: 2,
    latitude: 34.0209,
    longitude: -6.8416,
    speed: 0,
    course: 0,
    valid: true,
    fixTime: new Date().toISOString(),
  },
];

export const mockGeofences = [
  {
    id: 10,
    name: 'Casablanca Zone',
    area: 'CIRCLE (33.5731 -7.5898, 500)',
    attributes: { color: '#06b6d4' },
  },
];

export const mockServer = {
  id: 1,
  registration: false,
  readonly: false,
  attributes: {},
};
