import { Alert } from 'react-native';
import { handleError } from './errorHandler';

// Mock react-native Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

describe('errorHandler', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Spy on console.error and suppress its output in the test runner
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.error after each test
    consoleErrorSpy.mockRestore();
  });

  it('logs to console and shows an alert with an Error object', () => {
    const error = new Error('Network failed');
    handleError(error, 'network');

    expect(consoleErrorSpy).toHaveBeenCalledWith('[network]', 'Network failed');
    expect(Alert.alert).toHaveBeenCalledWith('Errore Connessione', 'Network failed');
  });

  it('logs to console and shows an alert with a non-Error object/string', () => {
    const error = 'Something went wrong string';
    handleError(error, 'storage');

    expect(consoleErrorSpy).toHaveBeenCalledWith('[storage]', 'Something went wrong string');
    expect(Alert.alert).toHaveBeenCalledWith('Errore Salvataggio dati', 'Something went wrong string');
  });

  it('falls back to a generic message if the error string is falsy', () => {
    const error = new Error(''); // empty message
    handleError(error, 'flight');

    expect(consoleErrorSpy).toHaveBeenCalledWith('[flight]', '');
    expect(Alert.alert).toHaveBeenCalledWith('Errore Dati volo', 'Si è verificato un errore imprevisto.');
  });

  it('logs to console but does NOT show an alert if silent = true', () => {
    const error = new Error('Silent error');
    handleError(error, 'calendar', true);

    expect(consoleErrorSpy).toHaveBeenCalledWith('[calendar]', 'Silent error');
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
