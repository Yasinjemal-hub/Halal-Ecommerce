import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../services/authService';

// Get user from localStorage
const user = authService.getCurrentUser();
const token = authService.getToken();

const initialState = {
    user: user || null,
    token: token || null,
    isAuthenticated: !!token,
    isLoading: false,
    error: null,
    message: null,
};

// Register
export const register = createAsyncThunk('auth/register', async (userData, thunkAPI) => {
    try {
        return await authService.register(userData);
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Registration failed';
        return thunkAPI.rejectWithValue(message);
    }
});

// Login
export const login = createAsyncThunk('auth/login', async (credentials, thunkAPI) => {
    try {
        return await authService.login(credentials);
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Login failed';
        return thunkAPI.rejectWithValue(message);
    }
});

// Logout
export const logout = createAsyncThunk('auth/logout', async () => {
    await authService.logout();
});

// Get Profile
export const getProfile = createAsyncThunk('auth/getProfile', async (_, thunkAPI) => {
    try {
        return await authService.getProfile();
    } catch (error) {
        const message = error.response?.data?.message || 'Failed to fetch profile';
        return thunkAPI.rejectWithValue(message);
    }
});

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        clearMessage: (state) => {
            state.message = null;
        },
        setUser: (state, action) => {
            state.user = action.payload;
            state.isAuthenticated = !!action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            // Register
            .addCase(register.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(register.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.message = 'Registration successful!';
            })
            .addCase(register.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Login
            .addCase(login.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.message = 'Welcome back!';
            })
            .addCase(login.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Logout
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
                state.token = null;
                state.isAuthenticated = false;
            })
            // Get Profile
            .addCase(getProfile.fulfilled, (state, action) => {
                state.user = action.payload.user || action.payload;
            });
    },
});

export const { clearError, clearMessage, setUser } = authSlice.actions;
export default authSlice.reducer;
