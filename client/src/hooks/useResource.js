import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { useApiErrorHandler } from "./useApiErrorHandler.js";

// Laedt eine API-Ressource. path = null laedt nichts.
export function useResource(path) {
  const handleError = useApiErrorHandler();
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (path === null) return undefined;

    let cancelled = false;
    api(path)
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ data: null, error, loading: false });
        handleError(error);
      });

    return () => {
      cancelled = true;
    };
  }, [path, version, handleError]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const setData = useCallback((update) => setState((previous) => ({ ...previous, data: update(previous.data) })), []);

  return { ...state, notFound: state.error?.status === 404, reload, setData };
}
