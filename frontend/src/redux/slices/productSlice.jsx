import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Fetch all products
export const fetchProducts = createAsyncThunk(
    'products/fetchAll',
    async (params = {}, thunkAPI) => {
        try {
            const queryString = new URLSearchParams(params).toString();
            const response = await api.get(`/products?${queryString}`);
            return response.data;
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to fetch products';
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Fetch single product
export const fetchProductById = createAsyncThunk(
    'products/fetchById',
    async (id, thunkAPI) => {
        try {
            const response = await api.get(`/products/${id}`);
            return response.data;
        } catch (error) {
            const message = error.response?.data?.message || 'Product not found';
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Fetch featured products
export const fetchFeaturedProducts = createAsyncThunk(
    'products/fetchFeatured',
    async (_, thunkAPI) => {
        try {
            const response = await api.get('/products?isFeatured=true&limit=8');
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue('Failed to fetch featured products');
        }
    }
);

const initialState = {
    items: [],
    featuredItems: [],
    currentProduct: null,
    pagination: {
        page: 1,
        totalPages: 1,
        total: 0,
    },
    filters: {
        category: '',
        search: '',
        minPrice: '',
        maxPrice: '',
        sort: '-createdAt',
        halalCertified: false,
    },
    isLoading: false,
    error: null,
};

const productSlice = createSlice({
    name: 'products',
    initialState,
    reducers: {
        setFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        clearFilters: (state) => {
            state.filters = initialState.filters;
        },
        clearCurrentProduct: (state) => {
            state.currentProduct = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch all
            .addCase(fetchProducts.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchProducts.fulfilled, (state, action) => {
                state.isLoading = false;
                state.items = action.payload.products || action.payload.data || [];
                state.pagination = {
                    page: action.payload.page || 1,
                    totalPages: action.payload.totalPages || 1,
                    total: action.payload.total || 0,
                };
            })
            .addCase(fetchProducts.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Fetch by ID
            .addCase(fetchProductById.pending, (state) => {
                state.isLoading = true;
                state.currentProduct = null;
            })
            .addCase(fetchProductById.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentProduct = action.payload.product || action.payload.data || action.payload;
            })
            .addCase(fetchProductById.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Fetch featured
            .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
                state.featuredItems = action.payload.products || action.payload.data || [];
            });
    },
});

export const { setFilters, clearFilters, clearCurrentProduct } = productSlice.actions;
export default productSlice.reducer;
