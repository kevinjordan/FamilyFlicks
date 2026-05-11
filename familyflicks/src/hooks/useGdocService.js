import { useApp } from '../context/AppContext'
import {
  findOrCreateSheet,
  readSuggestions,
  writeSuggestion,
  updateResponse,
  writeRating,
  readSettings,
  writeSettings,
} from '../services/gdocService'

// Binds gdocService functions to the current auth context.
// Steps 8, 9, and Settings use this hook rather than calling the service directly.
export function useGdocService() {
  const { getValidAccessToken, spreadsheetId, saveSpreadsheetId } = useApp()

  return {
    findOrCreateSheet: () =>
      findOrCreateSheet(getValidAccessToken, spreadsheetId, saveSpreadsheetId),

    readSuggestions: () =>
      readSuggestions(getValidAccessToken, spreadsheetId),

    writeSuggestion: record =>
      writeSuggestion(getValidAccessToken, spreadsheetId, record),

    updateResponse: (tmdbId, response) =>
      updateResponse(getValidAccessToken, spreadsheetId, tmdbId, response),

    writeRating: (tmdbId, rating) =>
      writeRating(getValidAccessToken, spreadsheetId, tmdbId, rating),

    readSettings: () =>
      readSettings(getValidAccessToken, spreadsheetId),

    writeSettings: profile =>
      writeSettings(getValidAccessToken, spreadsheetId, profile),
  }
}
