import {
  configureStore,
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";
export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(
      data.error || "Something went wrong. Please try again.",
    );
    error.status = response.status;
    throw error;
  }
  return data;
}
export const restoreSession = createAsyncThunk("app/session", () =>
  api("/session"),
);
export const login = createAsyncThunk("app/login", (credentials) =>
  api("/login", { method: "POST", body: credentials }),
);
export const loadCatalog = createAsyncThunk("app/catalog", () =>
  api("/catalog"),
);
export const loadSaved = createAsyncThunk("app/saved", () => api("/saved"));
export const toggleSaved = createAsyncThunk(
  "app/toggleSaved",
  async ({ id, saved }, { getState }) => {
    const email = getState().app.user?.email;
    await api(saved ? `/saved/${encodeURIComponent(id)}` : "/saved", {
      method: saved ? "DELETE" : "POST",
      ...(saved ? {} : { body: { listing_id: id } }),
    });
    return { id, saved: !saved, email };
  },
);
const initialState = {
  user: null,
  sessionReady: false,
  catalog: null,
  catalogStatus: "idle",
  catalogError: null,
  savedIds: [],
  savedPending: {},
  notice: null,
};
const slice = createSlice({
  name: "app",
  initialState,
  reducers: {
    signedOut: () => ({ ...initialState, sessionReady: true }),
    clearNotice: (state) => {
      state.notice = null;
    },
    notify: (state, action) => {
      state.notice = action.payload;
    },
  },
  extraReducers: (builder) => {
    for (const thunk of [restoreSession, login])
      builder.addCase(thunk.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.sessionReady = true;
      });
    builder.addCase(restoreSession.rejected, (state) => {
      state.sessionReady = true;
      state.user = null;
    });
    builder.addCase(loadCatalog.pending, (state) => {
      state.catalogStatus = "loading";
      state.catalogError = null;
    });
    builder.addCase(loadCatalog.fulfilled, (state, action) => {
      state.catalogStatus = "ready";
      state.catalog = action.payload;
    });
    builder.addCase(loadCatalog.rejected, (state, action) => {
      state.catalogStatus = "error";
      state.catalogError = action.error.message;
    });
    builder.addCase(loadSaved.fulfilled, (state, action) => {
      state.savedIds = action.payload.results.map((x) => x.listing_id);
    });
    builder.addCase(loadSaved.rejected, (state, action) => {
      state.notice = { type: "error", message: action.error.message };
    });
    builder.addCase(toggleSaved.pending, (state, action) => {
      state.savedPending[action.meta.arg.id] = true;
    });
    builder.addCase(toggleSaved.fulfilled, (state, action) => {
      if (state.user?.email !== action.payload.email) return;
      delete state.savedPending[action.meta.arg.id];
      // Merge only the completed mutation: simultaneous saves must not overwrite each other.
      const { id, saved } = action.payload;
      state.savedIds = saved ? [...new Set([...state.savedIds, id])] : state.savedIds.filter(value => value !== id);
      state.notice = {
        type: "success",
        message: action.meta.arg.saved
          ? "Home removed from your saved list."
          : "Home saved to your account.",
      };
    });
    builder.addCase(toggleSaved.rejected, (state, action) => {
      delete state.savedPending[action.meta.arg.id];
      state.notice = { type: "error", message: action.error.message };
    });
  },
});
export const { signedOut, clearNotice, notify } = slice.actions;
export const store = configureStore({
  reducer: { app: slice.reducer },
  middleware: (getDefault) =>
    getDefault({ serializableCheck: false, immutableCheck: false }),
});
