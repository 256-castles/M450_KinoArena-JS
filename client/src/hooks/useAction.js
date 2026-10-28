import { useCallback, useState } from "react";
import { ApiError } from "../api.js";
import { useApiErrorHandler } from "./useApiErrorHandler.js";

// Fuehrt eine schreibende API-Aktion aus (Formular absenden, Loeschen, …).
// Validierungsfehler (422 mit "errors") landen in errorMessages fuer <ErrorList>,
// alle anderen Fehler behandelt useApiErrorHandler.
export function useAction() {
  const handleError = useApiErrorHandler();
  const [errorMessages, setErrorMessages] = useState([]);
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (action) => {
      setPending(true);
      setErrorMessages([]);
      try {
        return await action();
      } catch (error) {
        if (error instanceof ApiError && error.status === 422 && error.body.messages) {
          setErrorMessages(error.body.messages);
        } else {
          handleError(error);
        }
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [handleError]
  );

  return { run, errorMessages, pending };
}
